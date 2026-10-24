import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Banknote,
    Calendar,
    ChartColumn,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    Receipt,
    Scale,
    Tag,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reports & Audits', href: '/reports' },
];

interface ReportsIndexProps {
    salesReport: any[];
    expenseReport: any[];
    payrollReport: any[];
    cohReport: any[];
}

export default function ReportsIndex({
    salesReport = [],
    expenseReport = [],
    payrollReport = [],
    cohReport = [],
}: ReportsIndexProps) {
    const [activeReport, setActiveReport] = useState<'sales' | 'expenses' | 'payroll' | 'coh'>('sales');

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operational Reports & Audits · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Financial Reports & Operational Audits
                            </h1>
                            <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30">
                                4 SQL Views
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Production analytical reports compiled directly from database reporting views for park owners and auditors.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                            <Printer className="size-4" />
                            <span>Print / Save PDF</span>
                        </Button>
                    </div>
                </div>

                {/* Report Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 print:hidden">
                    {[
                        { id: 'sales', label: '1. Daily Sales & Wristband Report', icon: Tag },
                        { id: 'expenses', label: '2. Statement of Expenses', icon: Receipt },
                        { id: 'payroll', label: '3. Weekly Payroll Register', icon: Wallet },
                        { id: 'coh', label: '4. Daily Net Cash On Hand Audit', icon: Scale },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeReport === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveReport(tab.id as any)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                }`}
                            >
                                <Icon className="size-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* View 1: Daily Sales & Wristband Report */}
                {activeReport === 'sales' && (
                    <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                        <CardHeader className="py-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/80 dark:border-neutral-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base font-bold">view_daily_sales_and_wristbands</CardTitle>
                                    <p className="text-xs text-neutral-500">
                                        Booking charges, guest counts and wristband ranges. Payments are tracked separately; pending prices are flagged.
                                    </p>
                                </div>
                                <span className="text-xs font-mono text-neutral-400">{salesReport.length} Records</span>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Booking Ref</th>
                                        <th className="px-5 py-3">Guest Name & Contact</th>
                                        <th className="px-5 py-3">Pax & Time</th>
                                        <th className="px-5 py-3">Assigned Wristband Range</th>
                                        <th className="px-5 py-3">Mode</th>
                                        <th className="px-5 py-3">Encoded By</th>
                                        <th className="px-5 py-3 text-right">Booking charges</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                    {salesReport.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                            <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">{row.transaction_date}</td>
                                            <td className="px-5 py-3.5 font-mono text-xs font-bold text-sky-600">{row.booking_reference}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">{row.guest_name}</div>
                                                <div className="text-xs text-neutral-400">{row.contact_number}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <div className="font-bold">{row.total_pax} Pax</div>
                                                <div className="text-neutral-400">{row.time_slot}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                                                    {row.wristband_ranges}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 uppercase text-[11px] font-bold text-neutral-500">{row.payment_method}</td>
                                            <td className="px-5 py-3.5 text-xs text-neutral-500">{row.encoded_by}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                                                {row.pricing_status === 'pending' ? <><span className="text-amber-600">To confirm</span><small className="block">₱{Number(row.gross_amount).toFixed(2)} known</small></> : `₱${Number(row.gross_amount).toFixed(2)}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* View 2: Statement of Expenses */}
                {activeReport === 'expenses' && (
                    <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                        <CardHeader className="py-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/80 dark:border-neutral-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base font-bold">view_statement_of_expenses</CardTitle>
                                    <p className="text-xs text-neutral-500">
                                        Itemized expense disbursements categorized by payee, voucher number, and approval audit.
                                    </p>
                                </div>
                                <span className="text-xs font-mono text-neutral-400">{expenseReport.length} Records</span>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-5 py-3">Expense Date</th>
                                        <th className="px-5 py-3">Voucher Reference</th>
                                        <th className="px-5 py-3">Category & Vendor</th>
                                        <th className="px-5 py-3">Description & Payee</th>
                                        <th className="px-5 py-3">Disbursement Mode</th>
                                        <th className="px-5 py-3">Encoded By</th>
                                        <th className="px-5 py-3">Authorized By</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                    {expenseReport.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                            <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">{row.expense_date}</td>
                                            <td className="px-5 py-3.5 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                                                {row.voucher_number}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <div className="font-semibold">{row.category}</div>
                                                <div className="text-neutral-400">{row.vendor}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <div className="text-neutral-800 dark:text-neutral-200">{row.item_description}</div>
                                                <div className="text-neutral-400">Payee: {row.payee_name}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs font-medium">
                                                <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                                    {row.disbursement_method}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-neutral-500">{row.encoded_by}</td>
                                            <td className="px-5 py-3.5 text-xs text-emerald-600 font-medium">{row.authorized_by}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                                                ₱{Number(row.amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* View 3: Weekly Payroll Register */}
                {activeReport === 'payroll' && (
                    <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                        <CardHeader className="py-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/80 dark:border-neutral-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base font-bold">view_weekly_payroll_register</CardTitle>
                                    <p className="text-xs text-neutral-500">
                                        Shift attendance, total days worked, overtime, and net payout per employee.
                                    </p>
                                </div>
                                <span className="text-xs font-mono text-neutral-400">{payrollReport.length} Records</span>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-5 py-3">Cycle Code</th>
                                        <th className="px-5 py-3">Staff Member</th>
                                        <th className="px-5 py-3">Position</th>
                                        <th className="px-5 py-3">Rate</th>
                                        <th className="px-5 py-3">Days Worked</th>
                                        <th className="px-5 py-3">OT Hours</th>
                                        <th className="px-5 py-3">Gross Pay</th>
                                        <th className="px-5 py-3">Deductions</th>
                                        <th className="px-5 py-3 text-right text-emerald-600">Net Pay</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                    {payrollReport.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                            <td className="px-5 py-3.5 font-mono text-xs font-semibold">{row.period_code}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">{row.employee_name}</div>
                                                <div className="text-xs text-neutral-400 font-mono">{row.employee_code}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">{row.position}</td>
                                            <td className="px-5 py-3.5 text-xs font-mono">₱{Number(row.daily_rate).toFixed(2)}</td>
                                            <td className="px-5 py-3.5 text-xs font-bold">{row.days_worked} Days</td>
                                            <td className="px-5 py-3.5 text-xs">{row.ot_hours} hrs</td>
                                            <td className="px-5 py-3.5 font-bold">₱{Number(row.gross_pay).toFixed(2)}</td>
                                            <td className="px-5 py-3.5 text-rose-600 font-semibold">₱{Number(row.deductions_total).toFixed(2)}</td>
                                            <td className="px-5 py-3.5 text-right font-extrabold text-emerald-600">₱{Number(row.net_pay).toFixed(2)}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="uppercase text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                                                    {row.payroll_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* View 4: Daily Net Cash On Hand Audit */}
                {activeReport === 'coh' && (
                    <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                        <CardHeader className="py-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/80 dark:border-neutral-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base font-bold">view_daily_net_cash_on_hand</CardTitle>
                                    <p className="text-xs text-neutral-500">
                                        End-of-day drawer balancing combining opening float, cash sales, disbursements, and physical count.
                                    </p>
                                </div>
                                <span className="text-xs font-mono text-neutral-400">{cohReport.length} Records</span>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-5 py-3">Operating Date</th>
                                        <th className="px-5 py-3">Opening Float</th>
                                        <th className="px-5 py-3">Cash Sales</th>
                                        <th className="px-5 py-3">Digital Sales</th>
                                        <th className="px-5 py-3">Cash Disbursements</th>
                                        <th className="px-5 py-3 font-bold text-sky-600">Expected COH</th>
                                        <th className="px-5 py-3">Actual Counted</th>
                                        <th className="px-5 py-3">Variance</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Closed / Verified</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                    {cohReport.map((row: any, idx: number) => {
                                        const varianceNum = Number(row.cash_variance || 0);

                                        return (
                                            <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                                <td className="px-5 py-3.5 font-semibold text-xs">{row.operating_date}</td>
                                                <td className="px-5 py-3.5 text-xs font-mono">₱{Number(row.opening_cash_float).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 text-xs text-emerald-600 font-semibold">+₱{Number(row.total_cash_sales).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 text-xs text-blue-600">₱{Number(row.total_digital_sales).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 text-xs text-rose-600 font-semibold">-₱{Number(row.cash_expenses_paid).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 font-bold text-sky-600 text-sm">₱{Number(row.calculated_expected_coh).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 font-bold text-neutral-900 dark:text-neutral-100">
                                                    {row.actual_cash_counted ? `₱${Number(row.actual_cash_counted).toFixed(2)}` : 'Pending'}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-xs">
                                                    {row.cash_variance !== null ? (
                                                        <span className={Math.abs(varianceNum) < 0.01 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                                            {varianceNum >= 0 ? `+₱${varianceNum.toFixed(2)}` : `-₱${Math.abs(varianceNum).toFixed(2)}`}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="uppercase text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                                        {row.reconciliation_status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-neutral-500">
                                                    <div>{row.drawer_closed_by || 'Staff'}</div>
                                                    <div className="text-emerald-600">{row.drawer_verified_by || 'Verified'}</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
