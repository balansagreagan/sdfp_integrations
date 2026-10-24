<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') return;
        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW view_daily_net_cash_on_hand AS
            SELECT 
                d.operating_date,
                COALESCE(r.opening_cash_float, 0.00) AS opening_cash_float,
                COALESCE(s.cash_sales, 0.00) AS total_cash_sales,
                COALESCE(s.digital_sales, 0.00) AS total_digital_sales,
                COALESCE(s.total_sales, 0.00) AS total_gross_revenue,
                COALESCE(e.cash_disbursements, 0.00) AS cash_expenses_paid,
                COALESCE(e.non_cash_expenses, 0.00) AS non_cash_expenses_paid,
                (
                    COALESCE(r.opening_cash_float, 0.00) + 
                    COALESCE(s.cash_sales, 0.00) - 
                    COALESCE(e.cash_disbursements, 0.00)
                ) AS calculated_expected_coh,
                r.actual_cash_counted,
                r.cash_variance,
                COALESCE(r.status, 'open') AS reconciliation_status,
                u_close.name AS drawer_closed_by,
                u_ver.name AS drawer_verified_by
            FROM (
                SELECT paid_on AS operating_date FROM booking_payments
                UNION
                SELECT expense_date AS operating_date FROM expenses
                UNION
                SELECT reconciliation_date AS operating_date FROM daily_cash_reconciliations
            ) d
            LEFT JOIN (
                SELECT 
                    b.paid_on AS transaction_date,
                    SUM(CASE WHEN b.payment_method = 'cash' THEN b.amount ELSE 0 END) AS cash_sales,
                    SUM(CASE WHEN b.payment_method != 'cash' THEN b.amount ELSE 0 END) AS digital_sales,
                    SUM(b.amount) AS total_sales
                FROM booking_payments b
                GROUP BY b.paid_on
            ) s ON d.operating_date = s.transaction_date
            LEFT JOIN (
                SELECT 
                    e.expense_date,
                    SUM(CASE WHEN e.disbursement_method = 'cash_drawer' THEN e.amount ELSE 0 END) AS cash_disbursements,
                    SUM(CASE WHEN e.disbursement_method != 'cash_drawer' THEN e.amount ELSE 0 END) AS non_cash_expenses,
                    SUM(e.amount) AS total_expenses
                FROM expenses e
                GROUP BY e.expense_date
            ) e ON d.operating_date = e.expense_date
            LEFT JOIN daily_cash_reconciliations r ON d.operating_date = r.reconciliation_date
            LEFT JOIN users u_close ON r.closed_by = u_close.id
            LEFT JOIN users u_ver ON r.verified_by = u_ver.id;
SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') return;
        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW view_daily_net_cash_on_hand AS
            SELECT 
                d.operating_date,
                COALESCE(r.opening_cash_float, 0.00) AS opening_cash_float,
                COALESCE(s.cash_sales, 0.00) AS total_cash_sales,
                COALESCE(s.digital_sales, 0.00) AS total_digital_sales,
                COALESCE(s.total_sales, 0.00) AS total_gross_revenue,
                COALESCE(e.cash_disbursements, 0.00) AS cash_expenses_paid,
                COALESCE(e.non_cash_expenses, 0.00) AS non_cash_expenses_paid,
                (
                    COALESCE(r.opening_cash_float, 0.00) + 
                    COALESCE(s.cash_sales, 0.00) - 
                    COALESCE(e.cash_disbursements, 0.00)
                ) AS calculated_expected_coh,
                r.actual_cash_counted,
                r.cash_variance,
                COALESCE(r.status, 'open') AS reconciliation_status,
                u_close.name AS drawer_closed_by,
                u_ver.name AS drawer_verified_by
            FROM (
                SELECT transaction_date AS operating_date FROM bookings WHERE status != 'cancelled'
                UNION
                SELECT expense_date AS operating_date FROM expenses
                UNION
                SELECT reconciliation_date AS operating_date FROM daily_cash_reconciliations
            ) d
            LEFT JOIN (
                SELECT 
                    b.transaction_date,
                    SUM(CASE WHEN b.payment_method = 'cash' THEN b.gross_amount ELSE 0 END) AS cash_sales,
                    SUM(CASE WHEN b.payment_method != 'cash' THEN b.gross_amount ELSE 0 END) AS digital_sales,
                    SUM(b.gross_amount) AS total_sales
                FROM bookings b
                WHERE b.status != 'cancelled'
                GROUP BY b.transaction_date
            ) s ON d.operating_date = s.transaction_date
            LEFT JOIN (
                SELECT 
                    e.expense_date,
                    SUM(CASE WHEN e.disbursement_method = 'cash_drawer' THEN e.amount ELSE 0 END) AS cash_disbursements,
                    SUM(CASE WHEN e.disbursement_method != 'cash_drawer' THEN e.amount ELSE 0 END) AS non_cash_expenses,
                    SUM(e.amount) AS total_expenses
                FROM expenses e
                GROUP BY e.expense_date
            ) e ON d.operating_date = e.expense_date
            LEFT JOIN daily_cash_reconciliations r ON d.operating_date = r.reconciliation_date
            LEFT JOIN users u_close ON r.closed_by = u_close.id
            LEFT JOIN users u_ver ON r.verified_by = u_ver.id;
SQL);
    }
};
