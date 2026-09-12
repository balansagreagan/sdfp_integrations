<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RealStaffSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure positions exist
        $lifeguard = Position::firstOrCreate(
            ['title' => 'Lifeguard'],
            ['base_daily_rate' => 400.00, 'description' => 'Certified water safety lifeguard']
        );
        $officeStaff = Position::firstOrCreate(
            ['title' => 'Office Staff'],
            ['base_daily_rate' => 350.00, 'description' => 'Administrative and front desk support']
        );
        $officeUtility = Position::firstOrCreate(
            ['title' => 'Office Staff/Utility'],
            ['base_daily_rate' => 300.00, 'description' => 'Office staff and general utility']
        );

        // Remove old dummy employees and their related records
        $dummyIds = Employee::whereNotIn('last_name', ['Agias', 'Ajias', 'Atig', 'Malubay', 'Dela Cerna'])
            ->pluck('id')
            ->toArray();

        if (!empty($dummyIds)) {
            \App\Models\AttendanceShift::whereIn('employee_id', $dummyIds)->delete();
            \App\Models\PayrollLine::whereIn('employee_id', $dummyIds)->delete();
            Employee::whereIn('id', $dummyIds)->delete();
        }

        // Real staff from the payroll register image
        $staffList = [
            [
                'last_name'   => 'Agias',
                'first_name'  => 'Audie',
                'position_id' => $lifeguard->id,
                'daily_rate'  => 500.00,
                'email'       => 'audie.agias@sdfp.ph',
            ],
            [
                'last_name'   => 'Ajias',
                'first_name'  => 'Reymar',
                'position_id' => $lifeguard->id,
                'daily_rate'  => 400.00,
                'email'       => 'reymar.ajias@sdfp.ph',
            ],
            [
                'last_name'   => 'Atig',
                'first_name'  => 'Roel',
                'position_id' => $lifeguard->id,
                'daily_rate'  => 350.00,
                'email'       => 'roel.atig@sdfp.ph',
            ],
            [
                'last_name'   => 'Malubay',
                'first_name'  => 'Ethel',
                'position_id' => $officeUtility->id,
                'daily_rate'  => 300.00,
                'email'       => 'ethel.malubay@sdfp.ph',
            ],
            [
                'last_name'   => 'Dela Cerna',
                'first_name'  => 'Anna Jane',
                'position_id' => $officeStaff->id,
                'daily_rate'  => 350.00,
                'email'       => 'annajane.delacerna@sdfp.ph',
            ],
        ];

        foreach ($staffList as $index => $staff) {
            // Create user account for each employee
            $user = User::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'name'     => $staff['first_name'] . ' ' . $staff['last_name'],
                    'password' => Hash::make('sdfp2026'),
                    'role'     => 'staff',
                    'status'   => 'active',
                ]
            );

            // Create or update employee record
            Employee::updateOrCreate(
                ['last_name' => $staff['last_name'], 'first_name' => $staff['first_name']],
                [
                    'employee_code' => 'SDFP-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                    'position_id'   => $staff['position_id'],
                    'daily_rate'    => $staff['daily_rate'],
                    'user_id'       => $user->id,
                    'status'        => 'active',
                    'hired_date'    => '2026-01-01',
                ]
            );

            $this->command->info("✓ {$staff['first_name']} {$staff['last_name']} — {$staff['email']} (password: sdfp2026)");
        }

        $this->command->info('');
        $this->command->info('All 5 real staff members seeded with user accounts.');
        $this->command->info('Default password for all staff: sdfp2026');
    }
}
