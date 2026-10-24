<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/** Example transactions for a disposable development database only. */
class DemoTransactionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            BookingAndWristbandSeeder::class,
            ExpenseSeeder::class,
            DailyCashReconciliationSeeder::class,
        ]);
    }
}
