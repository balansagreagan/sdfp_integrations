<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

class VendorAndExpenseCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'code' => 'UTIL-COMM',
                'name' => 'Utilities & Communications',
                'description' => 'PLDT internet, electric bills, and facility water',
            ],
            [
                'code' => 'FUEL-TRANS',
                'name' => 'Fuel & Transportation',
                'description' => 'Gasoline for boat transportation, generators, and shuttle',
            ],
            [
                'code' => 'OFFICE-SUPP',
                'name' => 'Office & Desk Supplies',
                'description' => 'Logbooks, receipts, wristbands, and counter materials',
            ],
            [
                'code' => 'WATER-REF',
                'name' => 'Water & Refreshments',
                'description' => 'Purified water bottle refills and employee refreshments',
            ],
            [
                'code' => 'MAINT-PARK',
                'name' => 'Park & Inflatable Maintenance',
                'description' => 'Inflatable patch kits, mooring ropes, anchors, and lifevest repairs',
            ],
            [
                'code' => 'SALARIES',
                'name' => 'Staff Salaries & Advances',
                'description' => 'Disbursements for staff cash advances and weekly wage payouts',
            ],
        ];

        foreach ($categories as $cat) {
            ExpenseCategory::firstOrCreate(
                ['code' => $cat['code']],
                $cat
            );
        }

        $vendors = [
            [
                'name' => 'PLDT Inc.',
                'contact_person' => 'Customer Care',
                'contact_number' => '171',
                'is_active' => true,
            ],
            [
                'name' => 'Aquastar Water Refilling Station',
                'contact_person' => 'Mang Jun',
                'contact_number' => '09281112222',
                'is_active' => true,
            ],
            [
                'name' => 'Shell Caluya Service Station',
                'contact_person' => 'Station Manager',
                'contact_number' => '09173334444',
                'is_active' => true,
            ],
            [
                'name' => 'Sapang Dalaga Hardware & Marine Supply',
                'contact_person' => 'Aling Nena',
                'contact_number' => '09195556666',
                'is_active' => true,
            ],
        ];

        foreach ($vendors as $v) {
            Vendor::firstOrCreate(
                ['name' => $v['name']],
                $v
            );
        }
    }
}
