<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\DailyCashReconciliation;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailySalesController extends Controller
{
    /**
     * Display daily sales transactions, expenses, and cash flow reconciliation.
     */
    public function index(Request $request): Response
    {
        $today = now()->toDateString();

        // 1. Incoming Sales Transactions for today
        $salesTransactions = Booking::with(['guest', 'items.ticketType', 'recordedByUser:id,name'])
            ->where('transaction_date', $today)
            ->where('status', '!=', 'cancelled')
            ->orderBy('id', 'desc')
            ->get();

        // 2. Disbursements / Expenses for today
        $expenses = Expense::with(['category', 'vendor', 'recordedByUser:id,name', 'approvedByUser:id,name'])
            ->where('expense_date', $today)
            ->orderBy('id', 'desc')
            ->get();

        // 3. Totals
        $cashSales = (float) $salesTransactions->where('payment_method', 'cash')->sum('gross_amount');
        $digitalSales = (float) $salesTransactions->where('payment_method', '!=', 'cash')->sum('gross_amount');
        $totalGrossSales = $cashSales + $digitalSales;

        $cashExpenses = (float) $expenses->where('disbursement_method', 'cash_drawer')->sum('amount');
        $nonCashExpenses = (float) $expenses->where('disbursement_method', '!=', 'cash_drawer')->sum('amount');
        $totalExpenses = $cashExpenses + $nonCashExpenses;

        $openingFloat = 1000.00; // Standard daily register opening float
        $expectedCoh = round($openingFloat + $cashSales - $cashExpenses, 2);

        // 4. Existing Reconciliation for today
        $reconciliation = DailyCashReconciliation::where('reconciliation_date', $today)->first();

        // 5. Reference tables for modal entry
        $categories = ExpenseCategory::all();
        $vendors = Vendor::where('is_active', true)->get();

        return Inertia::render('daily-sales/index', [
            'salesTransactions' => $salesTransactions,
            'expenses' => $expenses,
            'summary' => [
                'operatingDate' => $today,
                'openingFloat' => $openingFloat,
                'cashSales' => $cashSales,
                'digitalSales' => $digitalSales,
                'totalGrossSales' => $totalGrossSales,
                'cashExpenses' => $cashExpenses,
                'nonCashExpenses' => $nonCashExpenses,
                'totalExpenses' => $totalExpenses,
                'expectedCoh' => $expectedCoh,
            ],
            'reconciliation' => $reconciliation,
            'categories' => $categories,
            'vendors' => $vendors,
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    /**
     * Record an expense / cash-out disbursement voucher.
     */
    public function storeExpense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'voucher_number' => ['required', 'string', 'max:100'],
            'category_id' => ['required', 'exists:expense_categories,id'],
            'vendor_id' => ['nullable', 'exists:vendors,id'],
            'payee_name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:1'],
            'disbursement_method' => ['required', 'string', 'in:cash_drawer,petty_cash,bank_transfer,gcash'],
            'receipt_reference' => ['nullable', 'string', 'max:100'],
        ]);

        Expense::create([
            'voucher_number' => $validated['voucher_number'],
            'expense_date' => now()->toDateString(),
            'category_id' => $validated['category_id'],
            'vendor_id' => $validated['vendor_id'] ?? null,
            'payee_name' => $validated['payee_name'],
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'disbursement_method' => $validated['disbursement_method'],
            'receipt_reference' => $validated['receipt_reference'] ?? null,
            'approved_by' => $request->user()->role === 'admin' ? $request->user()->id : null,
            'recorded_by' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Expense voucher recorded successfully.');
    }

    /**
     * Submit end-of-day cash drawer balancing reconciliation.
     */
    public function reconcile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'actual_cash_counted' => ['required', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ]);

        $today = now()->toDateString();

        $cashSales = (float) Booking::where('transaction_date', $today)
            ->where('payment_method', 'cash')
            ->where('status', '!=', 'cancelled')
            ->sum('gross_amount');

        $digitalSales = (float) Booking::where('transaction_date', $today)
            ->where('payment_method', '!=', 'cash')
            ->where('status', '!=', 'cancelled')
            ->sum('gross_amount');

        $cashExpenses = (float) Expense::where('expense_date', $today)
            ->where('disbursement_method', 'cash_drawer')
            ->sum('amount');

        $openingFloat = 1000.00;
        $expectedCoh = round($openingFloat + $cashSales - $cashExpenses, 2);
        $actualCash = (float) $validated['actual_cash_counted'];
        $variance = round($actualCash - $expectedCoh, 2);

        $status = abs($variance) < 0.01 ? 'verified' : 'discrepancy';

        DailyCashReconciliation::updateOrCreate(
            ['reconciliation_date' => $today],
            [
                'opening_cash_float' => $openingFloat,
                'total_cash_sales' => $cashSales,
                'total_digital_sales' => $digitalSales,
                'total_cash_expenses' => $cashExpenses,
                'expected_cash_on_hand' => $expectedCoh,
                'actual_cash_counted' => $actualCash,
                'cash_variance' => $variance,
                'status' => $status,
                'remarks' => $validated['remarks'] ?? null,
                'closed_by' => $request->user()->id,
                'verified_by' => $request->user()->role === 'admin' ? $request->user()->id : null,
            ]
        );

        return redirect()->back()->with('success', "Daily drawer closed with variance of ₱{$variance}.");
    }
}
