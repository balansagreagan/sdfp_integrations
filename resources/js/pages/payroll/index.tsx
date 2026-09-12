import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, router, useForm } from "@inertiajs/react";
import {
    Banknote,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    LayoutGrid,
    Lock,
    Minus,
    Plus,
    Printer,
    ShieldCheck,
    Table2,
    Unlock,
    Users,
    Wallet,
} from "lucide-react";
import React, { useState } from "react";

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Payroll & Shifts", href: "/payroll" },
];

interface ShiftCell {
    am_status: "present" | "absent" | "day_off" | null;
    pm_status: "present" | "absent" | "day_off" | null;
    ot_hours: number;
}

export interface PeriodItem {
    id: number;
    period_code: string;
    start_date: string;
    end_date: string;
    status: string;
    label: string;
}

interface PayrollIndexProps {
    period: any;
    allPeriods?: PeriodItem[];
    prevWeekDate?: string;
    nextWeekDate?: string;
    currentWeekDate?: string;
    employees: any[];
    shiftsGrid: Record<number, Record<string, ShiftCell>>;
    periodDates: string[];
    stats: {
        totalGross: number;
        totalAdditions: number;
        totalDeductions: number;
        totalNet: number;
        totalOtHours: number;
    };
    isAdmin: boolean;
}

const DAY_ABBR: Record<string, string> = {
    Saturday: "SAT", Sunday: "SUN", Monday: "MON",
    Tuesday: "TUE", Wednesday: "WED", Thursday: "THU", Friday: "FRI",
};

function getDayAbbr(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const name = d.toLocaleDateString("en-US", { weekday: "long" });
    return DAY_ABBR[name] ?? name.slice(0, 3).toUpperCase();
}

function formatDateLabel(dStr: string | null | undefined): string {
    if (!dStr) return "";
    const clean = dStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return clean;
}

function ShiftPill({ status }: { status: string | null | undefined }) {
    const isPresent = status === "present" || status === "timed_out";
    const isAbsent = status === "absent";
    return (
        <td className={`text-center text-[11px] font-bold border border-neutral-200/70 dark:border-neutral-700 w-8 min-w-[28px] py-1.5 transition-colors
            ${isPresent ? "bg-emerald-500 text-white" : isAbsent ? "bg-rose-500 text-white" : "bg-neutral-100/70 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600"}`}>
            {isPresent ? "4" : isAbsent ? "0" : ""}
        </td>
    );
}

