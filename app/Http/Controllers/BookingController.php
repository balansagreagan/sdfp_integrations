<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Guest;
use App\Models\TicketType;
use App\Models\WristbandAllocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * Display a listing of bookings, guest registry, and wristbands.
     */
    public function index(Request $request): Response
    {
        $today = now()->toDateString();

        $bookings = Booking::with(['guest', 'items.ticketType', 'wristbandAllocations', 'recordedByUser:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        $ticketTypes = TicketType::where('is_active', true)->get();

        // Calculate metrics
        $todayBookings = $bookings->where('transaction_date', $today);
        $totalBookingsToday = $todayBookings->count();
        $totalPaxToday = $todayBookings->sum('total_pax');
        $checkedInCount = $todayBookings->where('status', 'checked_in')->count();
        $grossSalesToday = (float) $todayBookings->where('status', '!=', 'cancelled')->sum('gross_amount');

        // Get latest wristband number to suggest next series
        $latestAllocation = WristbandAllocation::orderBy('id', 'desc')->first();
        $nextSuggestedNumber = $latestAllocation ? ($latestAllocation->end_number + 1) : 4855;

        return Inertia::render('bookings/index', [
            'bookings' => $bookings,
            'ticketTypes' => $ticketTypes,
            'stats' => [
                'totalBookingsToday' => $totalBookingsToday,
                'totalPaxToday' => $totalPaxToday,
                'checkedInCount' => $checkedInCount,
                'grossSalesToday' => $grossSalesToday,
                'nextSuggestedNumber' => $nextSuggestedNumber,
            ],
        ]);
    }

    /**
     * Store a newly created desk booking and allocate wristbands.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:150'],
            'contact_number' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'playtime_date' => ['required', 'date'],
            'allocated_time_slot_start' => ['required', 'string'],
            'allocated_time_slot_end' => ['required', 'string'],
            'ticket_type_id' => ['required', 'exists:ticket_types,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'string', 'in:cash,gcash,bank_transfer,maya'],
            'wristband_color' => ['required', 'string', 'max:30'],
            'wristband_start_number' => ['required', 'integer', 'min:1'],
            'remarks' => ['nullable', 'string'],
        ]);

        $ticket = TicketType::findOrFail($validated['ticket_type_id']);
        $totalPax = $validated['quantity'];
        $grossAmount = $ticket->price * $totalPax;

        // Guest lookup or creation
        $guest = Guest::firstOrCreate(
            ['contact_number' => $validated['contact_number']],
            [
                'full_name' => $validated['guest_name'],
                'email' => $validated['email'] ?? null,
            ]
        );

        // Generate Reference code
        $lastBooking = Booking::orderBy('id', 'desc')->first();
        $nextNum = $lastBooking ? ($lastBooking->id + 1) : 1;
        $bookingRef = 'SDFP' . str_pad((string) $nextNum, 7, '0', STR_PAD_LEFT);

        // Create Booking
        $booking = Booking::create([
            'booking_reference' => $bookingRef,
            'guest_id' => $guest->id,
            'transaction_date' => now()->toDateString(),
            'playtime_date' => $validated['playtime_date'],
            'allocated_time_slot_start' => $validated['allocated_time_slot_start'],
            'allocated_time_slot_end' => $validated['allocated_time_slot_end'],
            'total_pax' => $totalPax,
            'subtotal_amount' => $grossAmount,
            'discount_amount' => 0.00,
            'gross_amount' => $grossAmount,
            'payment_method' => $validated['payment_method'],
            'status' => 'checked_in',
            'remarks' => $validated['remarks'] ?? null,
            'recorded_by' => $request->user()->id,
        ]);

        // Create line item
        BookingItem::create([
            'booking_id' => $booking->id,
            'ticket_type_id' => $ticket->id,
            'quantity' => $totalPax,
            'unit_price' => $ticket->price,
            'line_total' => $grossAmount,
        ]);

        // Allocate wristbands
        $startNum = (int) $validated['wristband_start_number'];
        $endNum = $startNum + $totalPax - 1;

        WristbandAllocation::create([
            'booking_id' => $booking->id,
            'color' => strtoupper($validated['wristband_color']),
            'series_code' => 'NEW WB NUMBERS',
            'start_number' => $startNum,
            'end_number' => $endNum,
            'total_allocated' => $totalPax,
            'remarks' => "{$startNum}-{$endNum} {$validated['wristband_color']} NEW WB NUMBERS",
            'assigned_by' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', "Booking {$bookingRef} created and wristbands {$startNum}-{$endNum} assigned.");
    }

    /**
     * Update booking status (checked_in, completed, cancelled, weather_hold).
     */
    public function updateStatus(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:confirmed,checked_in,completed,cancelled,weather_hold'],
        ]);

        $booking->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', "Booking {$booking->booking_reference} status updated to {$validated['status']}.");
    }
}
