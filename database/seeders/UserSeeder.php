<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default Admin account
        User::firstOrCreate(
            ['email' => 'admin@sdfp.ph'],
            [
                'name' => 'SDFP Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
                'last_login_at' => now(),
            ]
        );

        // Default Staff account
        User::firstOrCreate(
            ['email' => 'staff@sdfp.ph'],
            [
                'name' => 'Desk Staff - Johanna',
                'password' => Hash::make('password'),
                'role' => 'staff',
                'status' => 'active',
                'last_login_at' => now(),
            ]
        );

        // Additional Staff account
        User::firstOrCreate(
            ['email' => 'cashier@sdfp.ph'],
            [
                'name' => 'Frontdesk Cashier',
                'password' => Hash::make('password'),
                'role' => 'staff',
                'status' => 'active',
                'last_login_at' => now(),
            ]
        );
    }
}
