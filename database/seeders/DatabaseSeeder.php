<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            PositionAndEmployeeSeeder::class,
            TicketTypeSeeder::class,
            VendorAndExpenseCategorySeeder::class,
            BookingAndWristbandSeeder::class,
            ExpenseSeeder::class,
            PayrollSeeder::class,
            DailyCashReconciliationSeeder::class,
            InventorySeeder::class,
            AnnouncementSeeder::class,
        ]);
    }
}
