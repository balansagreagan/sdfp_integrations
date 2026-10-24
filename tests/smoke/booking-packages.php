<?php
// Isolated integration checks. No application database or guest records are changed.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'session.driver' => 'array']);
Illuminate\Support\Facades\DB::purge('sqlite');
Carbon\Carbon::setTestNow('2026-10-16 12:00:00');
$app->make('session')->start();
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
function fails(callable $operation, string $field): void {
    try { $operation(); } catch (Illuminate\Validation\ValidationException $error) {
        check(isset($error->errors()[$field]), 'Expected validation for '.$field); return;
    }
    throw new RuntimeException('Expected validation rejection for '.$field);
}
foreach (glob(dirname(__DIR__, 2).'/database/migrations/*.php') as $migration) {
    if (str_contains($migration, 'analytical_reporting_views') || str_contains($migration, '2026_10_16_') || str_contains($migration, '2026_10_24_')) continue;
    (require $migration)->up();
}
$user = App\Models\User::create(['name' => 'Booking Tester', 'email' => 'bookings@example.test', 'password' => 'test-only', 'role' => 'admin']);
$legacyGuest = App\Models\Guest::create(['full_name' => 'Existing Guest', 'contact_number' => '09000000000']);
$legacy = App\Models\Booking::create(['booking_reference' => 'LEGACY-BOOKING', 'guest_id' => $legacyGuest->id,
    'transaction_date' => '2026-10-14', 'playtime_date' => '2026-10-14', 'allocated_time_slot_start' => '09:00',
    'allocated_time_slot_end' => '11:00', 'total_pax' => 1, 'subtotal_amount' => 149, 'gross_amount' => 149,
    'payment_method' => 'cash', 'status' => 'completed', 'recorded_by' => $user->id]);
foreach (glob(dirname(__DIR__, 2).'/database/migrations/2026_10_16_*.php') as $migration) (require $migration)->up();
foreach (glob(dirname(__DIR__, 2).'/database/migrations/2026_10_24_*.php') as $migration) (require $migration)->up();
check($legacy->fresh()->amount_paid === '149.00' && $legacy->fresh()->balance_due === '0.00', 'Legacy fully paid bookings must keep their receipts');
check($legacy->fresh()->visit_end_date->toDateString() === '2026-10-14', 'Legacy same-day dates must be preserved');
$controller = app(App\Http\Controllers\BookingController::class);
$packages = app(App\Http\Controllers\PackageController::class);
$request = function (array $data, string $method = 'POST') use ($user) {
    $request = Illuminate\Http\Request::create('/bookings', $method, $data);
    $request->setUserResolver(fn () => $user);
    return $request;
};
$ticket = fn ($code) => App\Models\TicketType::where('code', $code)->firstOrFail();
$honey = ['guest_name' => 'Honey Prospero', 'contact_number' => '0938 923 5912', 'address' => 'Ozamiz City',
    'playtime_date' => '2026-12-05', 'visit_end_date' => '2026-12-06', 'allocated_time_slot_start' => '11:00',
    'ticket_type_id' => $ticket('OVERNIGHT')->id, 'quantity' => 2, 'package_quantity' => 1,
    'payment_amount' => '750.00', 'paid_on' => '2026-10-15', 'payment_method' => 'cash',
    'assign_wristbands' => false, 'status' => 'confirmed', 'remarks' => 'None', 'gross_amount' => 1];
