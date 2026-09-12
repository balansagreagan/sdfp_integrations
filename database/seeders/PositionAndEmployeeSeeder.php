<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;

class PositionAndEmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $positions = [
            [
                'title' => 'Supervisor',
                'base_daily_rate' => 500.00,
                'description' => 'Park supervisor and operations head',
            ],
            [
                'title' => 'Lifeguard',
                'base_daily_rate' => 400.00,
                'description' => 'Water park safety, water rescue, and supervision on the inflatables',
            ],
            [
                'title' => 'Office Staff',
                'base_daily_rate' => 450.00,
                'description' => 'Front desk reception, booking entries, and record-keeping',
            ],
            [
                'title' => 'Cashier',
                'base_daily_rate' => 400.00,
                'description' => 'Point of sale operations and ticket counter drawer handling',
            ],
            [
                'title' => 'Utility',
                'base_daily_rate' => 350.00,
                'description' => 'Park sanitation, equipment maintenance, and dock support',
            ],
        ];

        $createdPositions = [];
        foreach ($positions as $pos) {
            $createdPositions[$pos['title']] = Position::firstOrCreate(
                ['title' => $pos['title']],
                $pos
            );
        }

        $staffUser = User::where('email', 'staff@sdfp.ph')->first();
        $cashierUser = User::where('email', 'cashier@sdfp.ph')->first();

        $employees = [
            [
                'employee_code' => 'EMP-001',
                'first_name' => 'Johanna',
                'last_name' => 'Montealto',
                'contact_number' => '09171234567',
                'position_id' => $createdPositions['Office Staff']->id,
                'daily_rate' => 450.00,
                'user_id' => $staffUser?->id,
                'status' => 'active',
                'hired_date' => '2025-01-10',
            ],
            [
                'employee_code' => 'EMP-002',
                'first_name' => 'Michael',
                'last_name' => 'Villanueva',
                'contact_number' => '09189876543',
                'position_id' => $createdPositions['Lifeguard']->id,
                'daily_rate' => 400.00,
                'user_id' => null,
                'status' => 'active',
                'hired_date' => '2025-02-01',
            ],
            [
                'employee_code' => 'EMP-003',
                'first_name' => 'Ryan',
                'last_name' => 'Catane',
                'contact_number' => '09204567890',
                'position_id' => $createdPositions['Lifeguard']->id,
                'daily_rate' => 400.00,
                'user_id' => null,
                'status' => 'active',
                'hired_date' => '2025-02-15',
            ],
            [
                'employee_code' => 'EMP-004',
                'first_name' => 'Aileen',
                'last_name' => 'Suarez',
                'contact_number' => '09192345678',
                'position_id' => $createdPositions['Cashier']->id,
                'daily_rate' => 400.00,
                'user_id' => $cashierUser?->id,
                'status' => 'active',
                'hired_date' => '2025-03-01',
            ],
            [
                'employee_code' => 'EMP-005',
                'first_name' => 'Danilo',
                'last_name' => 'Gumera',
                'contact_number' => '09228765432',
                'position_id' => $createdPositions['Utility']->id,
                'daily_rate' => 350.00,
                'user_id' => null,
                'status' => 'active',
                'hired_date' => '2025-01-15',
            ],
        ];

        foreach ($employees as $emp) {
            Employee::firstOrCreate(
                ['employee_code' => $emp['employee_code']],
                $emp
            );
        }
    }
}
