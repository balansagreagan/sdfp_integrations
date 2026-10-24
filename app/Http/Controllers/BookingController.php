<?php

namespace App\Http\Controllers;

use App\Models\AddOnItem;
use App\Models\Booking;
use App\Models\Guest;
use App\Models\TicketType;
use App\Models\WristbandAllocation;
use App\Support\BrochureProgramme;
use App\Support\ChildPolicy;
use App\Support\Money;
use App\Support\ReceiptLedger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    public function index(Request $request): Response
    {
        $today = now()->toDateString();
        $bookings = Booking::with(['guest', 'items.ticketType', 'addons', 'payments.recordedByUser:id,name', 'wristbandAllocations', 'recordedByUser:id,name'])
            ->orderByDesc('id')->get();
        $todayBookings = $bookings->filter(fn ($booking) => $booking->transaction_date->toDateString() === $today);

        return Inertia::render('bookings/index', [
            'bookings' => $bookings,
            'ticketTypes' => TicketType::where('is_active', true)->whereNotNull('price')->whereNotIn('code', TicketType::RETIRED_RATE_CODES)->orderBy('price')->get(),
            'packageCategories' => TicketType::CATEGORIES,
            'addonItems' => AddOnItem::where('is_active', true)->orderBy('name')->get(),
            'childPolicies' => ChildPolicy::definitions(),
            'brochureOffers' => BrochureProgramme::OFFERS,
            'today' => $today,
            'stats' => [
                'totalBookingsToday' => $todayBookings->count(),
                'totalPaxToday' => $todayBookings->sum('total_pax'),
                'checkedInCount' => $bookings->where('status', 'checked_in')->count(),
                'grossSalesToday' => ReceiptLedger::total($today),
                'outstandingBalance' => $bookings->where('status', '!=', 'cancelled')->sum('balance_due'),
                'pendingPricingCount' => $bookings->where('status', '!=', 'cancelled')->where('pricing_status', 'pending')->count(),
                'nextSuggestedNumber' => (WristbandAllocation::max('end_number') ?? 4854) + 1,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $assignBands = $request->boolean('assign_wristbands');
        $hasPayment = is_numeric($request->input('payment_amount')) && Money::cents($request->input('payment_amount')) > 0;
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:150'],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'playtime_date' => ['required', 'date_format:Y-m-d'],
            'visit_end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:playtime_date'],
            'allocated_time_slot_start' => ['required', 'date_format:H:i'],
            'allocated_time_slot_end' => ['nullable', 'date_format:H:i'],
            'ticket_type_id' => ['required', 'exists:ticket_types,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'package_quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'status' => ['required', 'in:confirmed,checked_in'],
            'payment_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'paid_on' => [Rule::requiredIf($hasPayment), 'nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'payment_method' => [Rule::requiredIf($hasPayment), 'nullable', 'in:cash,gcash,bank_transfer,maya'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
            'assign_wristbands' => ['required', 'boolean'],
            'wristband_color' => [Rule::requiredIf($assignBands), 'nullable', 'string', 'max:30'],
            'wristband_start_number' => [Rule::requiredIf($assignBands), 'nullable', 'integer', 'min:1', 'max:2000000000'],
            'remarks' => ['nullable', 'string', 'max:5000'],
            'adult_count' => ['nullable', 'required_with:child_count', 'integer', 'min:0', 'max:10000'],
            'child_count' => ['nullable', 'required_with:adult_count', 'integer', 'min:0', 'max:10000'],
            'promotion_reference' => ['nullable', 'string', 'max:255'],
            'brochure_offer' => ['nullable', Rule::in(array_keys(BrochureProgramme::OFFERS))],
            'brochure_presented' => ['sometimes', 'boolean'],
            ...$this->addonRules(),
        ]);

        $booking = DB::transaction(function () use ($request, $validated, $assignBands) {
            $ticket = TicketType::lockForUpdate()->findOrFail($validated['ticket_type_id']);
            if (! $ticket->is_active || $ticket->price === null || in_array($ticket->code, TicketType::RETIRED_RATE_CODES, true)) {
                throw ValidationException::withMessages(['ticket_type_id' => 'This rate is not available for booking. Select an active, priced rate.']);
            }
            $pax = (int) $validated['quantity'];
            $programme = app(BrochureProgramme::class);
            $offer = $validated['brochure_offer'] ?? null;
            if ($offer) {
                $programme->validateVisit($validated['playtime_date'], $validated['visit_end_date'], now()->toDateString());
            }
            if ($pax < $ticket->min_pax || ($ticket->max_pax && $pax > $ticket->max_pax)) {
                throw ValidationException::withMessages(['quantity' => 'The selected rate does not apply to this number of guests.']);
            }
            $units = $ticket->pricing_basis === 'per_booking' ? (int) $validated['package_quantity'] : $pax;
            if ($ticket->pricing_basis === 'per_booking' && $pax > $units * $ticket->included_pax) {
                throw ValidationException::withMessages(['package_quantity' => 'Add enough bundles to cover all guests, or choose a larger bundle.']);
            }
            if (in_array($ticket->category, ['overnight', 'two_days_one_night'], true) && $validated['visit_end_date'] <= $validated['playtime_date']) {
                throw ValidationException::withMessages(['visit_end_date' => 'Choose a departure date after arrival for an overnight stay.']);
            }
            if (! empty($validated['allocated_time_slot_end']) && $validated['visit_end_date'] === $validated['playtime_date'] && $validated['allocated_time_slot_end'] <= $validated['allocated_time_slot_start']) {
                throw ValidationException::withMessages(['allocated_time_slot_end' => 'Departure time must be after arrival for a same-day visit.']);
            }
            // Coupon transactions use the printed per-person offer, without stacking child discounts.
            $adults = $offer ? null : ($validated['adult_count'] ?? null);
            $children = $offer ? null : ($validated['child_count'] ?? null);
            if ($adults !== null && (int) $adults + (int) $children !== $pax) {
                throw ValidationException::withMessages(['adult_count' => 'Adult and child counts must add up to the total number of guests.']);
            }
            $childPrice = $validated['child_unit_price'] ?? match ($ticket->child_pricing) {
                'same' => $ticket->price, 'custom' => $ticket->child_price, default => null,
            };
            $policy = $adults !== null && $children > 0 ? ChildPolicy::forTicket($ticket) : null;
            if ($policy) {
                $policy['regular_price'] = $ticket->price;
            }
            $ages = $policy ? $this->childAges($validated, (int) $children) : [];
            $description = $ticket->name.($ticket->variant_name ? ' - '.$ticket->variant_name : '');
            $items = [];
            if ($adults !== null && $ticket->pricing_basis === 'per_person') {
                if ($adults > 0) {
                    $items[] = ['guest_type' => 'adult', 'quantity' => $adults, 'unit_price' => $ticket->price];
                }
                if ($children > 0) {
                    if ($policy) {
                        $childItems = ChildPolicy::items($policy, $ages, $ticket->price, []);
                        array_push($items, ...$childItems);
                        $prices = array_unique(array_column($childItems, 'unit_price'), SORT_REGULAR);
                        $childPrice = count($prices) === 1 ? reset($prices) : null;
                    } else {
                        $items[] = ['guest_type' => 'child', 'quantity' => $children, 'unit_price' => $childPrice];
                    }
                }
            } else {
                $items[] = ['guest_type' => 'all', 'quantity' => $units, 'unit_price' => $ticket->price];
            }
            $items = array_map(fn ($item) => [...$item, 'ticket_type_id' => $ticket->id, 'description' => $description,
                'pricing_basis' => $ticket->pricing_basis,
                'line_total' => $item['unit_price'] === null ? null : Money::decimal(Money::cents($item['unit_price']) * $item['quantity'])], $items);
            $addons = $this->prepareAddons($validated['addons'] ?? []);
            $package = array_sum(array_map(fn ($item) => Money::cents($item['line_total']), $items));
            $subtotal = $package + array_sum(array_map(fn ($item) => Money::cents($item['line_total']), $addons));
            $discount = $offer ? $programme->discount($offer, $ticket, $pax, $items, $addons) : 0;
            $gross = $subtotal - $discount;
            $pending = collect([...$items, ...$addons])->contains(fn ($item) => $item['line_total'] === null);
            $paid = Money::cents($validated['payment_amount'] ?? 0);
            if ($subtotal > 9999999999 || $gross > 9999999999 || $paid > $gross) {
                throw ValidationException::withMessages(['payment_amount' => 'Payment cannot exceed the booking total. The booking total must be within the supported amount.']);
            }
            $contact = preg_replace('/[\s()\-]/', '', $validated['contact_number']);
            $guest = Guest::updateOrCreate(['contact_number' => $contact], [
                'full_name' => $validated['guest_name'], 'address' => $validated['address'], 'email' => $validated['email'] ?? null,
            ]);
            $booking = Booking::create([
                'booking_reference' => 'SDFP'.now()->format('ymd').Str::upper(Str::random(6)),
                'guest_id' => $guest->id, 'transaction_date' => now()->toDateString(),
                'playtime_date' => $validated['playtime_date'], 'visit_end_date' => $validated['visit_end_date'],
                'allocated_time_slot_start' => $validated['allocated_time_slot_start'],
                'allocated_time_slot_end' => $validated['allocated_time_slot_end'] ?? null,
                'total_pax' => $pax, 'subtotal_amount' => Money::decimal($subtotal), 'brochure_offer' => $offer,
                'adult_count' => $adults, 'child_count' => $children,
                'child_ages' => $policy ? $ages : null, 'child_policy' => $policy,
                'child_unit_price' => $adults !== null && $children > 0 && $ticket->pricing_basis === 'per_person' ? $childPrice : null,
                'package_amount' => Money::decimal($package), 'pricing_status' => $pending ? 'pending' : 'complete',
                'food_serving_time' => $validated['food_serving_time'] ?? null,
                'promotion_reference' => $validated['promotion_reference'] ?? null,
                'discount_amount' => Money::decimal($discount), 'gross_amount' => Money::decimal($gross),
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'status' => $validated['status'], 'remarks' => $validated['remarks'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);
            $booking->items()->createMany($items);
            $booking->addons()->createMany($addons);
            if ($offer && $booking->status === 'checked_in') {
                $programme->confirmPresentation($request->boolean('brochure_presented'));
                $booking->update(['brochure_presented_at' => now()]);
            }
            if ($paid > 0) {
                $booking->payments()->create([
                    'amount' => Money::decimal($paid), 'paid_on' => $validated['paid_on'],
                    'payment_method' => $validated['payment_method'], 'reference' => $validated['payment_reference'] ?? null,
                    'recorded_by' => $request->user()->id,
                ]);
            }
            if ($assignBands) {
                $start = (int) $validated['wristband_start_number'];
                $end = $start + $pax - 1;
                if (WristbandAllocation::where('start_number', '<=', $end)->where('end_number', '>=', $start)->exists()) {
                    throw ValidationException::withMessages(['wristband_start_number' => 'This wristband range overlaps an existing allocation.']);
                }
                $booking->wristbandAllocations()->create([
                    'color' => strtoupper($validated['wristband_color']), 'series_code' => 'NEW WB NUMBERS',
                    'start_number' => $start, 'end_number' => $end, 'total_allocated' => $pax,
                    'assigned_by' => $request->user()->id,
                ]);
            }

            return $booking;
        });

        return back()->with('success', "Booking {$booking->booking_reference} saved.".($booking->pricing_status === 'pending' ? ' Some prices are still to confirm; the final balance is pending.' : ' Payment and balance have been recorded.'));
    }

    public function recordPayment(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:99999999.99'],
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'payment_method' => ['required', 'in:cash,gcash,bank_transfer,maya'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);
        DB::transaction(function () use ($request, $booking, $validated) {
            $locked = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($locked->status === 'cancelled') {
                throw ValidationException::withMessages(['amount' => 'Payments cannot be added to a cancelled booking.']);
            }
            if (Money::cents($validated['amount']) > Money::cents($locked->known_balance_due)) {
                throw ValidationException::withMessages(['amount' => 'Payment cannot exceed the remaining confirmed charges. Confirm missing prices before collecting more.']);
            }
            $locked->payments()->create([...$validated, 'recorded_by' => $request->user()->id]);
        });

        return back()->with('success', 'Payment recorded. The booking balance has been updated.');
    }

    public function updateStatus(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', 'in:confirmed,checked_in,completed,cancelled,weather_hold']]);
        DB::transaction(function () use ($booking, $validated, $request) {
            $locked = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($locked->brochure_offer && ! $locked->brochure_presented_at && in_array($validated['status'], ['checked_in', 'completed'], true)) {
                app(BrochureProgramme::class)->confirmPresentation($request->boolean('brochure_presented'));
                $locked->brochure_presented_at = now();
            }
            $locked->status = $validated['status'];
            $locked->save();
        });

        return back()->with('success', "Booking {$booking->booking_reference} status updated.");
    }

    private function addonRules(): array
    {
        return [
            'child_unit_price' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'child_ages' => ['sometimes', 'array', 'max:10000'],
            'child_ages.*' => ['nullable', 'integer', 'between:0,17'],
            'food_serving_time' => ['nullable', 'date_format:H:i'],
            'addons' => ['sometimes', 'array', 'max:50'],
            'addons.*.addon_item_id' => ['nullable', 'integer', 'exists:add_on_items,id'],
            'addons.*.name' => ['required', 'string', 'max:150'],
            'addons.*.quantity' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:10000'],
            'addons.*.unit' => ['required', 'string', 'max:30'],
            'addons.*.unit_price' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'addons.*.is_included' => ['required', 'boolean'],
        ];
    }

    private function childAges(array $validated, int $count): array
    {
        $ages = $validated['child_ages'] ?? array_fill(0, $count, null);
        if (count($ages) !== $count) {
            throw ValidationException::withMessages(['child_ages' => 'Enter one age (or leave it to confirm) for each child.']);
        }

        return array_map(fn ($age) => $age === null || $age === '' ? null : (int) $age, array_values($ages));
    }

    private function prepareAddons(array $rows, ?Booking $booking = null): array
    {
        $catalog = AddOnItem::whereIn('id', array_filter(array_column($rows, 'addon_item_id')))->get()->keyBy('id');

        return array_map(function ($row, $index) use ($catalog, $booking) {
            $item = empty($row['addon_item_id']) ? null : $catalog->get($row['addon_item_id']);
            if ($item && ! $item->is_active && ! ($booking && $booking->addons()->where('addon_item_id', $item->id)->exists())) {
                throw ValidationException::withMessages(["addons.$index.addon_item_id" => 'This add-on is no longer available.']);
            }
            $price = $row['is_included'] ? '0.00' : ($row['unit_price'] ?? null);
            $total = $price === null ? null : Money::decimal(intdiv(Money::cents($price) * Money::cents($row['quantity']) + 50, 100));

            return ['addon_item_id' => $item?->id, 'name' => $item?->name ?? $row['name'], 'quantity' => $row['quantity'],
                'unit' => $row['unit'], 'unit_price' => $price, 'line_total' => $total, 'is_included' => $row['is_included'], 'brochure_scope' => $item?->brochure_scope ?? 'other'];
        }, $rows, array_keys($rows));
    }

    public function updateAddons(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([...$this->addonRules(), 'addons' => ['present', 'array', 'max:50']]);
        DB::transaction(function () use ($validated, $booking) {
            $locked = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($locked->status === 'cancelled') {
                throw ValidationException::withMessages(['addons' => 'A cancelled booking cannot be changed.']);
            }
            $addons = $this->prepareAddons($validated['addons'] ?? [], $locked);
            $child = $locked->items()->where('guest_type', 'child')->first();
            if ($child && $locked->child_policy) {
                $ages = $this->childAges(['child_ages' => $validated['child_ages'] ?? $locked->child_ages ?? []], $locked->child_count);
                $policy = $locked->child_policy;
                $childItems = ChildPolicy::items($policy, $ages, $policy['regular_price'], [
                    'ticket_type_id' => $child->ticket_type_id, 'description' => $child->description, 'pricing_basis' => 'per_person',
                ]);
                foreach ($childItems as &$item) {
                    $item['line_total'] = $item['unit_price'] === null ? null : Money::decimal(Money::cents($item['unit_price']) * $item['quantity']);
                }
                unset($item);
                $locked->items()->where('guest_type', 'child')->delete();
                $locked->items()->createMany($childItems);
                $prices = array_unique(array_column($childItems, 'unit_price'), SORT_REGULAR);
                $locked->child_unit_price = count($prices) === 1 ? reset($prices) : null;
                $locked->child_ages = $ages;
            } elseif ($child && array_key_exists('child_unit_price', $validated)) {
                $price = $validated['child_unit_price'] ?? null;
                $child->update(['unit_price' => $price, 'line_total' => $price === null ? null : Money::decimal(Money::cents($price) * $child->quantity)]);
                $locked->child_unit_price = $price;
            }
            $items = $locked->items()->get();
            $package = $items->isEmpty() ? Money::cents($locked->package_amount ?? $locked->subtotal_amount) : $items->sum(fn ($item) => Money::cents($item->line_total));
            $subtotal = $package + array_sum(array_map(fn ($row) => Money::cents($row['line_total']), $addons));
            $discount = Money::cents($locked->discount_amount);
            if ($locked->brochure_offer) {
                $discount = app(BrochureProgramme::class)->discount($locked->brochure_offer, $items->first()->ticketType, $locked->total_pax, $items->toArray(), $addons);
            }
            $gross = $subtotal - $discount;
            if ($subtotal > 9999999999 || $gross < Money::cents($locked->amount_paid) || $gross < 0 || $gross > 9999999999) {
                throw ValidationException::withMessages(['addons' => 'The updated charges must cover payments already recorded and stay within the supported total.']);
            }
            $pending = $items->contains(fn ($item) => $item->line_total === null) || collect($addons)->contains(fn ($row) => $row['line_total'] === null);
            $locked->fill(['package_amount' => Money::decimal($package), 'subtotal_amount' => Money::decimal($subtotal),
                'gross_amount' => Money::decimal($gross), 'discount_amount' => Money::decimal($discount), 'pricing_status' => $pending ? 'pending' : 'complete',
                'food_serving_time' => array_key_exists('food_serving_time', $validated) ? $validated['food_serving_time'] : $locked->food_serving_time])->save();
            $locked->addons()->delete();
            $locked->addons()->createMany($addons);
        });

        return back()->with('success', 'Guest pricing and food add-ons updated. The booking balance has been recalculated.');
    }
}
