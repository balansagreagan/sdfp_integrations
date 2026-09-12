import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Plus,
    Receipt,
    Scale,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Daily Sales & COH', href: '/daily-sales' },
];

interface DailySalesProps {
    salesTransactions: any[];
    expenses: any[];
    summary: {
        operatingDate: string;
        openingFloat: number;
        cashSales: number;
        digitalSales: number;
        totalGrossSales: number;
        cashExpenses: number;
        nonCashExpenses: number;
        totalExpenses: number;
        expectedCoh: number;
    };
    reconciliation: any;
    categories: any[];
    vendors: any[];
    isAdmin: boolean;
}

export default function DailySalesIndex({
    salesTransactions = [],
    expenses = [],
    summary,
    reconciliation,
    categories = [],
    vendors = [],
    isAdmin = false,
}: DailySalesProps) {
    const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);

    // Expense Form
    const expenseForm = useForm({
        voucher_number: `VCH-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
        category_id: categories[0]?.id ? String(categories[0].id) : '',
        vendor_id: '',
        payee_name: '',
        description: '',
        amount: '',
        disbursement_method: 'cash_drawer',
        receipt_reference: '',
    });

    // Reconciliation Form
    const reconcileForm = useForm({
        actual_cash_counted: String(summary?.expectedCoh || 0),
        remarks: '',
    });

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post(route('daily-sales.expense'), {
            onSuccess: () => {
                setIsExpenseModalOpen(false);
                expenseForm.reset();
            },
        });
    };

    const handleReconcileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        reconcileForm.post(route('daily-sales.reconcile'), {
            onSuccess: () => {
                setIsReconcileModalOpen(false);
            },
        });
    };

    const calculatedVariance = Number(reconcileForm.data.actual_cash_counted) - Number(summary?.expectedCoh || 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Sales & Cash Flow · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Page Title & Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Daily Sales & Cash On Hand
                            </h1>
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                                Cash Flow Ledger
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Reconcile counter drawer cash, track incoming pass payments, and log expense disbursement vouchers.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                        <Button
                            onClick={() => setIsExpenseModalOpen(true)}
                            variant="outline"
                            className="text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 h-10 sm:h-9 justify-center"
                        >
                            <ArrowDownRight className="mr-1.5 size-4 text-rose-500" />
                            <span>Record Expense Voucher</span>
                        </Button>
                        <Button
                            onClick={() => setIsReconcileModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 h-10 sm:h-9 justify-center"
                        >
                            <Scale className="mr-1.5 size-4" />
                            <span>Balance & Close Drawer</span>
                        </Button>
                    </div>
                </div>

                {/* Cash Flow Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Opening Cash Float */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Opening Cash Float
                            </CardTitle>
                            <Wallet className="size-4.5 text-neutral-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(summary?.openingFloat || 1000).toFixed(2)}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Starting till change at 08:00 AM</p>
                        </CardContent>
                    </Card>

                    {/* Total Cash Sales Intake */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/40 to-white dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Cash Sales Intake
                            </CardTitle>
                            <ArrowUpRight className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                +₱{Number(summary?.cashSales || 0).toFixed(2)}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">
                                Digital: ₱{Number(summary?.digitalSales || 0).toFixed(2)} (GCash)
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cash Drawer Expenses Out */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-rose-50/40 to-white dark:border-neutral-800 dark:from-rose-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Drawer Disbursements
                            </CardTitle>
                            <ArrowDownRight className="size-4.5 text-rose-600 dark:text-rose-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                -₱{Number(summary?.cashExpenses || 0).toFixed(2)}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Vouchers paid from register</p>
                        </CardContent>
                    </Card>

                    {/* Expected Net Cash On Hand */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/40 to-white dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Expected Cash On Hand
                            </CardTitle>
                            <Banknote className="size-4.5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                                ₱{Number(summary?.expectedCoh || 0).toFixed(2)}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-neutral-500">Drawer status:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {reconciliation?.status ? reconciliation.status.toUpperCase() : 'OPEN'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Ledger Navigation Tabs */}
                <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto pb-0.5">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                            activeTab === 'sales'
                                ? 'text-sky-600 dark:text-sky-400'
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        Incoming Sales Transactions ({salesTransactions.length})
                        {activeTab === 'sales' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 dark:bg-sky-400 rounded-full" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                            activeTab === 'expenses'
                                ? 'text-sky-600 dark:text-sky-400'
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        Statement of Expenses & Vouchers ({expenses.length})
                        {activeTab === 'expenses' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 dark:bg-sky-400 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Tab 1: Sales Transactions */}
                {activeTab === 'sales' && (
                    <>
                        {/* Mobile Sales Cards (Visible on mobile < md) */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {salesTransactions.length === 0 ? (
                                <Card className="p-8 text-center text-neutral-500">
                                    No sales transactions recorded for today.
                                </Card>
                            ) : (
                                salesTransactions.map((tx) => (
                                    <div
                                        key={`mobile-tx-${tx.id}`}
                                        className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                                                {tx.booking_reference}
                                            </span>
                                            <span
                                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                                    tx.payment_method === 'cash'
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                }`}
                                            >
                                                {tx.payment_method}
                                            </span>
                                        </div>

                                        <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <div>
                                                <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                                                    {tx.guest?.full_name}
                                                </div>
                                                <div className="text-xs text-neutral-400">{tx.guest?.contact_number}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                                                    ₱{Number(tx.gross_amount).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-neutral-500">
                                            <span>{tx.total_pax} Pax &middot; {tx.items?.[0]?.ticket_type?.name || 'Regular Pass'}</span>
                                            <span>Staff: {tx.recorded_by_user?.name || 'Staff'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Sales Table (Hidden on mobile < md) */}
                        <Card className="hidden md:block border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        <tr>
                                            <th className="px-6 py-3.5">Booking Reference</th>
                                            <th className="px-6 py-3.5">Lead Guest</th>
                                            <th className="px-6 py-3.5">Pass Details</th>
                                            <th className="px-6 py-3.5">Payment Method</th>
                                            <th className="px-6 py-3.5">Recorded By</th>
                                            <th className="px-6 py-3.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                        {salesTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                                    No sales transactions recorded for today.
                                                </td>
                                            </tr>
                                        ) : (
                                            salesTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                                                        {tx.booking_reference}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                            {tx.guest?.full_name}
                                                        </div>
                                                        <div className="text-xs text-neutral-400">{tx.guest?.contact_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                                            {tx.total_pax} Pax
                                                        </div>
                                                        <div className="text-xs text-neutral-500">
                                                            {tx.items?.[0]?.ticket_type?.name || 'Regular Pass'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                                                tx.payment_method === 'cash'
                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                            }`}
                                                        >
                                                            {tx.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-neutral-500">
                                                        {tx.recorded_by_user?.name || 'Staff'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-neutral-900 dark:text-neutral-100">
                                                        ₱{Number(tx.gross_amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}

                {/* Tab 2: Expenses & Disbursements */}
                {activeTab === 'expenses' && (
                    <>
                        {/* Mobile Expense Cards (Visible on mobile < md) */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {expenses.length === 0 ? (
                                <Card className="p-8 text-center text-neutral-500">
                                    No expense disbursements recorded for today.
                                </Card>
                            ) : (
                                expenses.map((exp) => (
                                    <div
                                        key={`mobile-exp-${exp.id}`}
                                        className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                                                {exp.voucher_number}
                                            </span>
                                            <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                                                -₱{Number(exp.amount).toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="text-xs text-neutral-600 dark:text-neutral-300">
                                            {exp.description}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-2 text-xs">
                                            <div>
                                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                    {exp.category?.name || 'General'}
                                                </span>
                                                <span className="text-neutral-400 ml-1">&middot; {exp.payee_name}</span>
                                            </div>
                                            <span
                                                className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    exp.disbursement_method === 'cash_drawer'
                                                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                        : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                                                }`}
                                            >
                                                {exp.disbursement_method === 'cash_drawer' ? 'Drawer Out' : exp.disbursement_method}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Expenses Table (Hidden on mobile < md) */}
                        <Card className="hidden md:block border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        <tr>
                                            <th className="px-6 py-3.5">Voucher Reference</th>
                                            <th className="px-6 py-3.5">Category & Vendor</th>
                                            <th className="px-6 py-3.5">Description & Payee</th>
                                            <th className="px-6 py-3.5">Disbursement Mode</th>
                                            <th className="px-6 py-3.5">Encoded & Approved By</th>
                                            <th className="px-6 py-3.5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                        {expenses.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                                    No expense disbursements recorded for today.
                                                </td>
                                            </tr>
                                        ) : (
                                            expenses.map((exp) => (
                                                <tr key={exp.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                            {exp.voucher_number}
                                                        </div>
                                                        <div className="text-xs text-neutral-400 font-mono">
                                                            {exp.receipt_reference || 'No Receipt Ref'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                                            {exp.category?.name || 'General'}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">{exp.vendor?.name || 'Direct Payee'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-neutral-800 dark:text-neutral-200">
                                                            {exp.description}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">Payee: {exp.payee_name}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                                exp.disbursement_method === 'cash_drawer'
                                                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                                    : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                                                            }`}
                                                        >
                                                            {exp.disbursement_method === 'cash_drawer'
                                                                ? 'Cash Drawer Out'
                                                                : exp.disbursement_method}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-neutral-500">
                                                        <div>Encoded: {exp.recorded_by_user?.name || 'Staff'}</div>
                                                        <div className="text-emerald-600">
                                                            Auth: {exp.approved_by_user?.name || 'Approved'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                                                        -₱{Number(exp.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Record Expense Modal */}
            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Record Cash Disbursement Voucher</DialogTitle>
                        <DialogDescription>
                            Log expenses paid from the ticketing cash drawer (PLDT, gasoline, water, supplies).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExpenseSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="voucher_number">Voucher # / Reference</Label>
                                <Input
                                    id="voucher_number"
                                    required
                                    value={expenseForm.data.voucher_number}
                                    onChange={(e) => expenseForm.setData('voucher_number', e.target.value)}
                                    placeholder="Johanna Montealto Voucher"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="category_id">Expense Category</Label>
                                <select
                                    id="category_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={expenseForm.data.category_id}
                                    onChange={(e) => expenseForm.setData('category_id', e.target.value)}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="vendor_id">Vendor (Optional)</Label>
                                <select
                                    id="vendor_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={expenseForm.data.vendor_id}
                                    onChange={(e) => expenseForm.setData('vendor_id', e.target.value)}
                                >
                                    <option value="">Direct / Non-Vendor</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="payee_name">Payee / Recipient Name</Label>
                                <Input
                                    id="payee_name"
                                    required
                                    value={expenseForm.data.payee_name}
                                    onChange={(e) => expenseForm.setData('payee_name', e.target.value)}
                                    placeholder="e.g. Aquastar, Shell, Johanna"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description">Item / Expense Description</Label>
                            <Input
                                id="description"
                                required
                                value={expenseForm.data.description}
                                onChange={(e) => expenseForm.setData('description', e.target.value)}
                                placeholder="Purified water bottle refills for staff and water station"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="amount">Amount (₱)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    required
                                    value={expenseForm.data.amount}
                                    onChange={(e) => expenseForm.setData('amount', e.target.value)}
                                    placeholder="350.00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="disbursement_method">Disbursement Mode</Label>
                                <select
                                    id="disbursement_method"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={expenseForm.data.disbursement_method}
                                    onChange={(e) => expenseForm.setData('disbursement_method', e.target.value)}
                                >
                                    <option value="cash_drawer">Cash Drawer Out (COH Deduction)</option>
                                    <option value="petty_cash">Petty Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="gcash">GCash</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-11" onClick={() => setIsExpenseModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={expenseForm.processing} className="bg-sky-600 hover:bg-sky-500 text-white w-full sm:w-auto h-11">
                                {expenseForm.processing ? 'Saving...' : 'Record Voucher'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* End of Day Reconciliation Modal */}
            <Dialog open={isReconcileModalOpen} onOpenChange={setIsReconcileModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">End-of-Day Cash Drawer Balancing</DialogTitle>
                        <DialogDescription>
                            Count the physical cash in the till and verify against system expected balance.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReconcileSubmit} className="space-y-4 py-2">
                        <div className="rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span>Opening Cash Float:</span>
                                <span className="font-semibold">₱{Number(summary?.openingFloat || 1000).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600">
                                <span>+ Total Cash Sales:</span>
                                <span className="font-semibold">+₱{Number(summary?.cashSales || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600">
                                <span>- Cash Disbursements Out:</span>
                                <span className="font-semibold">-₱{Number(summary?.cashExpenses || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                <span>Expected Cash In Till:</span>
                                <span className="text-sky-600">₱{Number(summary?.expectedCoh || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="actual_cash_counted">Actual Physical Cash Counted (₱)</Label>
                            <Input
                                id="actual_cash_counted"
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                required
                                value={reconcileForm.data.actual_cash_counted}
                                onChange={(e) => reconcileForm.setData('actual_cash_counted', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs px-1">
                            <span>Calculated Cash Variance:</span>
                            <span
                                className={`font-mono font-bold ${
                                    Math.abs(calculatedVariance) < 0.01
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                }`}
                            >
                                {calculatedVariance >= 0 ? `+₱${calculatedVariance.toFixed(2)}` : `-₱${Math.abs(calculatedVariance).toFixed(2)}`}
                                {Math.abs(calculatedVariance) < 0.01 && ' (Balanced 0.00)'}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="reconcile_remarks">Closing Remarks / Audit Notes</Label>
                            <Input
                                id="reconcile_remarks"
                                value={reconcileForm.data.remarks}
                                onChange={(e) => reconcileForm.setData('remarks', e.target.value)}
                                placeholder="All drawer cash tallied and ready for safe deposit."
                            />
                        </div>

                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-11" onClick={() => setIsReconcileModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={reconcileForm.processing} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto h-11">
                                {reconcileForm.processing ? 'Closing...' : 'Submit & Close Drawer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
