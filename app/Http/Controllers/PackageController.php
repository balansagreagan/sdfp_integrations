<?php

namespace App\Http\Controllers;

use App\Models\AddOnItem;
use App\Models\BookingItem;
use App\Models\TicketType;
use App\Support\ChildPolicy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    public function index(Request $request): Response
    {
        $packages = TicketType::withCount('bookingItems')->whereNotIn('code', TicketType::RETIRED_RATE_CODES)->orderBy('category')->orderBy('price')->get();

        return Inertia::render('packages/index', [
            'packages' => $packages, 'categories' => TicketType::CATEGORIES,
            'addonItems' => AddOnItem::orderBy('name')->get(),
            'childPolicies' => ChildPolicy::definitions(),
            'stats' => ['totalPassesSold' => BookingItem::sum('quantity'),
                'totalRevenueGenerated' => (float) BookingItem::sum('line_total'),
                'activePackagesCount' => $packages->where('is_active', true)->whereNotNull('price')->count()],
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    private function validateRate(Request $request, bool $creating): array
    {
        if ($creating) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }
        if (! $request->has('child_pricing')) {
            $request->merge(['child_pricing' => $request->input('pricing_basis') === 'per_person' && isset(ChildPolicy::definitions()[$request->input('category')]) ? 'age_based' : 'confirm']);
        }

        return $request->validate([
            ...($creating ? ['code' => ['required', 'string', 'max:30', 'unique:ticket_types,code']] : []),
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', Rule::in(array_keys(TicketType::CATEGORIES))],
            'variant_name' => [Rule::requiredIf($request->input('category') === 'ticket_bilao'), 'nullable', 'string', 'max:100'],
            'pricing_basis' => ['required', 'in:per_person,per_booking'],
            'min_pax' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_pax' => ['nullable', 'integer', 'gte:min_pax', 'max:10000'],
            'included_pax' => [Rule::requiredIf($request->input('pricing_basis') === 'per_booking'), 'nullable', 'integer', 'min:1', 'max:10000'],
            'duration_hours' => ['nullable', 'integer', 'min:1', 'max:744'],
            'duration_label' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => [Rule::requiredIf($request->boolean('is_active')), 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'is_active' => ['required', 'boolean'],
            'child_pricing' => ['required', Rule::in(isset(ChildPolicy::definitions()[$request->input('category')]) && $request->input('pricing_basis') === 'per_person' ? ['age_based', 'confirm', 'same', 'custom'] : ['confirm', 'same', 'custom'])],
            'child_price' => [Rule::requiredIf($request->input('child_pricing') === 'custom'), 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        TicketType::create($this->validateRate($request, true));

        return back()->with('success', 'Package rate or variant created. Active rates are now available in bookings.');
    }

    public function update(Request $request, TicketType $package): RedirectResponse
    {
        if (in_array($package->code, TicketType::RETIRED_RATE_CODES, true) && $request->boolean('is_active')) {
            throw ValidationException::withMessages(['is_active' => 'This retired rate cannot be activated. Use regular tickets and the applicable guest policy or brochure offer.']);
        }
        $package->update($this->validateRate($request, false));

        return back()->with('success', 'Package rate updated. Existing booking prices have been kept.');
    }
}
