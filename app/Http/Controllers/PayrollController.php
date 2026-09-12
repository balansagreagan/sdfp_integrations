<?php

namespace App\Http\Controllers;

use App\Models\AttendanceShift;
use App\Models\Employee;
use App\Models\PayrollAddition;
use App\Models\PayrollDeduction;
use App\Models\PayrollLine;
use App\Models\PayrollPeriod;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    /**
     * Display weekly payroll register, shift attendance grid, and payouts.
     */
    public function index(Request $request): Response
    {
        $periodId = $request->query('period_id');
        $periodCode = $request->query('period');
        $dateParam = $request->query('date');

        $query = PayrollPeriod::with([
            'preparedByUser:id,name',
            'reviewedByUser:id,name',
            'approvedByUser:id,name',
            'payrollLines.employee.position',
            'payrollLines.deductions',
            'payrollLines.additions',
            'attendanceShifts.employee',
        ]);

        if ($periodId) {
            $currentPeriod = $query->find($periodId);
        } elseif ($periodCode) {
            $currentPeriod = $query->where('period_code', $periodCode)->first();
        } elseif ($dateParam) {
            $period = PayrollPeriod::findOrCreateForDate($dateParam);
            $currentPeriod = $query->find($period->id);
        } else {
            $period = PayrollPeriod::findOrCreateForDate(Carbon::today());
            $currentPeriod = $query->find($period->id);
        }

        if (! $currentPeriod) {
            $period = PayrollPeriod::findOrCreateForDate(Carbon::today());
            $currentPeriod = $query->find($period->id);
        }

        $allPeriods = PayrollPeriod::orderBy('start_date', 'desc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'period_code' => $p->period_code,
                'start_date' => $p->start_date->toDateString(),
                'end_date' => $p->end_date->toDateString(),
                'status' => $p->status,
                'label' => $p->period_code . ' (' . $p->start_date->format('M d') . ' – ' . $p->end_date->format('M d, Y') . ')',
            ];
        });

        $startDate = Carbon::parse($currentPeriod->start_date);
        $prevWeekDate = $startDate->copy()->subWeek()->toDateString();
        $nextWeekDate = $startDate->copy()->addWeek()->toDateString();

        $employees = Employee::with('position')->where('status', 'active')->get();

        // Calculate period totals
        $totalGross      = (float) $currentPeriod->payrollLines->sum('gross_pay');
        $totalAdditions  = (float) $currentPeriod->payrollLines->sum('additions_total');
        $totalDeductions = (float) $currentPeriod->payrollLines->sum('deductions_total');
        $totalNet        = (float) $currentPeriod->payrollLines->sum('net_pay');
        $totalOtHours    = (float) $currentPeriod->payrollLines->sum('total_ot_hours');

        // Build shifts grid: [ employee_id => [ 'YYYY-MM-DD' => [ am_status, pm_status, ot_hours ] ] ]
        $shiftsGrid = [];
        foreach ($currentPeriod->attendanceShifts as $shift) {
            $dateKey = Carbon::parse($shift->work_date)->toDateString();
            $shiftsGrid[$shift->employee_id][$dateKey] = [
                'am_status' => $shift->am_status,
                'pm_status' => $shift->pm_status,
                'ot_hours'  => (float) $shift->ot_hours,
            ];
        }

        // Generate ordered list of dates in the period (Monday to Sunday)
        $periodDates = [];
        $cursor = Carbon::parse($currentPeriod->start_date);
        $end    = Carbon::parse($currentPeriod->end_date);
        while ($cursor->lte($end)) {
            $periodDates[] = $cursor->toDateString();
            $cursor->addDay();
        }

        return Inertia::render('payroll/index', [
            'period'        => $currentPeriod,
            'allPeriods'    => $allPeriods,
            'prevWeekDate'  => $prevWeekDate,
            'nextWeekDate'  => $nextWeekDate,
            'currentWeekDate' => Carbon::today()->toDateString(),
            'employees'     => $employees,
            'shiftsGrid'    => $shiftsGrid,
            'periodDates'   => $periodDates,
            'stats'         => [
                'totalGross'      => $totalGross,
                'totalAdditions'  => $totalAdditions,
                'totalDeductions' => $totalDeductions,
                'totalNet'        => $totalNet,
                'totalOtHours'    => $totalOtHours,
            ],
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    /**
     * Toggle shift attendance (AM/PM) or update OT hours.
     */
    public function toggleShift(Request $request): RedirectResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Only administrators can manage employee attendance.');
        }

        $validated = $request->validate([
            'payroll_period_id' => ['required', 'exists:payroll_periods,id'],
            'employee_id' => ['required', 'exists:employees,id'],
            'work_date' => ['required', 'date'],
            'shift_slot' => ['required', 'string', 'in:am,pm'],
            'status' => ['required', 'string', 'in:present,absent,day_off'],
        ]);

        $shift = AttendanceShift::firstOrNew([
            'payroll_period_id' => $validated['payroll_period_id'],
            'employee_id' => $validated['employee_id'],
            'work_date' => $validated['work_date'],
        ]);

        if ($validated['shift_slot'] === 'am') {
            $shift->am_status = $validated['status'];
        } else {
            $shift->pm_status = $validated['status'];
        }

        $shift->recorded_by = $request->user()->id;
        $shift->save();

        // Recompute payroll line for this employee
        $this->recalculatePayrollLine($validated['payroll_period_id'], $validated['employee_id']);

        return redirect()->back()->with('success', 'Attendance shift updated.');
    }

    /**
     * Helper to find or initialize a payroll line for adjustments.
     */
    private function resolvePayrollLine(array $validated): PayrollLine
    {
        if (!empty($validated['payroll_line_id'])) {
            return PayrollLine::findOrFail($validated['payroll_line_id']);
        }

        $employeeId = $validated['employee_id'];
        $periodId = $validated['payroll_period_id'] ?? PayrollPeriod::findOrCreateForDate(Carbon::today())->id;

        $line = PayrollLine::firstOrNew([
            'payroll_period_id' => $periodId,
            'employee_id' => $employeeId,
        ]);

        if (!$line->exists) {
            $emp = Employee::findOrFail($employeeId);
            $line->daily_rate_snapshot = $emp->daily_rate;
            $line->days_worked = 0.00;
            $line->total_ot_hours = 0.00;
            $line->hourly_ot_rate = round(($emp->daily_rate / 8) * 1.25, 2);
            $line->gross_pay = 0.00;
            $line->additions_total = 0.00;
            $line->deductions_total = 0.00;
            $line->net_pay = 0.00;
            $line->remarks = "Initialized via adjustment";
            $line->save();
        }

        return $line;
    }

    /**
     * Add a deduction to an employee's payroll line.
     */
    public function addDeduction(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payroll_line_id' => ['nullable', 'exists:payroll_lines,id'],
            'employee_id' => ['nullable', 'exists:employees,id'],
            'payroll_period_id' => ['nullable', 'exists:payroll_periods,id'],
            'deduction_type' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        if (empty($validated['payroll_line_id']) && empty($validated['employee_id'])) {
            return redirect()->back()->with('error', 'Either payroll_line_id or employee_id is required.');
        }

        $line = $this->resolvePayrollLine($validated);

        if ($line->payrollPeriod->status === 'approved') {
            return redirect()->back()->with('error', 'Cannot add deductions to an approved payroll period.');
        }

        PayrollDeduction::create([
            'payroll_line_id' => $line->id,
            'deduction_type' => $validated['deduction_type'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
        ]);

        // Recompute line deductions
        $totalDeductions = $line->deductions()->sum('amount');
        $net = max(0, $line->gross_pay + $line->additions_total - $totalDeductions);

        $line->update([
            'deductions_total' => $totalDeductions,
            'net_pay' => $net,
        ]);

        return redirect()->back()->with('success', 'Deduction recorded successfully.');
    }

    /**
     * Add an addition to an employee's payroll line.
     */
    public function addAddition(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payroll_line_id' => ['nullable', 'exists:payroll_lines,id'],
            'employee_id' => ['nullable', 'exists:employees,id'],
            'payroll_period_id' => ['nullable', 'exists:payroll_periods,id'],
            'addition_type' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        if (empty($validated['payroll_line_id']) && empty($validated['employee_id'])) {
            return redirect()->back()->with('error', 'Either payroll_line_id or employee_id is required.');
        }

        $line = $this->resolvePayrollLine($validated);

        if ($line->payrollPeriod->status === 'approved') {
            return redirect()->back()->with('error', 'Cannot add allowances to an approved payroll period.');
        }

        PayrollAddition::create([
            'payroll_line_id' => $line->id,
            'addition_type' => $validated['addition_type'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
        ]);

        // Recompute line additions
        $totalAdditions = $line->additions()->sum('amount');
        $net = max(0, $line->gross_pay + $totalAdditions - $line->deductions_total);

        $line->update([
            'additions_total' => $totalAdditions,
            'net_pay' => $net,
        ]);

        return redirect()->back()->with('success', 'Addition/Allowance recorded successfully.');
    }

    /**
     * Remove a deduction.
     */
    public function destroyDeduction(PayrollDeduction $deduction): RedirectResponse
    {
        $line = $deduction->payrollLine;
        if ($line->payrollPeriod->status === 'approved') {
            return redirect()->back()->with('error', 'Cannot modify an approved payroll period.');
        }

        $deduction->delete();

        $totalDeductions = $line->deductions()->sum('amount');
        $net = max(0, $line->gross_pay + $line->additions_total - $totalDeductions);

        $line->update([
            'deductions_total' => $totalDeductions,
            'net_pay' => $net,
        ]);

        return redirect()->back()->with('success', 'Deduction deleted and payroll line recomputed.');
    }

    /**
     * Remove an addition.
     */
    public function destroyAddition(PayrollAddition $addition): RedirectResponse
    {
        $line = $addition->payrollLine;
        if ($line->payrollPeriod->status === 'approved') {
            return redirect()->back()->with('error', 'Cannot modify an approved payroll period.');
        }

        $addition->delete();

        $totalAdditions = $line->additions()->sum('amount');
        $net = max(0, $line->gross_pay + $totalAdditions - $line->deductions_total);

        $line->update([
            'additions_total' => $totalAdditions,
            'net_pay' => $net,
        ]);

        return redirect()->back()->with('success', 'Allowance deleted and payroll line recomputed.');
    }

    /**
     * Approve the weekly payroll period (Admin only).
     */
    public function approve(Request $request, PayrollPeriod $period): RedirectResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Only administrators can approve payroll.');
        }

        $period->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', "Payroll cycle {$period->period_code} officially approved.");
    }

    /**
     * Unlock / re-open the weekly payroll period (Admin only).
     */
    public function unapprove(Request $request, PayrollPeriod $period): RedirectResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Only administrators can unlock payroll.');
        }

        $period->update([
            'status' => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        return redirect()->back()->with('success', "Payroll cycle {$period->period_code} unlocked for editing.");
    }

    /**
     * Helper to recompute an employee's payroll line from attendance shifts.
     */
    private function recalculatePayrollLine(int $periodId, int $employeeId): void
    {
        $emp = Employee::findOrFail($employeeId);
        $shifts = AttendanceShift::where('payroll_period_id', $periodId)
            ->where('employee_id', $employeeId)
            ->get();

        $daysWorked = 0.0;
        $totalOt = 0.0;

        foreach ($shifts as $s) {
            if (in_array($s->am_status, ['present', 'timed_out'], true)) $daysWorked += 0.5;
            if (in_array($s->pm_status, ['present', 'timed_out'], true)) $daysWorked += 0.5;
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
        $line->remarks = "₱{$emp->daily_rate}/day x {$daysWorked}d + {$totalOt}h OT";
        $line->save();
    }
}
