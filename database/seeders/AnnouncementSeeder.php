<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Seeder;

class AnnouncementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first() ?? User::first();

        $announcements = [
            [
                'title' => 'Caluya Bay Marine Weather & High Tide Advisory',
                'content' => 'High tide is forecasted for 1:45 PM today with gentle swells (0.4m - 0.7m). All lifeguard stations on Tower 1 and Tower 2 must ensure safety anchor lines on the main slide are tension-checked before the 1:00 PM session.',
                'category' => 'weather_hold',
                'priority' => 'high',
                'is_active' => true,
                'author_id' => $admin->id,
            ],
            [
                'title' => 'Mandatory Guest Life Vest Inspection at Gate 1',
                'content' => 'Reminder to ticketing staff and marshals: No guest is permitted to enter the floating dock ramp without a fastened life vest, regardless of swimming ability. Ensure kiddie vests have crotch clips secured.',
                'category' => 'safety_protocol',
                'priority' => 'urgent',
                'is_active' => true,
                'author_id' => $admin->id,
            ],
            [
                'title' => 'Weekend Shift Rotation & Lifeguard Coverage',
                'content' => 'The Saturday & Sunday peak crowd roster is now active. Michael and Ryan will rotate 2-hour water surveillance shifts with 30-minute shade recovery breaks. Lunch relief will be covered by Supervisor Danilo.',
                'category' => 'shift_notice',
                'priority' => 'normal',
                'is_active' => true,
                'author_id' => $admin->id,
            ],
            [
                'title' => 'New Pink Wristband Series (7000-7999) Now Active',
                'content' => 'Front desk cashiers please note: We have transitioned to the Pink wristband roll for the 2:00 PM - 4:00 PM session. Discontinue issuing the Blue roll for afternoon check-ins.',
                'category' => 'general',
                'priority' => 'normal',
                'is_active' => true,
                'author_id' => $admin->id,
            ],
        ];

        foreach ($announcements as $ann) {
            Announcement::firstOrCreate(
                ['title' => $ann['title']],
                $ann
            );
        }
    }
}