export default function PayrollIndex({
    period,
    allPeriods = [],
    prevWeekDate,
    nextWeekDate,
    currentWeekDate,
    employees = [],
    shiftsGrid = {},
    periodDates = [],
    stats,
    isAdmin = false,
}: PayrollIndexProps) {
    const [mobileView, setMobileView] = useState<"cards" | "table">("cards");
    const [selectedLineForDeduction, setSelectedLineForDeduction] = useState<any | null>(null);
    const [selectedLineForAddition, setSelectedLineForAddition] = useState<any | null>(null);
    const deductionForm = useForm({ payroll_line_id: "", employee_id: "", payroll_period_id: period?.id, deduction_type: "cash_advance", description: "", amount: "" });
    const additionForm = useForm({ payroll_line_id: "", employee_id: "", payroll_period_id: period?.id, addition_type: "others", description: "", amount: "" });
    const approveForm = useForm({});

    const handleOpenDeduction = (item: any) => {
        setSelectedLineForDeduction(item);
        deductionForm.setData({
            payroll_line_id: item.id ? String(item.id) : "",
            employee_id: String(item.employee_id || item.id),
            payroll_period_id: period?.id,
            deduction_type: "cash_advance",
            description: "",
            amount: "",
        });
    };
    const handleOpenAddition = (item: any) => {
        setSelectedLineForAddition(item);
        additionForm.setData({
            payroll_line_id: item.id ? String(item.id) : "",
            employee_id: String(item.employee_id || item.id),
            payroll_period_id: period?.id,
            addition_type: "others",
            description: "",
            amount: "",
        });
    };
    const handleDeductionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        deductionForm.post(route("payroll.deduction"), { onSuccess: () => { setSelectedLineForDeduction(null); deductionForm.reset(); } });
    };
    const handleAdditionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        additionForm.post(route("payroll.addition"), { onSuccess: () => { setSelectedLineForAddition(null); additionForm.reset(); } });
    };
    const handleApprove = () => {
        if (!confirm(`Approve payroll period ${period.period_code}? This locks compensation.`)) return;
        approveForm.post(route("payroll.approve", period.id));
    };
    const handleUnapprove = () => {
        if (!confirm(`Unlock payroll period ${period.period_code}? This will re-open it for adjustments.`)) return;
        approveForm.post(route("payroll.unapprove", period.id));
    };

    const linesMap: Record<number, any> = {};
    period?.payroll_lines?.forEach((l: any) => { linesMap[l.employee_id] = l; });

    const grandTotalDays     = Object.values(linesMap).reduce((s, l) => s + Number(l.days_worked ?? 0), 0);
    const grandTotalGross    = Object.values(linesMap).reduce((s, l) => s + Number(l.gross_pay ?? 0), 0);
    const grandTotalAddition = Object.values(linesMap).reduce((s, l) => s + Number(l.additions_total ?? 0), 0);
    const grandTotalDeduct   = Object.values(linesMap).reduce((s, l) => s + Number(l.deductions_total ?? 0), 0);
    const grandTotalNet      = Object.values(linesMap).reduce((s, l) => s + Number(l.net_pay ?? 0), 0);

    const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2 });
    const approved = period?.status === "approved";

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Weekly Payroll & Shift Timesheets · SDFP" />
            <div className="flex flex-col gap-5 p-4 md:p-6 max-w-full mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">Weekly Payroll</h1>
                            <Badge className={approved ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30" : "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30"}>
                                {period?.period_code || "PR-2026-W37"} · {period?.status ? period.status.toUpperCase() : "DRAFT"}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">
                            Cycle: {formatDateLabel(period?.start_date)} to {formatDateLabel(period?.end_date)} · AM/PM tracking per day
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-2 text-xs">
                            <Printer className="size-3.5" /> Print Register
                        </Button>
                        {isAdmin && !approved && (
                            <Button onClick={handleApprove} disabled={approveForm.processing} className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 text-xs">
                                <ShieldCheck className="size-4" /> Approve Payroll
                            </Button>
                        )}
                        {approved && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                    <Lock className="size-3.5" /> <span>Approved by {period?.approved_by_user?.name || "Admin"}</span>
                                </div>
                                {isAdmin && (
                                    <Button onClick={handleUnapprove} disabled={approveForm.processing} variant="outline" size="sm" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 flex items-center gap-1.5">
                                        <Unlock className="size-3.5" /> Unlock to Edit
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Period & Week Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 sm:p-4 shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => prevWeekDate && router.get(route("payroll.index"), { date: prevWeekDate })}
                            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                            title="Previous Week"
                        >
                            <ChevronLeft className="size-3.5" /> Prev Week
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => nextWeekDate && router.get(route("payroll.index"), { date: nextWeekDate })}
                            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
                            title="Next Week"
                        >
                            Next Week <ChevronRight className="size-3.5" />
                        </Button>
                        {currentWeekDate && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.get(route("payroll.index"), { date: currentWeekDate })}
                                className="text-xs h-8 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                            >
                                Jump to Current Week
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-neutral-500">Payroll Cycle:</span>
                            <select
                                value={period?.id ?? ""}
                                onChange={(e) => {
                                    const selId = e.target.value;
                                    if (selId) router.get(route("payroll.index"), { period_id: selId });
                                }}
                                className="text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
                            >
                                {allPeriods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.label} · {p.status.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-700">
                            <Calendar className="size-3.5 text-neutral-400" />
                            <span className="text-[11px] font-medium text-neutral-500">Jump to Date:</span>
                            <input
                                type="date"
                                onChange={(e) => e.target.value && router.get(route("payroll.index"), { date: e.target.value })}
                                className="text-xs bg-transparent border-0 p-0 text-neutral-700 dark:text-neutral-200 focus:outline-hidden font-medium cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                        { label: "Total Gross", value: `P${fmt(stats?.totalGross || 0)}`, sub: "Base + OT pay", icon: Banknote, color: "text-sky-600", from: "from-sky-50/40 dark:from-sky-950/20" },
                        { label: "Additions",   value: `+P${fmt(stats?.totalAdditions || 0)}`, sub: "Allowances / Others", icon: Plus, color: "text-emerald-600", from: "from-emerald-50/40 dark:from-emerald-950/20" },
                        { label: "Deductions",  value: `-P${fmt(stats?.totalDeductions || 0)}`, sub: "Cash advances", icon: Minus, color: "text-rose-600", from: "from-rose-50/40 dark:from-rose-950/20" },
                        { label: "Net Payout",  value: `P${fmt(stats?.totalNet || 0)}`, sub: "Disbursement", icon: Wallet, color: "text-emerald-600", from: "from-emerald-50/40 dark:from-emerald-950/20" },
                        { label: "OT Logged",   value: `${stats?.totalOtHours || 0} hrs`, sub: "Peak weekend", icon: Clock, color: "text-indigo-600", from: "from-indigo-50/40 dark:from-indigo-950/20" },
                    ].map(({ label, value, sub, icon: Icon, color, from }) => (
                        <Card key={label} className={`border-neutral-200/70 bg-gradient-to-br ${from} to-white dark:border-neutral-800 dark:to-neutral-900 shadow-xs`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</CardTitle>
                                <Icon className={`size-4 ${color}`} />
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                                <div className={`text-xl font-bold ${color}`}>{value}</div>
                                <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Payroll Register Table */}
                <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                    <CardHeader className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 py-3 px-4">
                        <div className="text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Sapang Dalaga Floating Playground</p>
                            <p className="text-[10px] text-neutral-400">Caluya, Sapang Dalaga, Misamis Occidental</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-200 mt-0.5">
                                Payroll Coverage ({formatDateLabel(period?.start_date)} to {formatDateLabel(period?.end_date)})
                            </p>
                            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mt-0.5">Weekly Payroll</p>
                        </div>
                    </CardHeader>

                    {/* Mobile View Switcher */}
                    <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-neutral-100/80 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">View Layout:</span>
                        <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-xs">
                            <button
                                type="button"
                                onClick={() => setMobileView("cards")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                    mobileView === "cards"
                                        ? "bg-sky-600 text-white shadow-xs"
                                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                                }`}
                            >
                                <LayoutGrid className="size-3.5" />
                                Cards
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileView("table")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                    mobileView === "table"
                                        ? "bg-sky-600 text-white shadow-xs"
                                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                                }`}
                            >
                                <Table2 className="size-3.5" />
                                Full Table
                            </button>
                        </div>
                    </div>

                    {/* Mobile Card View (Cards Layout) */}
                    {mobileView === "cards" && (
                        <div className="md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
                            {employees.map((emp) => {
                                const line = linesMap[emp.id];
                                const targetItem = line ?? { employee: emp, employee_id: emp.id };
                                const empShifts = shiftsGrid[emp.id] ?? {};
                                return (
                                    <div key={emp.id} className="p-4 flex flex-col gap-3 bg-white dark:bg-neutral-900">
                                        {/* Staff Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-sm uppercase text-neutral-900 dark:text-neutral-100">
                                                    {emp.last_name}, {emp.first_name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                                        {emp.position?.title ?? "STAFF"}
                                                    </Badge>
                                                    <span className="text-xs text-neutral-500 font-mono">
                                                        ₱{Number(emp.daily_rate).toLocaleString()} / day
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-neutral-500 uppercase">Net Pay</div>
                                                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                                    {line ? `₱${fmt(Number(line.net_pay))}` : "₱0.00"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 7-Day AM/PM Mini Strip */}
                                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2 border border-neutral-200/70 dark:border-neutral-700/60">
                                            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex justify-between">
                                                <span>Week Shifts (AM / PM)</span>
                                                <span>{Number(line?.days_worked ?? 0).toFixed(1)} days worked</span>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {periodDates.map((date) => {
                                                    const cell = empShifts[date];
                                                    const dObj = new Date(date + "T00:00:00");
                                                    const dayAbbr = getDayAbbr(date).slice(0, 2);
                                                    const dayNum = dObj.getDate();
                                                    const amPresent = cell?.am_status === "present" || cell?.am_status === "timed_out";
                                                    const amAbsent = cell?.am_status === "absent";
                                                    const pmPresent = cell?.pm_status === "present" || cell?.pm_status === "timed_out";
                                                    const pmAbsent = cell?.pm_status === "absent";

                                                    return (
                                                        <div key={date} className="flex flex-col items-center bg-white dark:bg-neutral-800 rounded p-1 border border-neutral-200/50 dark:border-neutral-700/50">
                                                            <span className="text-[9px] font-bold text-neutral-500">{dayAbbr} {dayNum}</span>
                                                            <div className="flex flex-col gap-0.5 w-full mt-1">
                                                                <div className={`text-[9px] font-bold text-center py-0.5 rounded ${amPresent ? "bg-emerald-500 text-white" : amAbsent ? "bg-rose-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-300"}`}>
                                                                    {amPresent ? "4" : amAbsent ? "0" : "-"}
                                                                </div>
                                                                <div className={`text-[9px] font-bold text-center py-0.5 rounded ${pmPresent ? "bg-emerald-500 text-white" : pmAbsent ? "bg-rose-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-300"}`}>
                                                                    {pmPresent ? "4" : pmAbsent ? "0" : "-"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Breakdown details */}
                                        <div className="grid grid-cols-3 gap-2 text-xs bg-neutral-50/50 dark:bg-neutral-800/30 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                            <div>
                                                <span className="text-[10px] text-neutral-400 block uppercase">Gross</span>
                                                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                                                    {line ? `₱${fmt(Number(line.gross_pay))}` : "₱0"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-neutral-400 block uppercase">Allowances</span>
                                                <span className="font-semibold text-emerald-600">
                                                    {line && Number(line.additions_total) > 0 ? `+₱${fmt(Number(line.additions_total))}` : "₱0"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-neutral-400 block uppercase">Deductions</span>
                                                <span className="font-semibold text-rose-600">
                                                    {line && Number(line.deductions_total) > 0 ? `-₱${fmt(Number(line.deductions_total))}` : "₱0"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Touch-Friendly Action Buttons */}
                                        {!approved && (
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleOpenAddition(targetItem)}
                                                    className="h-10 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 justify-center"
                                                >
                                                    <Plus className="mr-1 size-3.5 text-emerald-600" /> Allowance / Extra
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleOpenDeduction(targetItem)}
                                                    className="h-10 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 justify-center"
                                                >
                                                    <Minus className="mr-1 size-3.5 text-rose-600" /> Cash Adv / Deduct
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Mobile Grand Total Summary Card */}
                            <div className="p-4 bg-yellow-50/70 dark:bg-yellow-950/20 border-t-2 border-yellow-300 dark:border-yellow-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-900 dark:text-yellow-200">
                                        Grand Total ({employees.length} Staff)
                                    </span>
                                    <Badge className="bg-yellow-200/80 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100 font-mono">
                                        {grandTotalDays.toFixed(0)} Days Worked
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                    <div>
                                        <span className="text-neutral-500 block">Total Gross:</span>
                                        <span className="font-bold text-neutral-800 dark:text-neutral-100">₱{fmt(grandTotalGross)}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block">Total Net Payout:</span>
                                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">₱{fmt(grandTotalNet)}</span>
                                    </div>
                                </div>
                                {(grandTotalAddition > 0 || grandTotalDeduct > 0) && (
                                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 border-t border-yellow-200/60 dark:border-yellow-800/40 pt-1.5">
                                        {grandTotalAddition > 0 && <span className="text-emerald-600 font-medium">+₱{fmt(grandTotalAddition)} Allowances</span>}
                                        {grandTotalDeduct > 0 && <span className="text-rose-600 font-medium">-₱{fmt(grandTotalDeduct)} Deductions</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Full Table View */}
                    <div className={`overflow-x-auto ${mobileView === "cards" ? "hidden md:block" : "block"}`}>
                        <div className="md:hidden text-[11px] text-neutral-500 text-center py-2 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40">
                            👉 Swipe horizontally to view full Mon–Sun hours & totals
                        </div>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                                    <th rowSpan={2} className="sticky left-0 bg-neutral-100 dark:bg-neutral-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.06)] border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">LAST NAME</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">FIRST NAME</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">POSITION</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">DAILY<br/>RATE</th>
                                    <th colSpan={periodDates.length * 2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-center font-bold text-neutral-700 dark:text-neutral-200 bg-sky-50 dark:bg-sky-950/30">Hours</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">OT</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">TOTAL<br/>NO. OF<br/>DAYS</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">TOTAL</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-emerald-600 dark:text-emerald-500 whitespace-nowrap">ALLOWANCE<br/>/ OTHERS</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">DEDUCTIONS</th>
                                    <th rowSpan={2} className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 whitespace-nowrap">GRAND<br/>TOTAL</th>
                                    {!approved && <th rowSpan={2} className="print:hidden border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center align-middle font-bold text-neutral-500 whitespace-nowrap">ACTION</th>}
                                </tr>
                                <tr className="bg-sky-50/80 dark:bg-sky-950/20 border-b border-neutral-200 dark:border-neutral-700">
                                    {periodDates.map((date) => {
                                        const dObj = new Date(date + "T00:00:00");
                                        const dayAbbr = getDayAbbr(date);
                                        const dayNum = dObj.getDate();
                                        return (
                                            <React.Fragment key={date}>
                                                <th className="border border-neutral-200 dark:border-neutral-700 px-1 py-1 text-center font-semibold text-neutral-600 dark:text-neutral-300 w-8 min-w-[28px]">
                                                    <div className="text-[10px] font-bold leading-tight">{dayAbbr} {dayNum}</div>
                                                    <div className="text-[9px] text-neutral-400 leading-tight">AM</div>
                                                </th>
                                                <th className="border border-neutral-200 dark:border-neutral-700 px-1 py-1 text-center font-semibold text-neutral-600 dark:text-neutral-300 w-8 min-w-[28px]">
                                                    <div className="text-[10px] font-bold leading-tight">{dayAbbr} {dayNum}</div>
                                                    <div className="text-[9px] text-neutral-400 leading-tight">PM</div>
                                                </th>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Staff section label */}
                                <tr className="bg-sky-100/70 dark:bg-sky-950/30">
                                    <td colSpan={5 + periodDates.length * 2 + (!approved ? 6 : 5)} className="px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 border border-neutral-200 dark:border-neutral-700 uppercase tracking-wider">
                                        <Users className="inline size-3.5 mr-1.5 align-middle" />STAFF
                                    </td>
                                </tr>

                                {/* Employee rows */}
                                {employees.map((emp) => {
                                    const line = linesMap[emp.id];
                                    const targetItem = line ?? { employee: emp, employee_id: emp.id };
                                    const empShifts = shiftsGrid[emp.id] ?? {};
                                    return (
                                        <tr key={emp.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="sticky left-0 bg-white dark:bg-neutral-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.06)] border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 font-semibold text-neutral-800 dark:text-neutral-100 whitespace-nowrap uppercase">{emp.last_name}</td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-neutral-700 dark:text-neutral-200 whitespace-nowrap uppercase">{emp.first_name}</td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap uppercase text-[10px]">{emp.position?.title ?? "STAFF"}</td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-center font-mono font-semibold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">{Number(emp.daily_rate).toLocaleString()}</td>
                                            {periodDates.map((date) => {
                                                const cell = empShifts[date];
                                                return (
                                                    <React.Fragment key={`${emp.id}-${date}`}>
                                                        <ShiftPill status={cell?.am_status} />
                                                        <ShiftPill status={cell?.pm_status} />
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-center font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
                                                {Number(line?.total_ot_hours ?? 0) > 0 ? `+${line.total_ot_hours}h` : "0"}
                                            </td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-center font-bold text-neutral-800 dark:text-neutral-100">
                                                {line ? Number(line.days_worked).toFixed(0) : 0}
                                            </td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-right font-semibold text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
                                                {line ? `P ${fmt(Number(line.gross_pay))}` : "P -"}
                                            </td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-right whitespace-nowrap">
                                                {line && Number(line.additions_total) > 0
                                                    ? <span className="text-emerald-600 font-semibold">+P{fmt(Number(line.additions_total))}</span>
                                                    : <span className="text-neutral-300 dark:text-neutral-600">-</span>}
                                            </td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-right whitespace-nowrap">
                                                {line && Number(line.deductions_total) > 0
                                                    ? <span className="text-rose-600 font-semibold">-P{fmt(Number(line.deductions_total))}</span>
                                                    : <span className="text-neutral-300 dark:text-neutral-600">-</span>}
                                            </td>
                                            <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-right font-extrabold whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                                                {line ? `P ${fmt(Number(line.net_pay))}` : "P -"}
                                            </td>
                                            {!approved && (
                                                <td className="print:hidden border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-center">
                                                    <div className="flex flex-col gap-1 items-center justify-center">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenAddition(targetItem)} className="h-6 w-full text-[10px] px-2 font-medium">
                                                            <Plus className="mr-0.5 size-2.5 text-emerald-500" /> Allow
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenDeduction(targetItem)} className="h-6 w-full text-[10px] px-2 font-medium">
                                                            <Minus className="mr-0.5 size-2.5 text-rose-500" /> Deduct
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}

                                {/* Grand Total Row */}
                                <tr className="bg-neutral-50 dark:bg-neutral-900 border-t-2 border-neutral-300 dark:border-neutral-600 font-bold">
                                    <td colSpan={4 + periodDates.length * 2 + 1} className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                                        Grand Total
                                    </td>
                                    <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-center font-bold text-neutral-800 dark:text-neutral-100">{grandTotalDays.toFixed(0)}</td>
                                    <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-right font-bold text-neutral-800 dark:text-neutral-100 whitespace-nowrap">P {fmt(grandTotalGross)}</td>
                                    <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                                        {grandTotalAddition > 0 ? `+P${fmt(grandTotalAddition)}` : "-"}
                                    </td>
                                    <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-right font-bold text-rose-600 whitespace-nowrap">
                                        {grandTotalDeduct > 0 ? `-P${fmt(grandTotalDeduct)}` : "-"}
                                    </td>
                                    <td className="border border-neutral-200 dark:border-neutral-700 px-2 py-2 text-right font-extrabold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 whitespace-nowrap">
                                        P {fmt(grandTotalNet)}
                                    </td>
                                    {!approved && <td className="print:hidden border border-neutral-200 dark:border-neutral-700" />}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature Footer */}
                    <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 px-6 py-6">
                        <div className="grid grid-cols-3 gap-8 text-xs text-neutral-600 dark:text-neutral-300">
                            {[
                                { role: "Prepared by:", name: period?.prepared_by_user?.name ?? "Anna Jane C. Dela Cerna", title: "Office Staff" },
                                { role: "Reviewed by:", name: period?.reviewed_by_user?.name ?? "", title: "Supervisor" },
                                { role: "Recommending Approval:", name: period?.approved_by_user?.name ?? "Johanna Montealto", title: "Owner", underline: true },
                            ].map(({ role, name, title, underline }) => (
                                <div key={role}>
                                    <p className="font-medium mb-8 text-neutral-500">{role}</p>
                                    <div className="border-t border-neutral-400 dark:border-neutral-500 pt-1">
                                        <p className={`font-bold uppercase text-sm ${underline ? "underline" : ""}`}>{name || "-"}</p>
                                        <p className="text-neutral-400 text-[10px]">{title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Deduction Modal */}
            <Dialog open={!!selectedLineForDeduction} onOpenChange={(open) => !open && setSelectedLineForDeduction(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            Add Deduction: {selectedLineForDeduction?.employee?.first_name} {selectedLineForDeduction?.employee?.last_name}
                        </DialogTitle>
                        <DialogDescription>Apply cash advance, uniform repayment, or penalty.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeductionSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="deduction_type">Deduction Type</Label>
                            <select id="deduction_type" className="w-full h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                value={deductionForm.data.deduction_type} onChange={(e) => deductionForm.setData("deduction_type", e.target.value)}>
                                <option value="cash_advance">Cash Advance Request</option>
                                <option value="uniform">Staff Uniform / ID</option>
                                <option value="penalty">Tardiness / Damage Penalty</option>
                                <option value="other">Other Adjustment</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="deduction_amount">Deduction Amount (P)</Label>
                            <Input id="deduction_amount" type="number" step="0.01" inputMode="decimal" required className="h-10 text-base sm:text-sm" value={deductionForm.data.amount} onChange={(e) => deductionForm.setData("amount", e.target.value)} placeholder="200.00" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="deduction_description">Reason / Reference</Label>
                            <Input id="deduction_description" className="h-10 text-base sm:text-sm" value={deductionForm.data.description} onChange={(e) => deductionForm.setData("description", e.target.value)} placeholder="e.g. Cash advance approved by supervisor" />
                        </div>
                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setSelectedLineForDeduction(null)}>Cancel</Button>
                            <Button type="submit" disabled={deductionForm.processing} className="w-full sm:w-auto h-10 bg-rose-600 hover:bg-rose-500 text-white">
                                {deductionForm.processing ? "Saving..." : "Apply Deduction"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Addition Modal */}
            <Dialog open={!!selectedLineForAddition} onOpenChange={(open) => !open && setSelectedLineForAddition(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            Add Allowance/Others: {selectedLineForAddition?.employee?.first_name} {selectedLineForAddition?.employee?.last_name}
                        </DialogTitle>
                        <DialogDescription>Record extra compensation or service fees.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdditionSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="addition_type">Addition Type</Label>
                            <select id="addition_type" className="w-full h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                value={additionForm.data.addition_type} onChange={(e) => additionForm.setData("addition_type", e.target.value)}>
                                <option value="others">OTHERS / Service Fee</option>
                                <option value="allowance">Special Allowance</option>
                                <option value="bonus">Bonus</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="addition_amount">Amount (P)</Label>
                            <Input id="addition_amount" type="number" step="0.01" inputMode="decimal" required className="h-10 text-base sm:text-sm" value={additionForm.data.amount} onChange={(e) => additionForm.setData("amount", e.target.value)} placeholder="200.00" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="addition_description">Reason / Reference</Label>
                            <Input id="addition_description" className="h-10 text-base sm:text-sm" value={additionForm.data.description} onChange={(e) => additionForm.setData("description", e.target.value)} placeholder="e.g. Purchased supplies, extra duties" />
                        </div>
                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setSelectedLineForAddition(null)}>Cancel</Button>
                            <Button type="submit" disabled={additionForm.processing} className="w-full sm:w-auto h-10 bg-emerald-600 hover:bg-emerald-500 text-white">
                                {additionForm.processing ? "Saving..." : "Apply Addition"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
