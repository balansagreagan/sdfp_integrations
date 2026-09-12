import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, router, useForm } from "@inertiajs/react";
import {
    Calendar,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coins,
    Edit2,
    Minus,
    Moon,
    Plus,
    RefreshCw,
    Sun,
    Trash2,
    Users,
    Wallet,
} from "lucide-react";
import { useState } from "react";

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Daily Time-In/Out", href: "/attendance" },
];

interface ShiftStatus {
    am_status: "present" | "absent" | "day_off" | null;
    pm_status: "present" | "absent" | "day_off" | null;
    ot_hours: number;
}

export interface WeekDayInfo {
    date: string;
    dayName: string;
    dayNum: string;
    monthName: string;
    isToday: boolean;
    isSelected: boolean;
    presentCount: number;
    shiftsCount: number;
}

interface AttendanceProps {
    employees: any[];
    positions?: any[];
    todayShifts: Record<number, ShiftStatus>;
    currentPeriodId: number;
    periodCode: string;
    periodStatus?: string;
    adjustments?: Record<number, {
        payroll_line_id: number | null;
        additions_total: number;
        deductions_total: number;
        additions: any[];
        deductions: any[];
    }>;
    today: string;
    actualToday?: string;
    weekDays?: WeekDayInfo[];
    prevWeekDate?: string;
    nextWeekDate?: string;
    prevDayDate?: string;
    nextDayDate?: string;
    weekLabel?: string;
    isAdmin: boolean;
    currentEmployee?: any;
}

type SlotType = "am" | "pm";

function getNextStatus(current: string | null | undefined): "present" | "absent" {
    return current === "present" ? "absent" : "present";
}

