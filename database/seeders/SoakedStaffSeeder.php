<?php

namespace Database\Seeders;

use App\Models\AttendanceShift;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollLine;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SoakedStaffSeeder extends Seeder
{
    public function run(): void
    {
        $rates = [
            'Cashier' => 400, 'Bar & Food Prep' => 400, 'Cook' => 500,
            'Utility' => 350, 'Dishwasher' => 350, 'Runner' => 400,
        ];

        $positions = [];
        foreach ($rates as $title => $rate) {
            $positions[$title] = Position::firstOrCreate(['title' => $title], [
                'base_daily_rate' => $rate,
                'description' => "SOAKED restaurant {$title}",
            ]);
        }

        // Starting rates follow the current SDFP rate pattern and can be edited in SOAKED Staff Management.
        $roster = [
            ['SOK-001', 'MA Yang', 'Gregana', 'ma.yang.gregana@soaked.sdfp.ph', 'Cashier', 'Cashier / Food Prep', 400, '07:00', '18:00'],
            ['SOK-002', 'Tikai Bustillo', 'Catiloc', 'tikai.bustillo.catiloc@soaked.sdfp.ph', 'Bar & Food Prep', 'Bar / Food Prep', 400, '11:00', '18:00'],
            ['SOK-003', 'MJ', 'Aswe', 'mj.aswe@soaked.sdfp.ph', 'Cook', 'Cook / Food Prep', 500, '07:00', '18:00'],
            ['SOK-004', 'Chyna', 'Guia', 'chyna.guia@soaked.sdfp.ph', 'Utility', 'Dining Area / Utility', 350, '12:30', '18:00'],
            ['SOK-005', 'Jenny', 'Villarin', 'jenny.villarin@soaked.sdfp.ph', 'Dishwasher', 'Dining Maintenance / Utility / Dishwasher', 350, '07:00', '18:00'],
            ['SOK-006', 'Janryuan', 'Gregana', 'janryuan.gregana@soaked.sdfp.ph', 'Dishwasher', 'Dining Busout / Dishwasher / Runner', 350, '07:00', '18:00'],
            ['SOK-007', 'Ion', 'Falconetzz', 'ion.falconetzz@soaked.sdfp.ph', 'Runner', 'Grill Kitchen / Runner', 400, '07:00', '19:00'],
            ['SOK-008', 'Rhea Luna', 'Echavia', 'rhea.luna.echavia@soaked.sdfp.ph', 'Bar & Food Prep', 'Bar / Food Prep (Trainee)', 400, '08:00', '18:00'],
            ['SOK-009', 'Dianne Marie', 'Calapiz', 'dianne.marie.calapiz@soaked.sdfp.ph', 'Utility', 'Dining Area / Utility (Trainee)', 350, '08:00', '18:00'],
        ];

        $period = PayrollPeriod::findOrCreateForDate('2026-09-19');

        foreach ($roster as [$code, $first, $last, $email, $position, $assignment, $rate, $start, $end]) {
            $user = User::updateOrCreate(['email' => $email], [
                'name' => "{$first} {$last}",
                'password' => Hash::make('sdfp2026'),
                'role' => 'staff',
                'status' => 'active',
            ]);

            $employee = Employee::updateOrCreate(['employee_code' => $code], [
                'first_name' => $first,
                'last_name' => $last,
                'position_id' => $positions[$position]->id,
                'daily_rate' => $rate,
                'user_id' => $user->id,
                'work_area' => 'soaked',
                'soaked_assignment' => $assignment,
                'scheduled_start_time' => $start,
                'scheduled_end_time' => $end,
                'status' => 'active',
                'hired_date' => '2026-09-19',
            ]);

            AttendanceShift::updateOrCreate([
                'payroll_period_id' => $period->id,
                'employee_id' => $employee->id,
                'work_date' => '2026-09-19',
            ], [
                'am_status' => $start < '12:00' ? 'present' : 'day_off',
                'pm_status' => 'present',
            ]);

            $daysWorked = $start < '12:00' ? 1.0 : 0.5;
            PayrollLine::updateOrCreate([
                'payroll_period_id' => $period->id,
                'employee_id' => $employee->id,
            ], [
                'daily_rate_snapshot' => $rate,
                'days_worked' => $daysWorked,
                'total_ot_hours' => 0,
                'hourly_ot_rate' => round(($rate / 8) * 1.25, 2),
                'gross_pay' => $rate * $daysWorked,
                'additions_total' => 0,
                'deductions_total' => 0,
                'net_pay' => $rate * $daysWorked,
                'remarks' => "SOAKED schedule: {$assignment}, {$start}-{$end}",
            ]);
        }
    }
}
