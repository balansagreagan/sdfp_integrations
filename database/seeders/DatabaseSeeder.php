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
            ImportedBookingSeeder::class,
            InventorySeeder::class,
            SoakedInventorySeeder::class,
            ImportedInventorySeeder::class,
            SoakedStaffSeeder::class,
            AnnouncementSeeder::class,
        ]);
    }
}
