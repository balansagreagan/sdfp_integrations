<?php
require __DIR__.'/child-policy.php';
// The old child ticket must be excluded from all new sales, even if reactivated directly.
$oldTicket = App\Models\TicketType::firstOrCreate(['code' => 'KIDDIE-2HR'], ['name' => 'Kiddie Pass (2 Hours)', 'category' => 'admission', 'price' => 99, 'duration_hours' => 2, 'pricing_basis' => 'per_person', 'min_pax' => 1, 'is_active' => true]);
$migration = require dirname(__DIR__, 2).'/database/migrations/2026_10_16_000005_retire_separate_kiddie_ticket_rate.php';
$migration->up();
$oldTicket->refresh();
check(!$oldTicket->is_active, 'The separate99 kiddie rate must be retired');
check(!collect($view($controller)['ticketTypes'])->contains(fn ($row) => $row['code'] === 'KIDDIE-2HR'), 'Booking choices must exclude the retired child ticket');
check(!collect($view($packages)['packages'])->contains(fn ($row) => $row['code'] === 'KIDDIE-2HR'), 'The current catalog must not offer the retired child ticket');
$legacyKiddie = App\Models\Booking::create(['booking_reference' => 'HISTORICAL-KIDDIE', 'guest_id' => $legacyGuest->id,
    'transaction_date' => '2026-09-06', 'playtime_date' => '2026-09-06', 'visit_end_date' => '2026-09-06',
    'allocated_time_slot_start' => '09:00', 'total_pax' => 2, 'subtotal_amount' => 198, 'package_amount' => 198,
    'gross_amount' => 198, 'payment_method' => 'cash', 'status' => 'completed', 'recorded_by' => $user->id]);
$legacyKiddie->items()->create(['ticket_type_id' => $oldTicket->id, 'description' => 'Historical Kiddie Pass', 'pricing_basis' => 'per_person', 'quantity' => 2, 'unit_price' => 99, 'line_total' => 198]);
$migration->down();
fails(fn () => $controller->store($request([...$base, 'ticket_type_id' => $oldTicket->id])), 'ticket_type_id');
fails(fn () => $packages->update($request(['is_active' => true], 'PUT'), $oldTicket), 'is_active');
$migration->up();
check($legacyKiddie->fresh()->gross_amount === '198.00' && $legacyKiddie->items()->first()->unit_price === '99.00', 'Retirement must preserve old sold totals');
$ticket('REG-2HR')->update(['child_pricing' => 'age_based']);
$example = $policyCreate('REG-2HR', [3], 2);
check($example->total_pax === 3 && $example->gross_amount === '298.00' && $example->pricing_status === 'complete', 'Screenshot case must total298: two adults149 and a free child age3');
echo "Automatic booking: retired kiddie rate, tamper protection, catalog choices, historical prices and2-adult/1-child total298 passed\n";
