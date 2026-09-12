<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

class ExpenseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminUser = User::where('role', 'admin')->first() ?? User::first();
        $staffUser = User::where('email', 'staff@sdfp.ph')->first() ?? User::first();

        $catUtil = ExpenseCategory::where('code', 'UTIL-COMM')->first();
        $catFuel = ExpenseCategory::where('code', 'FUEL-TRANS')->first();
        $catWater = ExpenseCategory::where('code', 'WATER-REF')->first();
        $catOffice = ExpenseCategory::where('code', 'OFFICE-SUPP')->first();

        $pldtVendor = Vendor::where('name', 'PLDT Inc.')->first();
        $aquastarVendor = Vendor::where('name', 'Aquastar Water Refilling Station')->first();
        $shellVendor = Vendor::where('name', 'Shell Caluya Service Station')->first();

        $expenses = [
            [
                'voucher_number' => 'Johanna Montealto Voucher - VCH-001',
                'expense_date' => now()->toDateString(),
                'category_id' => $catWater?->id,
                'vendor_id' => $aquastarVendor?->id,
                'payee_name' => 'Aquastar Refilling Station',
                'description' => '10 jugs purified water refills for park staff and water station',
                'amount' => 350.00,
                'disbursement_method' => 'cash_drawer',
                'receipt_reference' => 'OR# 88910',
                'approved_by' => $adminUser?->id,
                'recorded_by' => $staffUser->id,
            ],
            [
                'voucher_number' => 'VCH-2026-002',
                'expense_date' => now()->toDateString(),
                'category_id' => $catFuel?->id,
                'vendor_id' => $shellVendor?->id,
                'payee_name' => 'Shell Caluya Station',
                'description' => 'Gasoline for staff service boat and backup generator for inflatable blowers',
                'amount' => 850.00,
                'disbursement_method' => 'cash_drawer',
                'receipt_reference' => 'SI# 450912',
                'approved_by' => $adminUser?->id,
                'recorded_by' => $staffUser->id,
            ],
            [
                'voucher_number' => 'VCH-2026-003',
                'expense_date' => now()->subDays(2)->toDateString(),
                'category_id' => $catUtil?->id,
                'vendor_id' => $pldtVendor?->id,
                'payee_name' => 'PLDT Home / Enterprise',
                'description' => 'Monthly internet bill for park office ticketing counter and CCTV system',
                'amount' => 1899.00,
                'disbursement_method' => 'bank_transfer',
                'receipt_reference' => 'PLDT-ACC-9827341',
                'approved_by' => $adminUser?->id,
                'recorded_by' => $adminUser?->id,
            ],
            [
                'voucher_number' => 'Johanna Montealto Voucher - VCH-004',
                'expense_date' => now()->toDateString(),
                'category_id' => $catOffice?->id,
                'vendor_id' => null,
                'payee_name' => 'Johanna Montealto',
                'description' => 'Thermal paper rolls, permanent markers, and clipboard for gate marshals',
                'amount' => 280.00,
                'disbursement_method' => 'cash_drawer',
                'receipt_reference' => 'Cash Invoice #334',
                'approved_by' => $adminUser?->id,
                'recorded_by' => $staffUser->id,
            ],
        ];

        foreach ($expenses as $exp) {
            Expense::firstOrCreate(
                ['voucher_number' => $exp['voucher_number']],
                $exp
            );
        }
    }
}
