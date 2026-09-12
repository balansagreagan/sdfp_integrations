<?php

namespace Database\Seeders;

use App\Models\TicketType;
use Illuminate\Database\Seeder;

class TicketTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ticketTypes = [
            [
                'code' => 'REG-2HR',
                'name' => 'Regular Pass (2 Hours)',
                'duration_hours' => 2,
                'price' => 149.00,
                'is_active' => true,
            ],
            [
                'code' => 'ALL-DAY',
                'name' => 'All Day Pass',
                'duration_hours' => 8,
                'price' => 199.00,
                'is_active' => true,
            ],
            [
                'code' => 'KIDDIE-2HR',
                'name' => 'Kiddie Pass (2 Hours)',
                'duration_hours' => 2,
                'price' => 99.00,
                'is_active' => true,
            ],
            [
                'code' => 'HALF-DAY',
                'name' => 'Half Day Pass (4 Hours)',
                'duration_hours' => 4,
                'price' => 149.00,
                'is_active' => true,
            ],
        ];

        foreach ($ticketTypes as $tt) {
            TicketType::firstOrCreate(
                ['code' => $tt['code']],
                $tt
            );
        }
    }
}
