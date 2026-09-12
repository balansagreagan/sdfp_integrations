<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Guest;
use App\Models\TicketType;
use App\Models\User;
use App\Models\WristbandAllocation;
use Illuminate\Database\Seeder;

class BookingAndWristbandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $staffUser = User::where('email', 'staff@sdfp.ph')->first() ?? User::first();
        $regTicket = TicketType::where('code', 'REG-2HR')->first();
        $allDayTicket = TicketType::where('code', 'ALL-DAY')->first();
        $kiddieTicket = TicketType::where('code', 'KIDDIE-2HR')->first();

        // 1. Booking: Reference SDFP1002390 (Matches prompt physical record example)
        $guest1 = Guest::firstOrCreate(
            ['contact_number' => '09175551234'],
            [
                'full_name' => 'Maria Kristina Santos',
                'email' => 'maria.santos@gmail.com',
                'notes' => 'Family group of 5',
            ]
        );

        $booking1 = Booking::firstOrCreate(
            ['booking_reference' => 'SDFP1002390'],
            [
                'guest_id' => $guest1->id,
                'transaction_date' => now()->toDateString(),
                'playtime_date' => now()->toDateString(),
                'allocated_time_slot_start' => '09:00:00',
                'allocated_time_slot_end' => '11:00:00',
                'total_pax' => 5,
                'subtotal_amount' => 745.00, // 5 x 149
                'discount_amount' => 0.00,
                'gross_amount' => 745.00,
                'payment_method' => 'cash',
                'status' => 'checked_in',
                'remarks' => 'Morning 2-hour session. Paid at counter desk.',
                'recorded_by' => $staffUser->id,
            ]
        );

        if ($regTicket) {
            BookingItem::firstOrCreate(
                [
                    'booking_id' => $booking1->id,
                    'ticket_type_id' => $regTicket->id,
                ],
                [
                    'quantity' => 5,
                    'unit_price' => 149.00,
                    'line_total' => 745.00,
                ]
            );
        }

        WristbandAllocation::firstOrCreate(
            ['booking_id' => $booking1->id],
            [
                'color' => 'BLUE',
                'series_code' => 'NEW WB NUMBERS',
                'start_number' => 4843,
                'end_number' => 4847,
                'total_allocated' => 5,
                'remarks' => '4843-4847 BLUE NEW WB NUMBERS',
                'assigned_by' => $staffUser->id,
            ]
        );

        // 2. Booking: Reference SDFP1002391 (All-Day & Kiddie passes)
        $guest2 = Guest::firstOrCreate(
            ['contact_number' => '09287778899'],
            [
                'full_name' => 'John David Romero',
                'email' => 'jd.romero@yahoo.com',
                'notes' => 'Barkada trip from Oroquieta',
            ]
        );

        $booking2 = Booking::firstOrCreate(
            ['booking_reference' => 'SDFP1002391'],
            [
                'guest_id' => $guest2->id,
                'transaction_date' => now()->toDateString(),
                'playtime_date' => now()->toDateString(),
                'allocated_time_slot_start' => '10:00:00',
                'allocated_time_slot_end' => '18:00:00',
                'total_pax' => 4,
                'subtotal_amount' => 796.00, // 4 x 199
                'discount_amount' => 0.00,
                'gross_amount' => 796.00,
                'payment_method' => 'gcash',
                'status' => 'checked_in',
                'remarks' => 'GCash payment ref: 902817263541. All-Day access.',
                'recorded_by' => $staffUser->id,
            ]
        );

        if ($allDayTicket) {
            BookingItem::firstOrCreate(
                [
                    'booking_id' => $booking2->id,
                    'ticket_type_id' => $allDayTicket->id,
                ],
                [
                    'quantity' => 4,
                    'unit_price' => 199.00,
                    'line_total' => 796.00,
                ]
            );
        }

        WristbandAllocation::firstOrCreate(
            ['booking_id' => $booking2->id],
            [
                'color' => 'ORANGE',
                'series_code' => 'NEW WB NUMBERS',
                'start_number' => 4848,
                'end_number' => 4851,
                'total_allocated' => 4,
                'remarks' => '4848-4851 ORANGE ALL DAY PASS',
                'assigned_by' => $staffUser->id,
            ]
        );

        // 3. Booking: Reference SDFP1002392 (Afternoon 2-hour session)
        $guest3 = Guest::firstOrCreate(
            ['contact_number' => '09193332211'],
            [
                'full_name' => 'Carla Jane Ocampos',
                'email' => null,
                'notes' => 'Walk-in couple with 1 kid',
            ]
        );

        $booking3 = Booking::firstOrCreate(
            ['booking_reference' => 'SDFP1002392'],
            [
                'guest_id' => $guest3->id,
                'transaction_date' => now()->toDateString(),
                'playtime_date' => now()->toDateString(),
                'allocated_time_slot_start' => '14:00:00',
                'allocated_time_slot_end' => '16:00:00',
                'total_pax' => 3,
                'subtotal_amount' => 397.00, // 2 x 149 (298) + 1 x 99 (99) = 397
                'discount_amount' => 0.00,
                'gross_amount' => 397.00,
                'payment_method' => 'cash',
                'status' => 'confirmed',
                'remarks' => '2 Regular Adults + 1 Kiddie Pass',
                'recorded_by' => $staffUser->id,
            ]
        );

        if ($regTicket) {
            BookingItem::firstOrCreate(
                [
                    'booking_id' => $booking3->id,
                    'ticket_type_id' => $regTicket->id,
                ],
                [
                    'quantity' => 2,
                    'unit_price' => 149.00,
                    'line_total' => 298.00,
                ]
            );
        }

        if ($kiddieTicket) {
            BookingItem::firstOrCreate(
                [
                    'booking_id' => $booking3->id,
                    'ticket_type_id' => $kiddieTicket->id,
                ],
                [
                    'quantity' => 1,
                    'unit_price' => 99.00,
                    'line_total' => 99.00,
                ]
            );
        }

        WristbandAllocation::firstOrCreate(
            ['booking_id' => $booking3->id],
            [
                'color' => 'PINK',
                'series_code' => 'NEW WB NUMBERS',
                'start_number' => 4852,
                'end_number' => 4854,
                'total_allocated' => 3,
                'remarks' => '4852-4854 PINK AFTERNOON PASS',
                'assigned_by' => $staffUser->id,
            ]
        );
    }
}
