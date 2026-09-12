<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\DailyCashReconciliation;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Seeder;

class DailyCashReconciliationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $staffUser = User::where('email', 'staff@sdfp.ph')->first() ?? User::first();
        $adminUser = User::where('role', 'admin')->first() ?? User::first();

        $today = now()->toDateString();

        $cashSales = Booking::where('transaction_date', $today)
            ->where('payment_method', 'cash')
            ->where('status', '!=', 'cancelled')
            ->sum('gross_amount');

        $digitalSales = Booking::where('transaction_date', $today)
            ->where('payment_method', '!=', 'cash')
            ->where('status', '!=', 'cancelled')
            ->sum('gross_amount');

        $cashExpenses = Expense::where('expense_date', $today)
            ->where('disbursement_method', 'cash_drawer')
            ->sum('amount');

        $openingFloat = 1000.00;
        $expectedCoh = round($openingFloat + $cashSales - $cashExpenses, 2);
        $actualCash = $expectedCoh; // Balanced drawer
        $variance = round($actualCash - $expectedCoh, 2);

        DailyCashReconciliation::firstOrCreate(
            ['reconciliation_date' => $today],
            [
                'opening_cash_float' => $openingFloat,
                'total_cash_sales' => $cashSales,
                'total_digital_sales' => $digitalSales,
                'total_cash_expenses' => $cashExpenses,
                'expected_cash_on_hand' => $expectedCoh,
                'actual_cash_counted' => $actualCash,
                'cash_variance' => $variance,
                'status' => 'verified',
                'remarks' => 'End-of-day drawer balanced. Physical cash count matches expected register balance.',
                'closed_by' => $staffUser->id,
                'verified_by' => $adminUser->id,
            ]
        );
    }
}
