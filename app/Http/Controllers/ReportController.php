<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Display the 4 analytical reporting views.
     */
    public function index(Request $request): Response
    {
        // 1. Daily Sales & Wristband Report
        $salesReport = DB::table('view_daily_sales_and_wristbands')
            ->leftJoin('bookings as booking', 'booking.booking_reference', '=', 'view_daily_sales_and_wristbands.booking_reference')
            ->select('view_daily_sales_and_wristbands.*', 'booking.pricing_status')
            ->orderBy('view_daily_sales_and_wristbands.transaction_date', 'desc')
            ->limit(50)
            ->get();

        // 2. Statement of Expenses
        $expenseReport = DB::table('view_statement_of_expenses')
            ->orderBy('expense_date', 'desc')
            ->limit(50)
            ->get();

        // 3. Weekly Payroll Register
        $payrollReport = DB::table('view_weekly_payroll_register')
            ->orderBy('period_code', 'desc')
            ->get();

        // 4. Daily Net Cash On Hand Audit
        $cohReport = DB::table('view_daily_net_cash_on_hand')
            ->orderBy('operating_date', 'desc')
            ->limit(30)
            ->get();

        return Inertia::render('reports/index', [
            'salesReport' => $salesReport,
            'expenseReport' => $expenseReport,
            'payrollReport' => $payrollReport,
            'cohReport' => $cohReport,
        ]);
    }
}