$controller->store($request($honey));
$booking = App\Models\Booking::with(['guest', 'items', 'payments'])->latest('id')->firstOrFail();
check($booking->guest->full_name === 'Honey Prospero' && $booking->guest->address === 'Ozamiz City', 'Guest details must be saved');
check($booking->playtime_date->toDateString() === '2026-12-05' && $booking->visit_end_date->toDateString() === '2026-12-06', 'Visit range must be saved');
check($booking->status === 'confirmed' && $booking->wristbandAllocations()->count() === 0, 'Advance bookings must not automatically check in or assign bands');
check($booking->gross_amount === '3200.00' && $booking->amount_paid === '750.00' && $booking->balance_due === '2450.00', 'Sample must be 3200 total, 750 paid, 2450 balance');
check($booking->payments->first()->paid_on->toDateString() === '2026-10-15', 'Deposit date must be independent from booking and visit dates');
$view = function ($controller) use ($request) { $r = $request([], 'GET'); $r->headers->set('X-Inertia', 'true'); return $controller->index($r)->toResponse($r)->getData(true)['props']; };
check((float)$view(app(App\Http\Controllers\DailySalesController::class))['summary']['totalGrossSales'] === 0.0, 'A past deposit must not inflate today receipts');
$controller->recordPayment($request(['amount' => '200.00', 'paid_on' => '2026-10-16', 'payment_method' => 'gcash']), $booking);
check($booking->fresh()->balance_due === '2250.00', 'Additional payments must reduce the balance');
fails(fn () => $controller->recordPayment($request(['amount' => '2250.01', 'paid_on' => '2026-10-16', 'payment_method' => 'cash']), $booking), 'amount');
$controller->recordPayment($request(['amount' => '2250.00', 'paid_on' => '2026-10-16', 'payment_method' => 'bank_transfer']), $booking);
check($booking->fresh()->balance_due === '0.00' && $booking->fresh()->payment_status === 'paid', 'Full payment must close the balance');
$summary = $view(app(App\Http\Controllers\DailySalesController::class))['summary'];
check((float)$summary['cashSales'] === 0.0 && (float)$summary['digitalSales'] === 2450.0, 'Cash totals must use payment date and actual method, not full booking value');
$base = array_merge($honey, ['guest_name' => 'Rate Test', 'contact_number' => '09000000001', 'playtime_date' => '2026-12-05', 'visit_end_date' => '2026-12-05', 'payment_amount' => 0]);
$create = function ($code, $pax, $bundles = 1) use ($base, $ticket, $controller, $request) {
    $data = array_merge($base, ['ticket_type_id' => $ticket($code)->id, 'quantity' => $pax, 'package_quantity' => $bundles]);
    if (in_array($code, ['OVERNIGHT', '2D-1N'])) $data['visit_end_date'] = '2026-12-06';
    $controller->store($request($data));
    return App\Models\Booking::latest('id')->firstOrFail();
};
foreach ([['REG-2HR', 2, '298.00'], ['ALL-DAY', 2, '398.00'], ['BILAO-5', 5, '2199.00'],
    ['BILAO-10', 10, '4299.00'], ['BILAO-15', 15, '6399.00'], ['CAJUN-4', 4, '1750.00'],
    ['CAJUN-8', 8, '3199.00'], ['STK-4', 4, '1750.00'], ['STK-8', 8, '3199.00'],
    ['WATER-FUN', 2, '1598.00'], ['DAY-TOUR-2-5', 2, '2598.00'], ['DAY-TOUR-6-13', 13, '14300.00'],
    ['DAY-TOUR-14-UP', 14, '13986.00'], ['2D-1N', 2, '4398.00']] as [$code, $pax, $expected]) {
    check($create($code, $pax)->gross_amount === $expected, 'Incorrect price for '.$code);
}
check($create('BILAO-5', 10, 2)->gross_amount === '4398.00', 'Multiple bundles must multiply the bundle price');
fails(fn () => $create('BILAO-5', 6), 'package_quantity');
fails(fn () => $create('DAY-TOUR-14-UP', 13), 'quantity');
fails(fn () => $create('STK-FIESTA', 6), 'ticket_type_id');
fails(fn () => $controller->store($request(array_merge($honey, ['visit_end_date' => '2026-12-04']))), 'visit_end_date');
fails(fn () => $controller->store($request(array_merge($honey, ['payment_amount' => '3200.01']))), 'payment_amount');
$rateData = ['name' => 'Ticket + Bilao', 'category' => 'ticket_bilao', 'variant_name' => '6 persons',
    'pricing_basis' => 'per_booking', 'min_pax' => 1, 'included_pax' => 6, 'price' => '2500.00', 'is_active' => true];
$packages->store($request([...$rateData, 'code' => 'BILAO-6-TEST']));
check($create('BILAO-6-TEST', 6)->gross_amount === '2500.00', 'New variants must become bookable');
fails(fn () => $packages->store($request([...$rateData, 'code' => 'UNPRICED-TEST', 'price' => null])), 'price');
$overnight = $ticket('OVERNIGHT');
$packages->update($request(['name' => $overnight->name, 'category' => 'overnight', 'pricing_basis' => 'per_person', 'min_pax' => 1, 'price' => '1700.00', 'is_active' => true]), $overnight);
check($booking->fresh()->gross_amount === '3200.00' && $booking->items()->first()->unit_price === '1600.00', 'Rate edits must preserve sold prices');
check($create('OVERNIGHT', 2)->gross_amount === '3400.00', 'New bookings must use the updated rate');
$bandData = array_merge($base, ['ticket_type_id' => $ticket('REG-2HR')->id, 'quantity' => 2, 'assign_wristbands' => true, 'wristband_color' => 'BLUE', 'wristband_start_number' => 1000]);
$controller->store($request($bandData));
$count = App\Models\Booking::count();
fails(fn () => $controller->store($request(array_merge($bandData, ['contact_number' => '09999999999', 'wristband_start_number' => 1001]))), 'wristband_start_number');
check(App\Models\Booking::count() === $count && !App\Models\Guest::where('contact_number', '09999999999')->exists(), 'A failed allocation must roll back the entire booking');
echo "Booking/packages: sample reservation, 3200/750/2450 totals, dated payment ledger, balance payments, cash reporting, all poster prices, 13-guest tier, bundle capacity, new variants, historical rates, legacy backfill and transaction rollback passed\n";
