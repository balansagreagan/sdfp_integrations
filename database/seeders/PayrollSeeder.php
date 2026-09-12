<?php

namespace Database\Seeders;

use App\Models\AttendanceShift;
use App\Models\Employee;
use App\Models\PayrollDeduction;
use App\Models\PayrollLine;
use App\Models\PayrollPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PayrollSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminUser = User::where('role', 'admin')->first() ?? User::first();
        $staffUser = User::where('email', 'staff@sdfp.ph')->first() ?? User::first();

        // 1. Create Weekly Payroll Period
        $startOfWeek = Carbon::now()->startOfWeek(); // Monday
        $endOfWeek = Carbon::now()->endOfWeek();     // Sunday
        $periodCode = 'PR-' . $startOfWeek->format('Y') . '-W' . $startOfWeek->weekOfYear;

        $payrollPeriod = PayrollPeriod::firstOrCreate(
            ['period_code' => $periodCode],
            [
                'start_date' => $startOfWeek->toDateString(),
                'end_date' => $endOfWeek->toDateString(),
                'status' => 'prepared',
                'prepared_by' => $staffUser->id,
                'prepared_at' => now()->subHours(4),
                'reviewed_by' => $adminUser->id,
                'reviewed_at' => now()->subHours(2),
                'approved_by' => $adminUser->id,
                'approved_at' => now()->subHour(),
                'notes' => 'Weekly operational payroll covering Monday to Sunday staff shifts.',
            ]
        );

        $employees = Employee::with('position')->get();

        foreach ($employees as $emp) {
            // Generate 7 days of AM/PM shift logs
            $daysWorkedCount = 0.0;
            $totalOtHours = 0.0;

            for ($i = 0; $i < 7; $i++) {
                $currentDay = $startOfWeek->copy()->addDays($i);

                // Simulate Sunday as day off for some, or present for lifeguards
                $isSunday = ($i === 6);
                $isOff = ($isSunday && $emp->position?->title === 'Office Staff');

                $amStatus = $isOff ? 'day_off' : 'present';
                $pmStatus = $isOff ? 'day_off' : 'present';
                $ot = (!$isOff && $i === 5) ? 2.0 : 0.0; // 2 hours OT on Saturday

                AttendanceShift::firstOrCreate(
                    [
                        'employee_id' => $emp->id,
                        'work_date' => $currentDay->toDateString(),
                    ],
                    [
                        'payroll_period_id' => $payrollPeriod->id,
                        'am_status' => $amStatus,
                        'pm_status' => $pmStatus,
                        'ot_hours' => $ot,
                        'recorded_by' => $staffUser->id,
                    ]
                );

                if ($amStatus === 'present') $daysWorkedCount += 0.5;
                if ($pmStatus === 'present') $daysWorkedCount += 0.5;
                $totalOtHours += $ot;
            }

            // Calculations
            $dailyRate = $emp->daily_rate;
            $hourlyOtRate = ($dailyRate / 8) * 1.25; // 125% regular hourly rate for OT
            $regularGross = $dailyRate * $daysWorkedCount;
            $otPay = $hourlyOtRate * $totalOtHours;
            $totalGross = round($regularGross + $otPay, 2);

            // Deductions
            $deductionsTotal = 0.0;
            $payrollLine = PayrollLine::firstOrCreate(
                [
                    'payroll_period_id' => $payrollPeriod->id,
                    'employee_id' => $emp->id,
                ],
                [
                    'daily_rate_snapshot' => $dailyRate,
                    'days_worked' => $daysWorkedCount,
                    'total_ot_hours' => $totalOtHours,
                    'hourly_ot_rate' => round($hourlyOtRate, 2),
                    'gross_pay' => $totalGross,
                    'deductions_total' => 0.00,
                    'net_pay' => $totalGross,
                    'remarks' => "Base: ₱{$dailyRate}/day x {$daysWorkedCount} days + {$totalOtHours}h OT",
                ]
            );

            // Add sample cash advance deduction for EMP-002 (Lifeguard Michael)
            if ($emp->employee_code === 'EMP-002') {
                $advance = 200.00;
                PayrollDeduction::firstOrCreate(
                    [
                        'payroll_line_id' => $payrollLine->id,
                        'deduction_type' => 'cash_advance',
                    ],
                    [
                        'description' => 'Mid-week cash advance request',
                        'amount' => $advance,
                    ]
                );
                $deductionsTotal += $advance;
                $payrollLine->update([
                    'deductions_total' => $deductionsTotal,
                    'net_pay' => $totalGross - $deductionsTotal,
                ]);
            }
        }
    }
}
