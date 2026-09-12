<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Daily Sales & Wristband Report View
        DB::statement("
            CREATE OR REPLACE VIEW view_daily_sales_and_wristbands AS
            SELECT 
                b.id AS booking_id,
                b.transaction_date,
                b.playtime_date,
                b.booking_reference,
                g.full_name AS guest_name,
                g.contact_number,
                b.total_pax,
                CONCAT(
                    DATE_FORMAT(b.allocated_time_slot_start, '%h:%i %p'),
                    ' - ',
                    DATE_FORMAT(b.allocated_time_slot_end, '%h:%i %p')
                ) AS time_slot,
                COALESCE(
                    (SELECT GROUP_CONCAT(CONCAT(tt.name, ' (x', bi.quantity, ')') SEPARATOR ', ')
                     FROM booking_items bi
                     JOIN ticket_types tt ON bi.ticket_type_id = tt.id
                     WHERE bi.booking_id = b.id),
                    'N/A'
                ) AS pass_breakdown,
                COALESCE(
                    (SELECT GROUP_CONCAT(CONCAT(wb.color, ': ', wb.start_number, '-', wb.end_number) SEPARATOR '; ')
                     FROM wristband_allocations wb
                     WHERE wb.booking_id = b.id),
                    'No Wristband Assigned'
                ) AS wristband_ranges,
                b.gross_amount,
                b.payment_method,
                b.status AS booking_status,
                u.name AS encoded_by,
                b.remarks
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN users u ON b.recorded_by = u.id;
        ");

        // 2. Statement of Expenses View
        DB::statement("
            CREATE OR REPLACE VIEW view_statement_of_expenses AS
            SELECT 
                e.id AS expense_id,
                e.expense_date,
                e.voucher_number,
                ec.name AS category,
                COALESCE(v.name, 'Direct / Non-Vendor') AS vendor,
                e.payee_name,
                e.description AS item_description,
                e.amount,
                e.disbursement_method,
                e.receipt_reference,
                u_rec.name AS encoded_by,
                COALESCE(u_app.name, 'Pending Approval') AS authorized_by,
                e.created_at
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.id
            LEFT JOIN vendors v ON e.vendor_id = v.id
            JOIN users u_rec ON e.recorded_by = u_rec.id
            LEFT JOIN users u_app ON e.approved_by = u_app.id;
        ");

        // 3. Weekly Payroll Register View
        DB::statement("
            CREATE OR REPLACE VIEW view_weekly_payroll_register AS
            SELECT 
                pp.period_code,
                pp.start_date AS period_start,
                pp.end_date AS period_end,
                e.employee_code,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                pos.title AS position,
                pl.daily_rate_snapshot AS daily_rate,
                COALESCE(att.am_present_count, 0) AS total_am_shifts,
                COALESCE(att.pm_present_count, 0) AS total_pm_shifts,
                COALESCE(att.calculated_days_worked, pl.days_worked) AS days_worked,
                COALESCE(att.total_ot_hours, pl.total_ot_hours) AS ot_hours,
                pl.gross_pay,
                pl.deductions_total,
                pl.net_pay,
                pp.status AS payroll_status,
                u_prep.name AS prepared_by,
                u_rev.name AS reviewed_by,
                u_app.name AS approved_by
            FROM payroll_lines pl
            JOIN payroll_periods pp ON pl.payroll_period_id = pp.id
            JOIN employees e ON pl.employee_id = e.id
            JOIN positions pos ON e.position_id = pos.id
            LEFT JOIN (
                SELECT 
                    a.payroll_period_id,
                    a.employee_id,
                    SUM(CASE WHEN a.am_status = 'present' THEN 1 ELSE 0 END) AS am_present_count,
                    SUM(CASE WHEN a.pm_status = 'present' THEN 1 ELSE 0 END) AS pm_present_count,
                    (
                        (SUM(CASE WHEN a.am_status = 'present' THEN 1 ELSE 0 END) * 0.5) +
                        (SUM(CASE WHEN a.pm_status = 'present' THEN 1 ELSE 0 END) * 0.5)
                    ) AS calculated_days_worked,
                    COALESCE(SUM(a.ot_hours), 0.00) AS total_ot_hours
                FROM attendance_shifts a
                GROUP BY a.payroll_period_id, a.employee_id
            ) att ON pl.payroll_period_id = att.payroll_period_id AND pl.employee_id = att.employee_id
            LEFT JOIN users u_prep ON pp.prepared_by = u_prep.id
            LEFT JOIN users u_rev ON pp.reviewed_by = u_rev.id
            LEFT JOIN users u_app ON pp.approved_by = u_app.id;
        ");

        // 4. Daily Net Cash On Hand (COH) View
        DB::statement("
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
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_daily_net_cash_on_hand;");
        DB::statement("DROP VIEW IF EXISTS view_weekly_payroll_register;");
        DB::statement("DROP VIEW IF EXISTS view_statement_of_expenses;");
        DB::statement("DROP VIEW IF EXISTS view_daily_sales_and_wristbands;");
    }
};
