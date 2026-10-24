<?php

// Creates and removes its own isolated MySQL database. Never migrates the configured app database.
use App\Models\Brochure;
use App\Models\Guest;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
    $guest = Guest::create(['full_name' => 'Isolated brochure test', 'contact_number' => 'MYSQL-TEST']);
    Brochure::create(['card_number' => 'MYSQL-TEST-001', 'guest_id' => $guest->id, 'purchased_on' => '2026-10-24', 'expires_on' => Brochure::EXPIRY, 'source' => 'sold', 'price' => Brochure::PRICE, 'amount_paid' => Brochure::PRICE, 'payment_method' => 'cash']);
    $audit = DB::table('view_daily_net_cash_on_hand')->where('operating_date', '2026-10-24')->first();
    if (! $audit || (float) $audit->total_cash_sales !== 499.0 || (float) $audit->total_gross_revenue !== 499.0) {
        throw new RuntimeException('MySQL audit omitted the brochure sale.');
    }
    if (Artisan::call('migrate:rollback', ['--step' => 2, '--force' => true]) !== 0) {
        throw new RuntimeException(Artisan::output());
    }
    if (Schema::hasTable('brochures')) {
        throw new RuntimeException('Brochure migration rollback failed.');
    }
    echo "Isolated MySQL: all migrations, repeated default seed, brochure receipt audit and rollback passed.\n";
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
