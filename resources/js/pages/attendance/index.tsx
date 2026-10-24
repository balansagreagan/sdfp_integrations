import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmAction } from '@/lib/notifications';
import { type BreadcrumbItem, type Employee, type Position } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
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
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Daily Time-In/Out', href: '/attendance' },
];

interface ShiftStatus {
    am_status: 'timed_out' | 'present' | 'absent' | 'day_off' | 'unrecorded' | null;
    pm_status: 'timed_out' | 'present' | 'absent' | 'day_off' | 'unrecorded' | null;
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

interface PayrollAdjustment {
    id: number;
    amount: number | string;
    description: string | null;
}

interface AttendanceProps {
    employees: Employee[];
    positions?: Position[];
    todayShifts: Record<number, ShiftStatus>;
    currentPeriodId: number;
    periodCode: string;
    periodStatus?: string;
    isClosed?: boolean;
    adjustments?: Record<
        number,
        {
            payroll_line_id: number | null;
            additions_total: number;
            deductions_total: number;
            additions: (PayrollAdjustment & { addition_type: string })[];
            deductions: (PayrollAdjustment & { deduction_type: string })[];
        }
    >;
    today: string;
    actualToday?: string;
    weekDays?: WeekDayInfo[];
    prevWeekDate?: string;
    nextWeekDate?: string;
    prevDayDate?: string;
    nextDayDate?: string;
    weekLabel?: string;
    isAdmin: boolean;
    workArea: 'park' | 'soaked';
}

type SlotType = 'am' | 'pm';

function isWorked(status: string | null | undefined): boolean {
    return status === 'present' || status === 'timed_out';
}

function getNextStatus(current: string | null | undefined): 'present' | 'absent' | 'unrecorded' {
    if (isWorked(current)) return 'absent';
    return current === 'absent' ? 'unrecorded' : 'present';
}

function ShiftBtn({
    slot,
    status,
    loading,
    disabled,
    onClick,
    className = '',
    size = 'default',
}: {
    slot: SlotType;
    status: string | null | undefined;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
    className?: string;
    size?: 'default' | 'lg';
}) {
    const isPresent = status === 'present' || status === 'timed_out';
    const isAbsent = status === 'absent';
    const Icon = slot === 'am' ? Sun : Moon;
    const label = `${slot.toUpperCase()}: ${isPresent ? 'Present' : isAbsent ? 'Absent' : 'Mark present'}`;
    const cls = isPresent
        ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 active:bg-emerald-700'
        : isAbsent
          ? 'bg-rose-500 border-rose-400 text-white hover:bg-rose-600 active:bg-rose-700'
          : slot === 'am'
            ? 'bg-white dark:bg-neutral-800 border-sky-300 dark:border-sky-700 text-sky-600 hover:bg-sky-50 active:bg-sky-100'
            : 'bg-white dark:bg-neutral-800 border-indigo-300 dark:border-indigo-700 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100';
    const sizeCls = size === 'lg' ? 'min-h-11 w-full min-w-0 px-2 py-2 text-xs font-bold' : 'min-h-11 min-w-[8rem] px-3 py-2 text-xs font-bold';
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg border-2 transition-all duration-200 select-none ${sizeCls} ${cls} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
        >
            {loading ? <RefreshCw className="size-3.5 shrink-0 animate-spin" /> : <Icon className="size-3.5 shrink-0" />}
            <span className="leading-4">{label}</span>
        </button>
    );
}