function ShiftBtn({ slot, status, loading, disabled, onClick, className = "", size = "default" }: {
    slot: SlotType; status: string | null | undefined;
    loading: boolean; disabled: boolean; onClick: () => void;
    className?: string; size?: "default" | "lg";
}) {
    const isPresent = status === "present";
    const isAbsent  = status === "absent";
    const Icon = slot === "am" ? Sun : Moon;
    const label = isPresent ? "Time-In \u2713" : isAbsent ? "Absent" : `${slot.toUpperCase()} Time-In`;
    const cls = isPresent
        ? "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 active:bg-emerald-700"
        : isAbsent
        ? "bg-rose-500 border-rose-400 text-white hover:bg-rose-600 active:bg-rose-700"
        : slot === "am"
        ? "bg-white dark:bg-neutral-800 border-sky-300 dark:border-sky-700 text-sky-600 hover:bg-sky-50 active:bg-sky-100"
        : "bg-white dark:bg-neutral-800 border-indigo-300 dark:border-indigo-700 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100";
    const sizeCls = size === "lg"
        ? "h-11 px-3 text-xs sm:text-sm font-bold w-full"
        : "px-4 py-2 text-xs font-bold min-w-[100px]";
    return (
        <button onClick={onClick} disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-lg transition-all duration-200 border-2 justify-center touch-manipulation select-none ${sizeCls} ${cls} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className}`}>
            {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
            {label}
        </button>
    );
}

export default function AttendanceIndex({
    employees,
    positions = [],
    todayShifts,
    currentPeriodId,
    periodCode,
    periodStatus = "draft",
    adjustments = {},
    today,
    actualToday = today,
    weekDays = [],
    prevWeekDate,
    nextWeekDate,
    prevDayDate,
    nextDayDate,
    weekLabel,
    isAdmin,
    currentEmployee,
}: AttendanceProps) {
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
    const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<any | null>(null);
    const [adjustmentCategory, setAdjustmentCategory] = useState<"deduction" | "addition">("deduction");

    const adjustmentForm = useForm({
        employee_id: "",
        payroll_period_id: currentPeriodId,
        deduction_type: "cash_advance",
        addition_type: "others",
        description: "",
        amount: "",
    });

    const handleOpenAdjustment = (emp: any, defaultCategory: "deduction" | "addition" = "deduction") => {
        setSelectedEmpForAdjustment(emp);
        setAdjustmentCategory(defaultCategory);
        adjustmentForm.setData({
            employee_id: String(emp.id),
            payroll_period_id: currentPeriodId,
            deduction_type: "cash_advance",
            addition_type: "others",
            description: "",
            amount: "",
        });
    };

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const routeName = adjustmentCategory === "deduction" ? "payroll.deduction" : "payroll.addition";
        adjustmentForm.post(route(routeName), {
            preserveScroll: true,
            onSuccess: () => {
                adjustmentForm.reset("amount", "description");
            },
        });
    };

    const handleDeleteDeduction = (id: number) => {
        if (!confirm("Remove this deduction?")) return;
        router.delete(route("payroll.deduction.destroy", id), { preserveScroll: true });
    };

    const handleDeleteAddition = (id: number) => {
        if (!confirm("Remove this allowance/addition?")) return;
        router.delete(route("payroll.addition.destroy", id), { preserveScroll: true });
    };

    const editForm = useForm({
        first_name: '',
        last_name: '',
        contact_number: '',
        position_id: '',
        daily_rate: '',
        status: 'active',
    });

    const handleOpenEdit = (emp: any) => {
        setEditingEmployee(emp);
        editForm.setData({
            first_name: emp.first_name,
            last_name: emp.last_name,
            contact_number: emp.contact_number || '',
            position_id: String(emp.position_id),
            daily_rate: String(emp.daily_rate),
            status: emp.status,
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;
        editForm.put(route('staff.update', editingEmployee.id), {
            onSuccess: () => setEditingEmployee(null),
        });
    };

    const todayLabel = new Date(today + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const presentAm    = employees.filter(e => todayShifts[e.id]?.am_status === "present").length;
    const presentPm    = employees.filter(e => todayShifts[e.id]?.pm_status === "present").length;
    const totalPresent = employees.filter(e => todayShifts[e.id]?.am_status === "present" || todayShifts[e.id]?.pm_status === "present").length;

    const navigateToDate = (newDate: string) => {
        router.get(route("attendance.index"), { date: newDate }, { preserveState: true, preserveScroll: true });
    };

    const handleToggle = (employeeId: number, slot: SlotType, currentStatus: string | null | undefined) => {
        const key = `${employeeId}-${slot}`;
        setLoadingKey(key);
        router.post(route("attendance.store"),
            { employee_id: employeeId, shift_slot: slot, status: getNextStatus(currentStatus), work_date: today },
            { preserveScroll: true, onFinish: () => setLoadingKey(null) }
        );
    };

    const grandImpact = employees.reduce((sum, emp) => {
        const s = todayShifts[emp.id];
        const h = (s?.am_status === "present" ? 0.5 : 0) + (s?.pm_status === "present" ? 0.5 : 0);
        return sum + Number(emp.daily_rate) * h;
    }, 0);

    const isSelectedToday = today === actualToday;
    const selectedDayShort = new Date(today + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

    if (!isAdmin) {
        const emp = currentEmployee;
        const shift = emp ? todayShifts[emp.id] : null;
        const amStatus = shift?.am_status;
        const pmStatus = shift?.pm_status;
        const anyLoad = loadingKey !== null;

        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My Attendance &middot; SDFP" />
                <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto w-full">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">My Daily Time-In/Out</h1>
                            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                                <CalendarDays className="size-4 text-sky-500" />
                                <span>{todayLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Week Strip for Staff */}
                    {weekDays.length > 0 && (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 shadow-xs flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="size-7" onClick={() => prevWeekDate && navigateToDate(prevWeekDate)}>
                                        <ChevronLeft className="size-3.5" />
                                    </Button>
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{weekLabel}</span>
                                    <Button variant="outline" size="icon" className="size-7" onClick={() => nextWeekDate && navigateToDate(nextWeekDate)}>
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                                {actualToday && today !== actualToday && (
                                    <Button variant="ghost" size="sm" onClick={() => navigateToDate(actualToday)} className="text-xs h-7 text-sky-600">
                                        Today
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {weekDays.map((d) => (
                                    <button
                                        key={d.date}
                                        type="button"
                                        onClick={() => navigateToDate(d.date)}
                                        className={`flex flex-col items-center py-1.5 px-1 rounded-lg border text-center transition-all ${
                                            d.isSelected ? "bg-sky-600 border-sky-600 text-white font-bold" : d.isToday ? "bg-sky-50 border-sky-300 text-sky-700" : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                                        }`}
                                    >
                                        <span className="text-[9px] uppercase">{d.dayName}</span>
                                        <span className="text-xs font-bold">{d.dayNum}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {emp ? (
                        <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                            <CardHeader className="bg-neutral-50/60 dark:bg-neutral-900/50 py-4 px-6 border-b border-neutral-200/80 dark:border-neutral-800">
                                <CardTitle className="text-lg font-bold text-center">Clock In / Out ({todayLabel})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 flex flex-col items-center gap-6">
                                <div className="flex w-full max-w-sm justify-between items-center bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-100 dark:border-sky-900/30">
                                    <span className="font-semibold text-sky-800 dark:text-sky-300">AM Shift</span>
                                    <ShiftBtn slot="am" status={amStatus} loading={loadingKey === `${emp.id}-am`} disabled={anyLoad} onClick={() => handleToggle(emp.id, "am", amStatus)} />
                                </div>
                                <div className="flex w-full max-w-sm justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <span className="font-semibold text-indigo-800 dark:text-indigo-300">PM Shift</span>
                                    <ShiftBtn slot="pm" status={pmStatus} loading={loadingKey === `${emp.id}-pm`} disabled={anyLoad} onClick={() => handleToggle(emp.id, "pm", pmStatus)} />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card><CardContent className="p-8 text-center text-neutral-500">No employee record found for your account.</CardContent></Card>
                    )}
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Time-In/Out &middot; SDFP" />
            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">Daily Time-In/Out</h1>
                            <Badge className="bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/30">{periodCode}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                            <CalendarDays className="size-4 text-sky-500" />
                            <span>{todayLabel}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            Click <span className="font-semibold text-sky-600">AM</span> or <span className="font-semibold text-indigo-600">PM</span> to toggle.
                            Green = Present &middot; Red = Absent. Changes reflect instantly on the <a href="/payroll" className="text-sky-600 hover:underline">Weekly Payroll</a>.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.reload()} className="flex items-center gap-2 text-xs self-start">
                        <RefreshCw className="size-3.5" /> Refresh
                    </Button>
                </div>

                {/* Week & Date Calendar Navigator */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                onClick={() => prevWeekDate && navigateToDate(prevWeekDate)}
                                title="Previous Week"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Calendar className="size-4 text-sky-500" />
                                <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                                    {weekLabel ?? "Weekly Timesheet"}
                                </span>
                                <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                    {periodCode}
                                </Badge>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                onClick={() => nextWeekDate && navigateToDate(nextWeekDate)}
                                title="Next Week"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {actualToday && today !== actualToday && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigateToDate(actualToday)}
                                    className="text-xs h-8 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                >
                                    Jump to Today
                                </Button>
                            )}
                            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-700">
                                <span className="text-[11px] font-medium text-neutral-500">Pick Date:</span>
                                <input
                                    type="date"
                                    value={today}
                                    onChange={(e) => e.target.value && navigateToDate(e.target.value)}
                                    className="text-xs bg-transparent border-0 p-0 text-neutral-700 dark:text-neutral-200 focus:outline-hidden font-medium cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Week Strip */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {weekDays.map((d) => {
                            const isSelected = d.isSelected;
                            const isToday = d.isToday;
                            return (
                                <button
                                    key={d.date}
                                    type="button"
                                    onClick={() => navigateToDate(d.date)}
                                    className={`group relative flex flex-col items-center justify-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-lg border transition-all duration-150 cursor-pointer text-center
                                        ${isSelected
                                            ? "bg-sky-600 border-sky-600 text-white shadow-sm ring-2 ring-sky-500/30"
                                            : isToday
                                            ? "bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700 text-neutral-800 dark:text-neutral-100 hover:bg-sky-100 dark:hover:bg-sky-900/40"
                                            : "bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        }`}
                                >
                                    <span className={`text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider ${isSelected ? "text-sky-100" : "text-neutral-500"}`}>
                                        {d.dayName}
                                    </span>
                                    <span className={`text-xs sm:text-base font-bold my-0.5 ${isSelected ? "text-white" : isToday ? "text-sky-600 dark:text-sky-400" : ""}`}>
                                        {d.dayNum}
                                    </span>
                                    <div className="flex items-center gap-0.5 min-h-[14px]">
                                        {d.presentCount > 0 ? (
                                            <span className={`text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded-full ${isSelected ? "bg-sky-700 text-sky-100" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                                                {d.presentCount} <span className="hidden sm:inline">pres</span>
                                            </span>
                                        ) : (
                                            <span className={`text-[8px] opacity-40 ${isSelected ? "text-sky-200" : "text-neutral-400"}`}>
                                                -
                                            </span>
                                        )}
                                    </div>
                                    {isToday && !isSelected && (
                                        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 text-[7px] sm:text-[8px] font-bold uppercase rounded bg-sky-500 text-white shadow-xs">
                                            Today
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                        { label: isSelectedToday ? "Present Today" : `Present (${selectedDayShort})`, value: totalPresent, sub: `of ${employees.length} staff`, icon: Users, color: "text-emerald-600", from: "from-emerald-50/60 dark:from-emerald-950/20" },
                        { label: "AM Shift",      value: presentAm,    sub: isSelectedToday ? "clocked in AM" : `clocked in AM (${selectedDayShort})`, icon: Sun,   color: "text-sky-600",     from: "from-sky-50/60 dark:from-sky-950/20" },
                        { label: "PM Shift",      value: presentPm,    sub: isSelectedToday ? "clocked in PM" : `clocked in PM (${selectedDayShort})`, icon: Moon,  color: "text-indigo-600",  from: "from-indigo-50/60 dark:from-indigo-950/20" },
                    ].map(({ label, value, sub, icon: Icon, color, from }) => (
                        <Card key={label} className={`border-neutral-200/70 bg-gradient-to-br ${from} to-white dark:border-neutral-800 dark:to-neutral-900 shadow-xs`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-2 sm:pt-3 px-2.5 sm:px-4">
                                <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-500 truncate">{label}</CardTitle>
                                <Icon className={`size-3.5 sm:size-4 ${color} shrink-0`} />
                            </CardHeader>
                            <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
                                <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
                                <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">{sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Mobile Staff Attendance Cards (Visible on mobile < md) */}
                <div className="flex flex-col gap-3 md:hidden">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Staff Time-In / Out Cards</span>
                        <span className="text-[11px] text-neutral-400">Tap AM / PM to toggle</span>
                    </div>

                    {employees.map((emp) => {
                        const shift    = todayShifts[emp.id];
                        const amStatus = shift?.am_status;
                        const pmStatus = shift?.pm_status;
                        const amKey    = `${emp.id}-am`;
                        const pmKey    = `${emp.id}-pm`;
                        const anyLoad  = loadingKey !== null;
                        const halfDays = (amStatus === "present" ? 0.5 : 0) + (pmStatus === "present" ? 0.5 : 0);
                        const rate     = Number(emp.daily_rate);
                        const earned   = rate * halfDays;
                        const fullDay  = amStatus === "present" && pmStatus === "present";
                        const halfDay  = (amStatus === "present") !== (pmStatus === "present");
                        const isAbsent = amStatus === "absent" && pmStatus === "absent";
                        const unset    = !amStatus && !pmStatus;
                        const empAdj   = adjustments?.[emp.id];

                        return (
                            <div
                                key={`mobile-emp-${emp.id}`}
                                className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs space-y-3"
                            >
                                {/* Employee Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="size-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
                                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm truncate leading-tight">
                                                {emp.last_name}, {emp.first_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className="inline-flex rounded px-1.5 py-0.2 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                                    {emp.position?.title ?? "Staff"}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 font-mono">
                                                    {emp.employee_code}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenEdit(emp)}
                                        className="size-8 p-0 text-neutral-400 hover:text-sky-600 shrink-0"
                                        title="Edit Staff Information"
                                    >
                                        <Edit2 className="size-4" />
                                    </Button>
                                </div>

                                {/* Status & Daily Compensation Bar */}
                                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 rounded-lg border border-neutral-100 dark:border-neutral-800/80 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-neutral-500 text-[11px]">Today:</span>
                                        {fullDay  && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 ring-1 ring-emerald-500/30"><CheckCircle2 className="size-2.5" /> Full Day</span>}
                                        {halfDay  && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/40 text-sky-700 ring-1 ring-sky-500/30"><Clock className="size-2.5" /> Half Day</span>}
                                        {isAbsent && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 ring-1 ring-rose-500/30">Absent</span>}
                                        {unset    && <span className="text-neutral-400 text-[11px]">Not clocked in</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-emerald-600 text-sm">
                                            +&#8369;{earned.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                        <div className="text-[10px] text-neutral-400">
                                            &#8369;{rate.toLocaleString()}/day
                                        </div>
                                    </div>
                                </div>

                                {/* Large Touch AM/PM Toggle Buttons (44px target) */}
                                <div className="grid grid-cols-2 gap-2 pt-0.5">
                                    <ShiftBtn
                                        slot="am"
                                        status={amStatus}
                                        loading={loadingKey === amKey}
                                        disabled={anyLoad}
                                        onClick={() => handleToggle(emp.id, "am", amStatus)}
                                        size="lg"
                                    />
                                    <ShiftBtn
                                        slot="pm"
                                        status={pmStatus}
                                        loading={loadingKey === pmKey}
                                        disabled={anyLoad}
                                        onClick={() => handleToggle(emp.id, "pm", pmStatus)}
                                        size="lg"
                                    />
                                </div>

                                {/* Footer: CA / Others Action & Adjustment Badges */}
                                <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {empAdj && empAdj.additions_total > 0 && (
                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                +&#8369;{empAdj.additions_total.toFixed(0)} Others
                                            </span>
                                        )}
                                        {empAdj && empAdj.deductions_total > 0 && (
                                            <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/20">
                                                -&#8369;{empAdj.deductions_total.toFixed(0)} CA
                                            </span>
                                        )}
                                        {(!empAdj || (empAdj.additions_total === 0 && empAdj.deductions_total === 0)) && (
                                            <span className="text-[11px] text-neutral-400">No CA/Allowances</span>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenAdjustment(emp)}
                                        className="h-9 px-2.5 text-xs font-semibold flex items-center gap-1 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-amber-400 hover:text-amber-600 active:bg-amber-50 shrink-0"
                                    >
                                        <Coins className="size-3.5 text-amber-500" />
                                        <span>CA / Others</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop Attendance Table (Hidden on mobile < md) */}
                <Card className="hidden md:block border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                    <CardHeader className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 py-3 px-5">
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 text-sky-600" />
                            <CardTitle className="text-sm font-bold">Staff Time-In/Out Register</CardTitle>
                            <span className="ml-auto text-xs text-neutral-400">Green = Present &middot; Red = Absent &middot; Uncolored = Unset</span>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60">
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 w-8">#</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-500">Employee</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-500">Position</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-sky-600">AM Shift</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-indigo-600">PM Shift</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-600">Payroll Impact</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-neutral-500 w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {employees.map((emp, idx) => {
                                    const shift    = todayShifts[emp.id];
                                    const amStatus = shift?.am_status;
                                    const pmStatus = shift?.pm_status;
                                    const amKey    = `${emp.id}-am`;
                                    const pmKey    = `${emp.id}-pm`;
                                    const anyLoad  = loadingKey !== null;
                                    const halfDays = (amStatus === "present" ? 0.5 : 0) + (pmStatus === "present" ? 0.5 : 0);
                                    const rate     = Number(emp.daily_rate);
                                    const earned   = rate * halfDays;
                                    const fullDay  = amStatus === "present" && pmStatus === "present";
                                    const halfDay  = (amStatus === "present") !== (pmStatus === "present");
                                    const isAbsent = amStatus === "absent" && pmStatus === "absent";
                                    const unset    = !amStatus && !pmStatus;
                                    const empAdj   = adjustments?.[emp.id];
                                    return (
                                        <tr key={emp.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="px-5 py-4 text-xs text-neutral-400 font-mono">{idx + 1}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                                                    <div>
                                                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{emp.last_name}, {emp.first_name}</p>
                                                        <p className="text-[11px] text-neutral-400 font-mono">{emp.employee_code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{emp.position?.title ?? "Staff"}</span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <ShiftBtn slot="am" status={amStatus} loading={loadingKey === amKey} disabled={anyLoad} onClick={() => handleToggle(emp.id, "am", amStatus)} />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <ShiftBtn slot="pm" status={pmStatus} loading={loadingKey === pmKey} disabled={anyLoad} onClick={() => handleToggle(emp.id, "pm", pmStatus)} />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {fullDay  && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 ring-1 ring-emerald-500/30"><CheckCircle2 className="size-3" /> Full Day</span>}
                                                {halfDay  && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/40 text-sky-700 ring-1 ring-sky-500/30"><Clock className="size-3" /> Half Day</span>}
                                                {isAbsent && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 ring-1 ring-rose-500/30">Absent</span>}
                                                {unset    && <span className="text-[11px] text-neutral-300 dark:text-neutral-600">&mdash;</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {halfDays > 0
                                                    ? (<div><p className="font-bold text-emerald-600">+&#8369;{earned.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p><p className="text-[10px] text-neutral-400">{halfDays} day &times; &#8369;{rate.toLocaleString()}</p></div>)
                                                    : <span className="text-xs text-neutral-300">&#8369;0.00</span>}
                                                {empAdj && (empAdj.additions_total > 0 || empAdj.deductions_total > 0) && (
                                                    <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                                                        {empAdj.additions_total > 0 && (
                                                             <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                                +&#8369;{empAdj.additions_total.toFixed(0)} Others
                                                            </span>
                                                        )}
                                                        {empAdj.deductions_total > 0 && (
                                                            <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/20">
                                                                -&#8369;{empAdj.deductions_total.toFixed(0)} CA
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenAdjustment(emp)}
                                                        className="h-8 px-2 text-xs font-semibold flex items-center gap-1 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs"
                                                        title="Record Cash Advance (CA) or Allowance/Others"
                                                    >
                                                        <Coins className="size-3.5 text-amber-500" />
                                                        <span>CA / Others</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(emp)}
                                                        className="h-8 w-8 p-0 text-neutral-400 hover:text-sky-600"
                                                        title="Edit Staff Information"
                                                    >
                                                        <Edit2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60 font-bold">
                                    <td colSpan={3} className="px-5 py-3 text-xs text-right uppercase tracking-wider text-neutral-500">Today&apos;s Total</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-sky-600">{presentAm} AM</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-indigo-600">{presentPm} PM</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-emerald-600">{totalPresent} Present</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-emerald-600">+&#8369;{grandImpact.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-5 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30 px-5 py-3 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                            <Wallet className="size-3.5 text-emerald-500 shrink-0" />
                            <span>Auto-synced to <strong className="text-neutral-700 dark:text-neutral-300">Payroll Period {periodCode}</strong>. Each toggle instantly recalculates the <a href="/payroll" className="text-sky-600 hover:underline font-medium">Weekly Payroll</a>.</span>
                        </div>
                        <div className="ml-auto flex items-center gap-3 text-[11px] text-neutral-400 shrink-0">
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-emerald-500 inline-block" /> Present</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-rose-500 inline-block" /> Absent</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-neutral-200 dark:bg-neutral-700 inline-block" /> Unset</span>
                        </div>
                    </div>
                </Card>
            </div>

            <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            Edit Staff: {editingEmployee?.first_name} {editingEmployee?.last_name}
                        </DialogTitle>
                        <DialogDescription>
                            Update daily rate, assigned position, or employment status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mb-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs">
                        <span className="text-amber-800 dark:text-amber-300 font-medium">Need to record a Cash Advance or Allowance?</span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const emp = editingEmployee;
                                setEditingEmployee(null);
                                handleOpenAdjustment(emp);
                            }}
                            className="h-7 text-xs font-bold border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-100 shrink-0"
                        >
                            Open Adjustments
                        </Button>
                    </div>

                    <form onSubmit={submitEdit} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_position_id">Position</Label>
                                <select
                                    id="edit_position_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={editForm.data.position_id}
                                    onChange={(e) => editForm.setData('position_id', e.target.value)}
                                >
                                    {positions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_daily_rate">Daily Rate (₱)</Label>
                                <Input
                                    id="edit_daily_rate"
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    required
                                    value={editForm.data.daily_rate}
                                    onChange={(e) => editForm.setData('daily_rate', e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto h-10"
                                onClick={() => setEditingEmployee(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="bg-sky-600 hover:bg-sky-500 text-white w-full sm:w-auto h-10"
                            >
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Cash Advance & "OTHERS" Adjustment Dialog */}
            <Dialog open={!!selectedEmpForAdjustment} onOpenChange={(open) => !open && setSelectedEmpForAdjustment(null)}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Coins className="size-5 text-amber-500" />
                            Payroll Adjustments: {selectedEmpForAdjustment?.first_name} {selectedEmpForAdjustment?.last_name}
                        </DialogTitle>
                        <DialogDescription>
                            Record Cash Advances (CA) or "OTHERS" allowances for {periodCode}. Automatically syncs to Weekly Payroll.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setAdjustmentCategory("deduction")}
                            className={`py-2 px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                adjustmentCategory === "deduction"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                            }`}
                        >
                            <Minus className="size-3.5" /> Cash Advance / Deduction
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjustmentCategory("addition")}
                            className={`py-2 px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                adjustmentCategory === "addition"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                            }`}
                        >
                            <Plus className="size-3.5" /> "OTHERS" / Allowance
                        </button>
                    </div>

                    <form onSubmit={handleAdjustmentSubmit} className="space-y-4 py-2">
                        {adjustmentCategory === "deduction" ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="deduction_type">Deduction Type</Label>
                                    <select
                                        id="deduction_type"
                                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                        value={adjustmentForm.data.deduction_type}
                                        onChange={(e) => adjustmentForm.setData("deduction_type", e.target.value)}
                                    >
                                        <option value="cash_advance">Cash Advance Request (CA)</option>
                                        <option value="uniform">Staff Uniform / ID</option>
                                        <option value="penalty">Tardiness / Damage Penalty</option>
                                        <option value="other">Other Deduction</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="adjustment_amount">Deduction Amount (₱)</Label>
                                    <Input
                                        id="adjustment_amount"
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        required
                                        placeholder="e.g. 500.00"
                                        value={adjustmentForm.data.amount}
                                        onChange={(e) => adjustmentForm.setData("amount", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="adjustment_desc">Reason / Reference</Label>
                                    <Input
                                        id="adjustment_desc"
                                        placeholder="e.g. Approved cash advance by owner"
                                        value={adjustmentForm.data.description}
                                        onChange={(e) => adjustmentForm.setData("description", e.target.value)}
                                    />
                                </div>
                                <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setSelectedEmpForAdjustment(null)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={adjustmentForm.processing}
                                        className="bg-rose-600 hover:bg-rose-500 text-white w-full sm:w-auto h-10"
                                    >
                                        {adjustmentForm.processing ? "Saving..." : "Apply CA Deduction"}
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="addition_type">Addition Type</Label>
                                    <select
                                        id="addition_type"
                                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                        value={adjustmentForm.data.addition_type}
                                        onChange={(e) => adjustmentForm.setData("addition_type", e.target.value)}
                                    >
                                        <option value="others">OTHERS / Service Fee</option>
                                        <option value="allowance">Special Allowance</option>
                                        <option value="bonus">Bonus / Incentive</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="addition_amount">Allowance Amount (₱)</Label>
                                    <Input
                                        id="addition_amount"
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        required
                                        placeholder="e.g. 250.00"
                                        value={adjustmentForm.data.amount}
                                        onChange={(e) => adjustmentForm.setData("amount", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="addition_desc">Reason / Reference</Label>
                                    <Input
                                        id="addition_desc"
                                        placeholder="e.g. Purchased supplies, extra duties"
                                        value={adjustmentForm.data.description}
                                        onChange={(e) => adjustmentForm.setData("description", e.target.value)}
                                    />
                                </div>
                                <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setSelectedEmpForAdjustment(null)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={adjustmentForm.processing}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto h-10"
                                    >
                                        {adjustmentForm.processing ? "Saving..." : "Apply Allowance / OTHERS"}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </form>

                    {/* Active Cycle Adjustments Breakdown */}
                    {selectedEmpForAdjustment && adjustments?.[selectedEmpForAdjustment.id] && (
                        <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Recorded for Cycle {periodCode}:
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {adjustments[selectedEmpForAdjustment.id].deductions?.map((d: any) => (
                                    <div key={`d-${d.id}`} className="flex items-center justify-between text-xs bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded border border-rose-200/60 dark:border-rose-900/30">
                                        <div>
                                            <span className="font-bold text-rose-700 dark:text-rose-400 capitalize">
                                                {d.deduction_type.replace('_', ' ')}
                                            </span>
                                            {d.description && <span className="text-neutral-500 ml-1.5 text-[11px]">&middot; {d.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-rose-600">-₱{Number(d.amount).toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDeduction(d.id)}
                                                className="text-neutral-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                                title="Delete this deduction"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {adjustments[selectedEmpForAdjustment.id].additions?.map((a: any) => (
                                    <div key={`a-${a.id}`} className="flex items-center justify-between text-xs bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200/60 dark:border-emerald-900/30">
                                        <div>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                                                {a.addition_type}
                                            </span>
                                            {a.description && <span className="text-neutral-500 ml-1.5 text-[11px]">&middot; {a.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600">+₱{Number(a.amount).toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAddition(a.id)}
                                                className="text-neutral-400 hover:text-emerald-600 p-0.5 cursor-pointer"
                                                title="Delete this allowance"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(!adjustments[selectedEmpForAdjustment.id].deductions?.length &&
                                  !adjustments[selectedEmpForAdjustment.id].additions?.length) && (
                                    <p className="text-[11px] text-neutral-400 italic">No adjustments recorded yet for this employee.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
