<?php

namespace App\Http\Controllers;

use App\Models\AttendanceShift;
use App\Models\Employee;
use App\Models\OperatingDayClosure;
use App\Models\PayrollLine;
use App\Models\PayrollPeriod;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the Daily Time-In/Out page.
     */
    public function index(Request $request): Response
    {
        abort_unless(in_array($request->user()->user_type, ['admin', 'staff'], true), 403);
        $request->validate(['work_area' => ['nullable', 'in:park,soaked']]);
        $workArea = $request->query('work_area', 'park');
        $selectedDateParam = $request->query('date');
        try {
            $parsedDate = $selectedDateParam ? Carbon::parse($selectedDateParam) : Carbon::today();
        } catch (\Exception $e) {
            $parsedDate = Carbon::today();
        }

        $selectedDate = $parsedDate->toDateString();
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $currentPeriod = PayrollPeriod::findOrCreateForDate($selectedDate);
        $isClosed = OperatingDayClosure::whereDate('work_date', $selectedDate)->exists();

        $employeesQuery = Employee::with('position')->where('status', 'active')->where('work_area', $workArea)->orderBy('last_name');

        $employees = $employeesQuery->get();

        // Shifts for the selected date
        $todayShifts = [];
        $shifts = AttendanceShift::where('payroll_period_id', $currentPeriod->id)
            ->whereDate('work_date', $selectedDate)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get();

        foreach ($shifts as $shift) {
            $todayShifts[$shift->employee_id] = [
                'am_status' => $shift->am_status,
                'pm_status' => $shift->pm_status,
                'ot_hours' => (float) $shift->ot_hours,
            ];
        }

        // Build 7-day week calendar metadata for the week strip
        $startOfWeek = $parsedDate->copy()->startOfWeek(); // Monday
        $endOfWeek = $parsedDate->copy()->endOfWeek();     // Sunday
        $weekShifts = AttendanceShift::where('payroll_period_id', $currentPeriod->id)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->whereDate('work_date', '>=', $startOfWeek->toDateString())
            ->whereDate('work_date', '<=', $endOfWeek->toDateString())
            ->get();

        $weekDays = [];
        for ($i = 0; $i < 7; $i++) {
            $d = $startOfWeek->copy()->addDays($i);
            $dStr = $d->toDateString();
            $dShifts = $weekShifts->filter(function ($s) use ($dStr) {
                return $s->work_date instanceof \Carbon\Carbon
                    ? $s->work_date->toDateString() === $dStr
                    : str_starts_with((string) $s->work_date, $dStr);
            });
            $presentCount = $dShifts->filter(function ($s) {
                return in_array($s->am_status, ['present', 'timed_out'], true)
                    || in_array($s->pm_status, ['present', 'timed_out'], true);
            })->count();

            $weekDays[] = [
                'date' => $dStr,
                'dayName' => $d->format('D'),
                'dayNum' => $d->format('d'),
                'monthName' => $d->format('M'),
                'isToday' => $dStr === Carbon::today()->toDateString(),
                'isSelected' => $dStr === $selectedDate,
                'presentCount' => $presentCount,
                'shiftsCount' => $dShifts->count(),
            ];
        }

        $positions = $isAdmin ? \App\Models\Position::orderBy('base_daily_rate', 'desc')->get() : [];

        $lines = PayrollLine::with(['additions', 'deductions'])
            ->where('payroll_period_id', $currentPeriod->id)
            ->get()
            ->keyBy('employee_id');

        $adjustments = [];
        foreach ($employees as $emp) {
            $line = $lines->get($emp->id);
            $adjustments[$emp->id] = [
                'payroll_line_id' => $line?->id,
                'additions_total' => (float) ($line?->additions_total ?? 0),
                'deductions_total' => (float) ($line?->deductions_total ?? 0),
                'additions' => $line?->additions ?? [],
                'deductions' => $line?->deductions ?? [],
            ];
        }

        return Inertia::render('attendance/index', [
            'employees' => $employees,
            'positions' => $positions,
            'todayShifts' => $todayShifts,
            'currentPeriodId' => $currentPeriod->id,
            'periodCode' => $currentPeriod->period_code,
            'periodStatus' => $currentPeriod->status,
            'isClosed' => $isClosed,
            'adjustments' => $adjustments,
            'today' => $selectedDate,
            'actualToday' => Carbon::today()->toDateString(),
            'weekDays' => $weekDays,
            'prevWeekDate' => $startOfWeek->copy()->subWeek()->toDateString(),
            'nextWeekDate' => $startOfWeek->copy()->addWeek()->toDateString(),
            'prevDayDate' => $parsedDate->copy()->subDay()->toDateString(),
            'nextDayDate' => $parsedDate->copy()->addDay()->toDateString(),
            'weekLabel' => $startOfWeek->format('M d') . ' – ' . $endOfWeek->format('M d, Y'),
            'isAdmin' => $isAdmin,
            'workArea' => $workArea,
        ]);
    }

    /** Record manual AM/PM attendance and recalculate the employee's payroll. */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(in_array($request->user()->user_type, ['admin', 'staff'], true), 403, 'Only staff and administrators can record attendance.');
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'work_area' => ['required', 'in:park,soaked'],
            'shift_slot' => ['required', 'in:am,pm'],
            'status' => ['required', 'in:present,absent,day_off,unrecorded'],
            'action' => ['prohibited'],
            'work_date' => ['required', 'date_format:Y-m-d'],
        ]);
        $employee = Employee::findOrFail($validated['employee_id']);
        abort_unless($employee->status === 'active' && $employee->work_area === $validated['work_area'], 422, 'Select an active employee from the selected business.');
        $period = PayrollPeriod::findOrCreateForDate($validated['work_date']);

        if ($period->status === 'approved') {
            return back()->with('error', 'This payroll period is approved. Unlock it before changing attendance.');
        }
        if (OperatingDayClosure::whereDate('work_date', $validated['work_date'])->exists()) {
            return back()->with('error', 'Operations are closed for this date. Re-open the date before recording attendance.');
        }

        DB::transaction(function () use ($request, $validated, $period) {
            $shift = AttendanceShift::where('payroll_period_id', $period->id)
                ->where('employee_id', $validated['employee_id'])
                ->whereDate('work_date', $validated['work_date'])
                ->first() ?? new AttendanceShift([
                'payroll_period_id' => $period->id,
                'employee_id' => $validated['employee_id'],
                'work_date' => $validated['work_date'],
            ]);
            $shift->{$validated['shift_slot'].'_status'} = $validated['status'];
            $shift->recorded_by = $request->user()->id;
            $shift->save();
            $this->recalculatePayrollLine($period->id, (int) $validated['employee_id']);
        });

        return back()->with('success', 'Manual attendance saved. Payroll updated.');
    }

    /** Close or re-open a date. Closing also removes any attendance already recorded that day. */
    public function toggleOperatingDay(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only administrators can change operating status.');

        $validated = $request->validate([
            'work_date' => ['required', 'date'],
            'is_closed' => ['required', 'boolean'],
        ]);

        $period = PayrollPeriod::findOrCreateForDate($validated['work_date']);
        if ($period->status === 'approved') {
            return redirect()->back()->with('error', 'This payroll period is approved. Unlock it before changing operating status.');
        }

        if ($validated['is_closed']) {
            OperatingDayClosure::updateOrCreate(
                ['work_date' => $validated['work_date']],
                ['closed_by' => $request->user()->id]
            );
            $cleared = $this->resetDateAttendance($period->id, $validated['work_date']);
            return redirect()->back()->with('success', "Operations closed. {$cleared} attendance record(s) were cleared and payroll was recalculated.");
        }

        OperatingDayClosure::whereDate('work_date', $validated['work_date'])->delete();
        return redirect()->back()->with('success', 'Operations opened. Staff can record manual attendance for this date.');
    }

    /** Clear all time-in/out records for a selected date and recalculate affected payroll lines. */
    public function resetDate(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only administrators can reset attendance.');

        $validated = $request->validate([
            'work_date' => ['required', 'date_format:Y-m-d'],
            'work_area' => ['required', 'in:park,soaked'],
        ]);

        $period = PayrollPeriod::findOrCreateForDate($validated['work_date']);
        if ($period->status === 'approved') {
            return redirect()->back()->with('error', 'This payroll period is approved. Unlock it before resetting attendance.');
        }

        $cleared = $this->resetDateAttendance($period->id, $validated['work_date'], $validated['work_area']);
        $business = $validated['work_area'] === 'soaked' ? 'Soaked' : 'SDFP';
        $dateLabel = Carbon::parse($validated['work_date'])->format('M d, Y');

        return redirect()->back()->with('success', "{$cleared} {$business} attendance record(s) reset for {$dateLabel}. Payroll recalculated. Other dates, allowances and deductions were kept.");
    }

    private function resetDateAttendance(int $periodId, string $workDate, ?string $workArea = null): int
    {
        return DB::transaction(function () use ($periodId, $workDate, $workArea) {
            $query = AttendanceShift::where('payroll_period_id', $periodId)
                ->whereDate('work_date', $workDate)
                ->when($workArea !== null, fn ($q) => $q->whereHas('employee', fn ($employees) => $employees->where('work_area', $workArea)));
            $employeeIds = (clone $query)->pluck('employee_id')->unique()->values();
            $cleared = $query->delete();

            foreach ($employeeIds as $employeeId) {
                $this->recalculatePayrollLine($periodId, (int) $employeeId);
            }

            return $cleared;
        });
    }

    private function isWorked(?string $status): bool
    {
        return in_array($status, ['present', 'timed_out'], true);
    }

    private function recalculatePayrollLine(int $periodId, int $employeeId): void
    {
        $emp = Employee::findOrFail($employeeId);
        $shifts = AttendanceShift::where('payroll_period_id', $periodId)
            ->where('employee_id', $employeeId)
            ->get();

        $daysWorked = 0.0;
        $totalOt = 0.0;

        foreach ($shifts as $s) {
            if ($this->isWorked($s->am_status)) {
                $daysWorked += 0.5;
            }
            if ($this->isWorked($s->pm_status)) {
                $daysWorked += 0.5;
            }
            $totalOt += (float) $s->ot_hours;
        }

        $hourlyOtRate = ($emp->daily_rate / 8) * 1.25;
        $regularGross = $emp->daily_rate * $daysWorked;
        $otPay = $hourlyOtRate * $totalOt;
        $gross = round($regularGross + $otPay, 2);

        $line = PayrollLine::firstOrNew([
            'payroll_period_id' => $periodId,
            'employee_id' => $employeeId,
        ]);

        $deductions = $line->exists ? (float) $line->deductions()->sum('amount') : 0.0;
        $additions = $line->exists ? (float) $line->additions()->sum('amount') : 0.0;
        $net = max(0, $gross + $additions - $deductions);

        $line->daily_rate_snapshot = $emp->daily_rate;
        $line->days_worked = $daysWorked;
        $line->total_ot_hours = $totalOt;
        $line->hourly_ot_rate = round($hourlyOtRate, 2);
        $line->gross_pay = $gross;
        $line->additions_total = $additions;
        $line->deductions_total = $deductions;
        $line->net_pay = $net;
        $line->remarks = "PHP{$emp->daily_rate}/day x {$daysWorked}d + {$totalOt}h OT";
        $line->save();
    }
}
