<?php

// Creates and removes its own isolated MySQL database. Never migrates the configured app database.
use App\Models\Guest;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['monitoring.enabled' => false]);
$testDatabase = 'sdfp_brochure_test_'.bin2hex(random_bytes(6));
$mysql = config('database.connections.mysql');
config(['database.connections.brochure_admin' => $mysql]);
$admin = DB::connection('brochure_admin');
$created = false;
try {
    if (! preg_match('/^sdfp_brochure_test_[a-f0-9]{12}$/', $testDatabase)) {
        throw new RuntimeException('Invalid test database name.');
    }
    $admin->statement('CREATE DATABASE `'.$testDatabase.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created = true;
    config(['database.connections.brochure_test' => [...$mysql, 'database' => $testDatabase], 'database.default' => 'brochure_test']);
    if (DB::connection()->getDatabaseName() !== $testDatabase) {
        throw new RuntimeException('Test database isolation failed.');
    }
    if (Artisan::call('migrate', ['--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    if (Artisan::call('db:seed', ['--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    if (Artisan::call('db:seed', ['--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    if (DB::table('bookings')->count() !== 4 || DB::table('booking_payments')->count() !== 3) {
        throw new RuntimeException('Seeding repeated imported data.');
    }
    $guest = Guest::create(['full_name' => 'Isolated historical test', 'contact_number' => 'MYSQL-TEST']);
    $archiveId = DB::table('brochures')->insertGetId(['card_number' => 'MYSQL-TEST-001', 'guest_id' => $guest->id, 'purchased_on' => '2026-10-24', 'expires_on' => '2028-08-31', 'source' => 'sold', 'price' => '499.00', 'amount_paid' => '499.00', 'payment_method' => 'cash']);
    // Exercise the upgrade from the earlier card-registration implementation.
    if (Artisan::call('migrate:rollback', ['--step' => 1, '--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    $booking = DB::table('bookings')->where('promotion_reference', 'BROCHURE')->first();
    $couponId = DB::table('brochure_coupons')->insertGetId(['brochure_id' => $archiveId, 'type' => 'free_all_day', 'number' => 1, 'state' => 'used', 'booking_id' => $booking->id, 'redeemed_at' => '2026-10-24 09:00:00']);
    DB::table('bookings')->where('id', $booking->id)->update(['brochure_coupon_id' => $couponId]);
    if (Artisan::call('migrate', ['--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    $upgraded = DB::table('bookings')->find($booking->id);
    if ($upgraded->brochure_offer !== 'free_all_day' || ! $upgraded->brochure_presented_at) {
        throw new RuntimeException('Historical offer information was not retained.');
    }
    $paidBooking = DB::table('bookings')->where('gross_amount', '>', 100)->first();
    DB::table('booking_payments')->insert(['booking_id' => $paidBooking->id, 'paid_on' => '2026-10-24', 'amount' => '100.00', 'payment_method' => 'cash']);
    $audit = DB::table('view_daily_net_cash_on_hand')->where('operating_date', '2026-10-24')->first();
    if (! $audit || (float) $audit->total_cash_sales !== 100.0 || (float) $audit->total_gross_revenue !== 100.0) {
        throw new RuntimeException('External brochure fee was included in park receipts.');
    }
    if (DB::table('brochures')->count() !== 1) {
        throw new RuntimeException('Historical records were deleted.');
    }
    echo "Isolated MySQL: fresh setup, repeated seeding, legacy offer upgrade and external-fee exclusion passed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage()."\n");
    $exitCode = 1;
} finally {
    DB::disconnect('brochure_test');
    if ($created && preg_match('/^sdfp_brochure_test_[a-f0-9]{12}$/', $testDatabase)) {
        $admin->statement('DROP DATABASE `'.$testDatabase.'`');
    }
}
exit($exitCode ?? 0);