export default function AttendanceIndex({
    employees,
    positions = [],
    todayShifts,
    currentPeriodId,
    periodCode,
    periodStatus = 'draft',
    isClosed = false,
    adjustments = {},
    today,
    actualToday = today,
    weekDays = [],
    prevWeekDate,
    nextWeekDate,
    weekLabel,
    isAdmin,
    workArea,
}: AttendanceProps) {
    const [resettingDate, setResettingDate] = useState(false);
    const businessLabel = workArea === 'soaked' ? 'Soaked' : 'SDFP';
    const payrollUrl = `${workArea === 'soaked' ? '/soaked-payroll' : '/payroll'}?date=${today}`;
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<Employee | null>(null);
    const [adjustmentCategory, setAdjustmentCategory] = useState<'deduction' | 'addition'>('deduction');

    const adjustmentForm = useForm({
        employee_id: '',
        payroll_period_id: currentPeriodId,
        deduction_type: 'cash_advance',
        addition_type: 'others',
        description: '',
        amount: '',
    });

    const handleOpenAdjustment = (emp: Employee, defaultCategory: 'deduction' | 'addition' = 'deduction') => {
        setSelectedEmpForAdjustment(emp);
        setAdjustmentCategory(defaultCategory);
        adjustmentForm.setData({
            employee_id: String(emp.id),
            payroll_period_id: currentPeriodId,
            deduction_type: 'cash_advance',
            addition_type: 'others',
            description: '',
            amount: '',
        });
    };

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const routeName = adjustmentCategory === 'deduction' ? 'payroll.deduction' : 'payroll.addition';
        adjustmentForm.post(route(routeName), {
            preserveScroll: true,
            onSuccess: () => {
                adjustmentForm.reset('amount', 'description');
            },
        });
    };

    const handleDeleteDeduction = async (id: number) => {
        if (!(await confirmAction('Remove this deduction?', { title: 'Remove deduction?', confirmText: 'Remove', danger: true }))) return;
        router.delete(route('payroll.deduction.destroy', id), { preserveScroll: true });
    };

    const handleDeleteAddition = async (id: number) => {
        if (!(await confirmAction('Remove this allowance/addition?', { title: 'Remove allowance?', confirmText: 'Remove', danger: true }))) return;
        router.delete(route('payroll.addition.destroy', id), { preserveScroll: true });
    };

    const editForm = useForm({
        first_name: '',
        last_name: '',
        contact_number: '',
        position_id: '',
        daily_rate: '',
        status: 'active',
    });

    const handleOpenEdit = (emp: Employee) => {
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

    const todayLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const presentAm = employees.filter((e) => isWorked(todayShifts[e.id]?.am_status)).length;
    const presentPm = employees.filter((e) => isWorked(todayShifts[e.id]?.pm_status)).length;
    const totalPresent = employees.filter((e) => isWorked(todayShifts[e.id]?.am_status) || isWorked(todayShifts[e.id]?.pm_status)).length;

    const navigateToDate = (newDate: string) => {
        router.get(route('attendance.index'), { date: newDate, work_area: workArea }, { preserveState: true, preserveScroll: true });
    };

    const handleToggle = (employeeId: number, slot: SlotType, currentStatus: string | null | undefined) => {
        if (periodStatus === 'approved' || isClosed || resettingDate || loadingKey !== null) return;
        const key = `${employeeId}-${slot}`;
        setLoadingKey(key);
        router.post(
            route('attendance.store'),
            { employee_id: employeeId, shift_slot: slot, status: getNextStatus(currentStatus), work_date: today, work_area: workArea },
            { preserveScroll: true, onFinish: () => setLoadingKey(null) },
        );
    };

    const toggleOperatingDay = async () => {
        const action = isClosed ? 're-open' : 'close';
        if (
            !(await confirmAction(
                `${action === 'close' ? "Close operations, disable staff manual attendance entry, and clear the day's recorded attendance" : 'Re-open'} for ${todayLabel}?`,
                { confirmText: isClosed ? 'Re-open operations' : 'Close operations', danger: !isClosed },
            ))
        )
            return;
        router.post(route('attendance.operating-day'), { work_date: today, is_closed: !isClosed }, { preserveScroll: true });
    };

    const resetDateAttendance = async () => {
        if (resettingDate || loadingKey !== null || periodStatus === 'approved') return;
        if (
            !(await confirmAction(
                `Reset ${businessLabel} AM/PM attendance and overtime for ${todayLabel} only? Other dates and the other business are kept. Payroll will be recalculated; allowances and deductions are kept.`,
                { title: 'Reset attendance?', confirmText: 'Reset attendance', danger: true },
            ))
        )
            return;
        setResettingDate(true);
        router.post(
            route('attendance.reset-date'),
            { work_date: today, work_area: workArea },
            {
                preserveScroll: true,
                onFinish: () => setResettingDate(false),
            },
        );
    };

    const grandImpact = employees.reduce((sum, emp) => {
        const s = todayShifts[emp.id];
        const h = (isWorked(s?.am_status) ? 0.5 : 0) + (isWorked(s?.pm_status) ? 0.5 : 0);
        return sum + Number(emp.daily_rate) * h;
    }, 0);

    const isSelectedToday = today === actualToday;
    const selectedDayShort = new Date(today + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Time-In/Out &middot; SDFP" />
            <div className="mx-auto flex w-full max-w-full min-w-0 flex-col gap-6 p-4 md:p-8" data-testid="attendance-page">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">Daily Time-In/Out</h1>
                            <Badge className="bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/30">{periodCode}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                            <CalendarDays className="size-4 text-sky-500" />
                            <span>{todayLabel}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            Manually record attendance: click <span className="font-semibold text-sky-600">AM</span> or{' '}
                            <span className="font-semibold text-indigo-600">PM</span> to cycle: Unrecorded &rarr; Present &rarr; Absent &rarr;
                            Unrecorded. Each shift is saved independently. Green = Present &middot; Red = Absent. Changes reflect instantly on the{' '}
                            <a href={payrollUrl} className="text-sky-600 hover:underline">
                                Weekly Payroll
                            </a>
                            .
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.reload()}
                        className="flex min-h-11 shrink-0 items-center gap-2 self-start text-xs"
                    >
                        <RefreshCw className="size-3.5" /> Refresh
                    </Button>
                </div>

                <div
                    className={`flex min-w-0 flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between ${isClosed ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{isClosed ? 'Operations closed' : 'Operations open'}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                            Closing a date for both SDFP and Soaked clears its recorded attendance, recalculates payroll, and prevents staff manual
                            attendance entry. Closed dates appear orange in Weekly Payroll.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col [&_button]:min-h-11">
                        {isAdmin && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={resetDateAttendance}
                                    disabled={periodStatus === 'approved' || resettingDate || loadingKey !== null}
                                    className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                                >
                                    <RefreshCw className={`size-4 ${resettingDate ? 'animate-spin' : ''}`} />{' '}
                                    {resettingDate ? 'Resetting...' : 'Reset Time-In/Out'}
                                </Button>
                                <Button
                                    onClick={toggleOperatingDay}
                                    disabled={periodStatus === 'approved' || resettingDate || loadingKey !== null}
                                    className={
                                        isClosed ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-orange-600 text-white hover:bg-orange-500'
                                    }
                                >
                                    {isClosed ? 'Open for Duty' : 'Close Operations'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <p className="text-sm text-neutral-500">
                        Reset Time-In/Out clears {businessLabel} attendance for <strong>{todayLabel}</strong> only. Select another day in the calendar
                        to reset that day. Other dates remain in payroll.
                    </p>
                )}

                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:flex-wrap">
                    <Label htmlFor="attendance-business">Employees</Label>
                    <select
                        id="attendance-business"
                        value={workArea}
                        className="bg-background min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-sm sm:w-auto"
                        onChange={(event) =>
                            router.get(route('attendance.index'), { date: today, work_area: event.target.value }, { preserveScroll: true })
                        }
                    >
                        <option value="park">SDFP employees</option>
                        <option value="soaked">Soaked employees</option>
                    </select>
                    <a href={payrollUrl} className="col-span-2 inline-flex min-h-11 items-center text-sm text-sky-600 hover:underline">
                        View {workArea === 'soaked' ? 'Soaked' : 'SDFP'} Payroll
                    </a>
                    {periodStatus === 'approved' && <span className="text-sm text-amber-600">Approved payroll: attendance is locked.</span>}
                </div>

                {/* Week & Date Calendar Navigator */}
                <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 shadow-xs sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex min-w-0 flex-col gap-3 border-b border-neutral-100 pb-3 md:flex-row md:flex-wrap md:items-center md:justify-between dark:border-neutral-800">
                        <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-11 shrink-0"
                                onClick={() => prevWeekDate && navigateToDate(prevWeekDate)}
                                title="Previous Week"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                                <Calendar className="size-4 shrink-0 text-sky-500" />
                                <span className="text-xs font-bold text-neutral-800 sm:text-sm dark:text-neutral-200">
                                    {weekLabel ?? 'Weekly Timesheet'}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="hidden bg-neutral-100 px-1.5 py-0 font-mono text-[10px] text-neutral-600 sm:inline-flex dark:bg-neutral-800 dark:text-neutral-400"
                                >
                                    {periodCode}
                                </Badge>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-11 shrink-0"
                                onClick={() => nextWeekDate && navigateToDate(nextWeekDate)}
                                title="Next Week"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {actualToday && today !== actualToday && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigateToDate(actualToday)}
                                    className="h-8 border border-sky-200 bg-sky-50 text-xs text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                                >
                                    Jump to Today
                                </Button>
                            )}
                            <div className="flex min-h-11 max-w-full min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-neutral-200/60 bg-neutral-50 px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-800/60">
                                <span className="text-[11px] font-medium text-neutral-500">Pick Date:</span>
                                <input
                                    type="date"
                                    value={today}
                                    onChange={(e) => e.target.value && navigateToDate(e.target.value)}
                                    aria-label="Attendance date"
                                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-neutral-700 focus:outline-hidden dark:text-neutral-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Week Strip */}
                    <div
                        className="max-w-full overflow-x-auto overscroll-x-contain pb-1"
                        role="region"
                        aria-label="Attendance week calendar"
                        tabIndex={0}
                    >
                        <div className="grid min-w-[19.5rem] grid-cols-7 gap-1 sm:gap-2">
                            {weekDays.map((d) => {
                                const isSelected = d.isSelected;
                                const isToday = d.isToday;
                                return (
                                    <button
                                        key={d.date}
                                        aria-label={`View attendance for ${d.date}`}
                                        aria-pressed={d.isSelected}
                                        type="button"
                                        onClick={() => navigateToDate(d.date)}
                                        className={`group relative flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-lg border px-0.5 py-1.5 text-center transition-all duration-150 sm:px-1 sm:py-2 ${
                                            isSelected
                                                ? 'border-sky-600 bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30'
                                                : isToday
                                                  ? 'border-sky-300 bg-sky-50 text-neutral-800 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-neutral-100 dark:hover:bg-sky-900/40'
                                                  : 'border-neutral-200/60 bg-neutral-50/70 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                        }`}
                                    >
                                        <span
                                            className={`text-[8px] font-semibold tracking-wider uppercase sm:text-[10px] ${isSelected ? 'text-sky-100' : 'text-neutral-500'}`}
                                        >
                                            {d.dayName}
                                        </span>
                                        <span
                                            className={`my-0.5 text-xs font-bold sm:text-base ${isSelected ? 'text-white' : isToday ? 'text-sky-600 dark:text-sky-400' : ''}`}
                                        >
                                            {d.dayNum}
                                        </span>
                                        <div className="flex min-h-[14px] items-center gap-0.5">
                                            {d.presentCount > 0 ? (
                                                <span
                                                    className={`py-0.2 rounded-full px-1 text-[8px] font-semibold sm:text-[9px] ${isSelected ? 'bg-sky-700 text-sky-100' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}
                                                >
                                                    {d.presentCount} <span className="hidden sm:inline">pres</span>
                                                </span>
                                            ) : (
                                                <span className={`text-[8px] opacity-40 ${isSelected ? 'text-sky-200' : 'text-neutral-400'}`}>-</span>
                                            )}
                                        </div>
                                        {isToday && !isSelected && (
                                            <span className="py-0.2 absolute -top-1.5 -right-1 rounded bg-sky-500 px-1 text-[7px] font-bold text-white uppercase shadow-xs sm:text-[8px]">
                                                Today
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {/* Summary Cards */}
                <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
                    {[
                        {
                            label: isSelectedToday ? 'Present Today' : `Present (${selectedDayShort})`,
                            value: totalPresent,
                            sub: `of ${employees.length} staff`,
                            icon: Users,
                            color: 'text-emerald-600',
                            from: 'from-emerald-50/60 dark:from-emerald-950/20',
                        },
                        {
                            label: 'AM Shift',
                            value: presentAm,
                            sub: isSelectedToday ? 'recorded present AM' : `recorded present AM (${selectedDayShort})`,
                            icon: Sun,
                            color: 'text-sky-600',
                            from: 'from-sky-50/60 dark:from-sky-950/20',
                        },
                        {
                            label: 'PM Shift',
                            value: presentPm,
                            sub: isSelectedToday ? 'recorded present PM' : `recorded present PM (${selectedDayShort})`,
                            icon: Moon,
                            color: 'text-indigo-600',
                            from: 'from-indigo-50/60 dark:from-indigo-950/20',
                        },
                    ].map(({ label, value, sub, icon: Icon, color, from }) => (
                        <Card
                            key={label}
                            className={`border-neutral-200/70 bg-gradient-to-br ${from} to-white shadow-xs dark:border-neutral-800 dark:to-neutral-900`}
                        >
                            <CardHeader className="flex flex-row items-center justify-between px-2.5 pt-2 pb-1 sm:px-4 sm:pt-3">
                                <CardTitle className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase sm:text-xs">
                                    {label}
                                </CardTitle>
                                <Icon className={`size-3.5 sm:size-4 ${color} shrink-0`} />
                            </CardHeader>
                            <CardContent className="px-2.5 pb-2.5 sm:px-4 sm:pb-3">
                                <div className={`text-xl font-bold sm:text-2xl ${color}`}>{value}</div>
                                <p className="text-[10px] text-neutral-400 sm:text-xs">
                                    <span className="sm:hidden">
                                        {Icon === Users ? `of ${employees.length} staff` : Icon === Sun ? 'Present AM' : 'Present PM'}
                                    </span>
                                    <span className="hidden sm:inline">{sub}</span>
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Keep the existing phone cards below the desktop table breakpoint. */}
                <div className="flex min-w-0 flex-col gap-3 md:hidden" data-testid="attendance-cards">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Staff Time-In / Out Cards</span>
                        <span className="text-[11px] text-neutral-400">Tap AM / PM to toggle</span>
                    </div>

                    {employees.map((emp) => {
                        const shift = todayShifts[emp.id];
                        const amStatus = shift?.am_status;
                        const pmStatus = shift?.pm_status;
                        const amKey = `${emp.id}-am`;
                        const pmKey = `${emp.id}-pm`;
                        const anyLoad = loadingKey !== null;
                        const halfDays = (isWorked(amStatus) ? 0.5 : 0) + (isWorked(pmStatus) ? 0.5 : 0);
                        const rate = Number(emp.daily_rate);
                        const earned = rate * halfDays;
                        const fullDay = isWorked(amStatus) && isWorked(pmStatus);
                        const halfDay = isWorked(amStatus) !== isWorked(pmStatus);
                        const isAbsent = amStatus === 'absent' && pmStatus === 'absent';
                        const unset = (!amStatus || amStatus === 'unrecorded') && (!pmStatus || pmStatus === 'unrecorded');
                        const empAdj = adjustments?.[emp.id];

                        return (
                            <div
                                key={`mobile-emp-${emp.id}`}
                                className="space-y-3 rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
                            >
                                {/* Employee Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white shadow-xs">
                                            {emp.first_name?.[0]}
                                            {emp.last_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm leading-snug font-bold [overflow-wrap:anywhere] text-neutral-900 dark:text-neutral-100">
                                                {emp.last_name}, {emp.first_name}
                                            </div>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                <span className="py-0.2 inline-flex rounded bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                                    {emp.position?.title ?? 'Staff'}
                                                </span>
                                                <span className="font-mono text-[10px] text-neutral-400">{emp.employee_code}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={!isAdmin}
                                        onClick={() => handleOpenEdit(emp)}
                                        className="size-11 shrink-0 p-0 text-neutral-400 hover:text-sky-600"
                                        title="Edit Staff Information"
                                    >
                                        <Edit2 className="size-4" />
                                    </Button>
                                </div>

                                {/* Status & Daily Compensation Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800/80 dark:bg-neutral-800/50">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-neutral-500">Today:</span>
                                        {fullDay && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40">
                                                <CheckCircle2 className="size-2.5" /> Full Day
                                            </span>
                                        )}
                                        {halfDay && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-500/30 dark:bg-sky-950/40">
                                                <Clock className="size-2.5" /> Half Day
                                            </span>
                                        )}
                                        {isAbsent && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-500/30 dark:bg-rose-950/40">
                                                Absent
                                            </span>
                                        )}
                                        {unset && <span className="text-[11px] text-neutral-400">Not recorded</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-emerald-600">
                                            +&#8369;{earned.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                        <div className="text-[10px] text-neutral-400">&#8369;{rate.toLocaleString()}/day</div>
                                    </div>
                                </div>

                                {/* Large Touch AM/PM Toggle Buttons (44px target) */}
                                <div className="grid grid-cols-2 gap-2 pt-0.5">
                                    <ShiftBtn
                                        slot="am"
                                        status={amStatus}
                                        loading={loadingKey === amKey}
                                        disabled={anyLoad || resettingDate || isClosed || periodStatus === 'approved'}
                                        onClick={() => handleToggle(emp.id, 'am', amStatus)}
                                        size="lg"
                                    />
                                    <ShiftBtn
                                        slot="pm"
                                        status={pmStatus}
                                        loading={loadingKey === pmKey}
                                        disabled={anyLoad || resettingDate || isClosed || periodStatus === 'approved'}
                                        onClick={() => handleToggle(emp.id, 'pm', pmStatus)}
                                        size="lg"
                                    />
                                </div>

                                {/* Footer: CA / Others Action & Adjustment Badges */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                                    <div className="flex flex-wrap items-center gap-1">
                                        {empAdj && empAdj.additions_total > 0 && (
                                            <span className="inline-flex items-center rounded border border-emerald-500/20 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40">
                                                +&#8369;{empAdj.additions_total.toFixed(0)} Others
                                            </span>
                                        )}
                                        {empAdj && empAdj.deductions_total > 0 && (
                                            <span className="inline-flex items-center rounded border border-rose-500/20 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40">
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
                                        className="flex min-h-11 shrink-0 items-center gap-1 border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700 hover:border-amber-400 hover:text-amber-600 active:bg-amber-50 dark:border-neutral-700 dark:text-neutral-200"
                                    >
                                        <Coins className="size-3.5 text-amber-500" />
                                        <span>CA / Others</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* A scroll region keeps the complete register inside the available width. */}
                <Card
                    className="hidden w-full max-w-full overflow-hidden border-neutral-200/80 shadow-xs md:block dark:border-neutral-800"
                    data-testid="attendance-table"
                >
                    <CardHeader className="border-b border-neutral-200/80 bg-neutral-50/60 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                        <div className="flex flex-wrap items-center gap-2">
                            <Clock className="size-4 text-sky-600" />
                            <CardTitle className="text-sm font-bold">Staff Time-In/Out Register</CardTitle>
                            <span className="ml-auto text-xs text-neutral-400">Green = Present &middot; Red = Absent &middot; Uncolored = Unset</span>
                        </div>
                    </CardHeader>
                    <div
                        className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset"
                        role="region"
                        aria-label="Staff attendance register table"
                        tabIndex={0}
                    >
                        <table className="w-full min-w-[68rem] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-900/60">
                                    <th className="w-8 px-5 py-3 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase">#</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase">Employee</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase">Position</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold tracking-wider text-sky-600 uppercase">AM Shift</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold tracking-wider text-indigo-600 uppercase">PM Shift</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold tracking-wider text-neutral-500 uppercase">Status</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold tracking-wider text-emerald-600 uppercase">
                                        Payroll Impact
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {employees.map((emp, idx) => {
                                    const shift = todayShifts[emp.id];
                                    const amStatus = shift?.am_status;
                                    const pmStatus = shift?.pm_status;
                                    const amKey = `${emp.id}-am`;
                                    const pmKey = `${emp.id}-pm`;
                                    const anyLoad = loadingKey !== null;
                                    const halfDays = (isWorked(amStatus) ? 0.5 : 0) + (isWorked(pmStatus) ? 0.5 : 0);
                                    const rate = Number(emp.daily_rate);
                                    const earned = rate * halfDays;
                                    const fullDay = isWorked(amStatus) && isWorked(pmStatus);
                                    const halfDay = isWorked(amStatus) !== isWorked(pmStatus);
                                    const isAbsent = amStatus === 'absent' && pmStatus === 'absent';
                                    const unset = (!amStatus || amStatus === 'unrecorded') && (!pmStatus || pmStatus === 'unrecorded');
                                    const empAdj = adjustments?.[emp.id];
                                    return (
                                        <tr key={emp.id} className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">
                                            <td className="px-5 py-4 font-mono text-xs text-neutral-400">{idx + 1}</td>
                                            <td className="min-w-48 px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white">
                                                        {emp.first_name?.[0]}
                                                        {emp.last_name?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold [overflow-wrap:anywhere] text-neutral-900 dark:text-neutral-100">
                                                            {emp.last_name}, {emp.first_name}
                                                        </p>
                                                        <p className="font-mono text-[11px] text-neutral-400">{emp.employee_code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex max-w-full rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium [overflow-wrap:anywhere] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                                    {emp.position?.title ?? 'Staff'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <ShiftBtn
                                                    slot="am"
                                                    status={amStatus}
                                                    loading={loadingKey === amKey}
                                                    disabled={anyLoad || resettingDate || isClosed || periodStatus === 'approved'}
                                                    onClick={() => handleToggle(emp.id, 'am', amStatus)}
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <ShiftBtn
                                                    slot="pm"
                                                    status={pmStatus}
                                                    loading={loadingKey === pmKey}
                                                    disabled={anyLoad || resettingDate || isClosed || periodStatus === 'approved'}
                                                    onClick={() => handleToggle(emp.id, 'pm', pmStatus)}
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {fullDay && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40">
                                                        <CheckCircle2 className="size-3" /> Full Day
                                                    </span>
                                                )}
                                                {halfDay && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-700 ring-1 ring-sky-500/30 dark:bg-sky-950/40">
                                                        <Clock className="size-3" /> Half Day
                                                    </span>
                                                )}
                                                {isAbsent && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-500/30 dark:bg-rose-950/40">
                                                        Absent
                                                    </span>
                                                )}
                                                {unset && <span className="text-[11px] text-neutral-300 dark:text-neutral-600">&mdash;</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {halfDays > 0 ? (
                                                    <div>
                                                        <p className="font-bold text-emerald-600">
                                                            +&#8369;{earned.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-[10px] text-neutral-400">
                                                            {halfDays} day &times; &#8369;{rate.toLocaleString()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-neutral-300">&#8369;0.00</span>
                                                )}
                                                {empAdj && (empAdj.additions_total > 0 || empAdj.deductions_total > 0) && (
                                                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                                                        {empAdj.additions_total > 0 && (
                                                            <span className="inline-flex items-center rounded border border-emerald-500/20 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40">
                                                                +&#8369;{empAdj.additions_total.toFixed(0)} Others
                                                            </span>
                                                        )}
                                                        {empAdj.deductions_total > 0 && (
                                                            <span className="inline-flex items-center rounded border border-rose-500/20 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40">
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
                                                        className="flex min-h-11 items-center gap-1 border-neutral-300 px-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-amber-400 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-200 dark:hover:text-amber-400"
                                                        title="Record Cash Advance (CA) or Allowance/Others"
                                                    >
                                                        <Coins className="size-3.5 text-amber-500" />
                                                        <span>CA / Others</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!isAdmin}
                                                        onClick={() => handleOpenEdit(emp)}
                                                        className="size-11 shrink-0 p-0 text-neutral-400 hover:text-sky-600"
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
                                <tr className="border-t-2 border-neutral-200 bg-neutral-50/80 font-bold dark:border-neutral-700 dark:bg-neutral-900/60">
                                    <td colSpan={3} className="px-5 py-3 text-right text-xs tracking-wider text-neutral-500 uppercase">
                                        Today&apos;s Total
                                    </td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-sky-600">{presentAm} AM</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-indigo-600">{presentPm} PM</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-emerald-600">{totalPresent} Present</td>
                                    <td className="px-5 py-3 text-center text-xs font-bold text-emerald-600">
                                        +&#8369;{grandImpact.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 bg-neutral-50/40 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-900/30">
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                            <Wallet className="size-3.5 shrink-0 text-emerald-500" />
                            <span>
                                Auto-synced to <strong className="text-neutral-700 dark:text-neutral-300">Payroll Period {periodCode}</strong>. Each
                                toggle instantly recalculates the{' '}
                                <a href={payrollUrl} className="font-medium text-sky-600 hover:underline">
                                    Weekly Payroll
                                </a>
                                .
                            </span>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-3 text-[11px] text-neutral-400">
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2.5 rounded bg-emerald-500" /> Present
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2.5 rounded bg-rose-500" /> Absent
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2.5 rounded bg-neutral-200 dark:bg-neutral-700" /> Unset
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            Edit Staff: {editingEmployee?.first_name} {editingEmployee?.last_name}
                        </DialogTitle>
                        <DialogDescription>Update daily rate, assigned position, or employment status.</DialogDescription>
                    </DialogHeader>

                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-800/40 dark:bg-amber-950/30">
                        <span className="font-medium text-amber-800 dark:text-amber-300">Need to record a Cash Advance or Allowance?</span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const emp = editingEmployee;
                                setEditingEmployee(null);
                                if (emp) handleOpenAdjustment(emp);
                            }}
                            className="h-7 shrink-0 border-amber-300 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:text-amber-300"
                        >
                            Open Adjustments
                        </Button>
                    </div>

                    <form onSubmit={submitEdit} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                            <Button type="button" variant="outline" className="h-10 w-full sm:w-auto" onClick={() => setEditingEmployee(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="h-10 w-full bg-sky-600 text-white hover:bg-sky-500 sm:w-auto"
                            >
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Cash Advance & "OTHERS" Adjustment Dialog */}
            <Dialog open={!!selectedEmpForAdjustment} onOpenChange={(open) => !open && setSelectedEmpForAdjustment(null)}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Coins className="size-5 text-amber-500" />
                            Payroll Adjustments: {selectedEmpForAdjustment?.first_name} {selectedEmpForAdjustment?.last_name}
                        </DialogTitle>
                        <DialogDescription>
                            Record Cash Advances (CA) or "OTHERS" allowances for {periodCode}. Automatically syncs to Weekly Payroll.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                        <button
                            type="button"
                            onClick={() => setAdjustmentCategory('deduction')}
                            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all ${
                                adjustmentCategory === 'deduction'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300'
                            }`}
                        >
                            <Minus className="size-3.5" /> Cash Advance / Deduction
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjustmentCategory('addition')}
                            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all ${
                                adjustmentCategory === 'addition'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300'
                            }`}
                        >
                            <Plus className="size-3.5" /> "OTHERS" / Allowance
                        </button>
                    </div>

                    <form onSubmit={handleAdjustmentSubmit} className="space-y-4 py-2">
                        {adjustmentCategory === 'deduction' ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="deduction_type">Deduction Type</Label>
                                    <select
                                        id="deduction_type"
                                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                        value={adjustmentForm.data.deduction_type}
                                        onChange={(e) => adjustmentForm.setData('deduction_type', e.target.value)}
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
                                        onChange={(e) => adjustmentForm.setData('amount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="adjustment_desc">Reason / Reference</Label>
                                    <Input
                                        id="adjustment_desc"
                                        placeholder="e.g. Approved cash advance by owner"
                                        value={adjustmentForm.data.description}
                                        onChange={(e) => adjustmentForm.setData('description', e.target.value)}
                                    />
                                </div>
                                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full sm:w-auto"
                                        onClick={() => setSelectedEmpForAdjustment(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={adjustmentForm.processing}
                                        className="h-10 w-full bg-rose-600 text-white hover:bg-rose-500 sm:w-auto"
                                    >
                                        {adjustmentForm.processing ? 'Saving...' : 'Apply CA Deduction'}
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
                                        onChange={(e) => adjustmentForm.setData('addition_type', e.target.value)}
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
                                        onChange={(e) => adjustmentForm.setData('amount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="addition_desc">Reason / Reference</Label>
                                    <Input
                                        id="addition_desc"
                                        placeholder="e.g. Purchased supplies, extra duties"
                                        value={adjustmentForm.data.description}
                                        onChange={(e) => adjustmentForm.setData('description', e.target.value)}
                                    />
                                </div>
                                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full sm:w-auto"
                                        onClick={() => setSelectedEmpForAdjustment(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={adjustmentForm.processing}
                                        className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
                                    >
                                        {adjustmentForm.processing ? 'Saving...' : 'Apply Allowance / OTHERS'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </form>

                    {/* Active Cycle Adjustments Breakdown */}
                    {selectedEmpForAdjustment && adjustments?.[selectedEmpForAdjustment.id] && (
                        <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                            <h4 className="mb-2 text-xs font-bold tracking-wider text-neutral-500 uppercase">Recorded for Cycle {periodCode}:</h4>
                            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                                {adjustments[selectedEmpForAdjustment.id].deductions?.map((d) => (
                                    <div
                                        key={`d-${d.id}`}
                                        className="flex items-center justify-between rounded border border-rose-200/60 bg-rose-50/50 p-2 text-xs dark:border-rose-900/30 dark:bg-rose-950/20"
                                    >
                                        <div>
                                            <span className="font-bold text-rose-700 capitalize dark:text-rose-400">
                                                {d.deduction_type.replace('_', ' ')}
                                            </span>
                                            {d.description && <span className="ml-1.5 text-[11px] text-neutral-500">&middot; {d.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-rose-600">-₱{Number(d.amount).toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDeduction(d.id)}
                                                className="cursor-pointer p-0.5 text-neutral-400 hover:text-rose-600"
                                                title="Delete this deduction"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {adjustments[selectedEmpForAdjustment.id].additions?.map((a) => (
                                    <div
                                        key={`a-${a.id}`}
                                        className="flex items-center justify-between rounded border border-emerald-200/60 bg-emerald-50/50 p-2 text-xs dark:border-emerald-900/30 dark:bg-emerald-950/20"
                                    >
                                        <div>
                                            <span className="font-bold text-emerald-700 uppercase dark:text-emerald-400">{a.addition_type}</span>
                                            {a.description && <span className="ml-1.5 text-[11px] text-neutral-500">&middot; {a.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600">+₱{Number(a.amount).toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAddition(a.id)}
                                                className="cursor-pointer p-0.5 text-neutral-400 hover:text-emerald-600"
                                                title="Delete this allowance"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {!adjustments[selectedEmpForAdjustment.id].deductions?.length &&
                                    !adjustments[selectedEmpForAdjustment.id].additions?.length && (
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
