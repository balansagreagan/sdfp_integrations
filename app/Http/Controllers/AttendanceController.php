<?php

namespace App\Http\Controllers;

use App\Models\AttendanceShift;
use App\Models\Employee;
use App\Models\PayrollLine;
use App\Models\PayrollPeriod;
use Carbon\Carbon;
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

        $employeesQuery = Employee::with('position')->where('status', 'active')->orderBy('last_name');

        if (! $isAdmin) {
            $employeesQuery->where('user_id', $user->id);
        }

        $employees = $employeesQuery->get();

        // Shifts for the selected date
        $todayShifts = [];
        $shifts = AttendanceShift::where('payroll_period_id', $currentPeriod->id)
            ->whereDate('work_date', $selectedDate)
            ->when(! $isAdmin, fn ($q) => $q->whereIn('employee_id', $employees->pluck('id')))
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
            'currentEmployee' => $isAdmin ? null : $employees->first(),
        ]);
    }

    /**
     * Record a time-in or time-out for an employee.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'shift_slot' => ['required', 'string', 'in:am,pm'],
            'status' => ['nullable', 'string', 'in:present,absent,day_off,timed_out'],
            'action' => ['nullable', 'string', 'in:time_in,time_out,toggle'],
            'work_date' => ['nullable', 'date'],
        ]);

        $ownEmployee = Employee::where('user_id', $user->id)->first();

        if (! $isAdmin) {
            if (! $ownEmployee || (int) $validated['employee_id'] !== (int) $ownEmployee->id) {
                abort(403, 'You can only time in or time out for your own record.');
            }
        }

        $action = $validated['action'] ?? 'toggle';
        $status = $validated['status'] ?? 'present';

        if (! $isAdmin) {
            $action = in_array($action, ['time_in', 'time_out'], true) ? $action : 'time_in';
            $status = $action === 'time_out' ? 'timed_out' : 'present';
        }

        $workDate = $validated['work_date'] ?? Carbon::today()->toDateString();
        $currentPeriod = PayrollPeriod::findOrCreateForDate($workDate);

        $shift = AttendanceShift::firstOrNew([
            'payroll_period_id' => $currentPeriod->id,
            'employee_id' => $validated['employee_id'],
            'work_date' => $workDate,
        ]);

        $currentSlotStatus = $validated['shift_slot'] === 'am' ? $shift->am_status : $shift->pm_status;

        if (! $isAdmin && $action === 'time_out' && $currentSlotStatus !== 'present') {
            return redirect()->back()->with('error', 'Time in first before timing out.');
        }

        if ($validated['shift_slot'] === 'am') {
            $shift->am_status = $status;
        } else {
            $shift->pm_status = $status;
        }

        $shift->recorded_by = $user->id;
        $shift->save();

        $this->recalculatePayrollLine($currentPeriod->id, $validated['employee_id']);

        $message = $action === 'time_out'
            ? 'Timed out successfully.'
            : ($action === 'time_in' ? 'Timed in successfully.' : 'Attendance recorded successfully.');

        return redirect()->back()->with('success', $message);
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
