<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guest;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ImportedBookingSeeder extends Seeder
{
    public function run(): void
    {
        $reservations = json_decode(file_get_contents(__DIR__.'/data/imported-bookings.json'), true, flags: JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($reservations) {
            $admin = User::where('role', 'admin')->where('status', 'active')->firstOrFail();

            foreach ($reservations as $entry) {
                // Preserve bookings already imported locally, including subsequent staff edits.
                if (Booking::where('booking_reference', $entry['booking']['booking_reference'])
                    ->orWhere('remarks', 'like', $entry['marker'].'%')->exists()) {
                    continue;
                }

                $guest = Guest::firstOrCreate(['contact_number' => $entry['guest']['contact_number']], $entry['guest']);

                if ($guest->full_name !== $entry['guest']['full_name'] || $guest->address !== $entry['guest']['address']) {
                    throw new RuntimeException('Review conflicting guest details before seeding '.$entry['booking']['booking_reference']);
                }

                if (Booking::where('guest_id', $guest->id)->whereDate('playtime_date', $entry['booking']['playtime_date'])->exists()) {
                    throw new RuntimeException('Review the existing reservation before seeding '.$entry['booking']['booking_reference']);
                }

                $offer = collect($entry['items'])->contains('ticket_code', 'FREE-BROCHURE') ? 'free_all_day' : null;
                $booking = Booking::create([...$entry['booking'], 'brochure_offer' => $offer, 'guest_id' => $guest->id, 'recorded_by' => $admin->id]);

                foreach ($entry['items'] as $item) {
                    $ticket = TicketType::where('code', $item['ticket_code'])->firstOrFail();
                    unset($item['ticket_code']);
                    $booking->items()->create([...$item, 'ticket_type_id' => $ticket->id]);
                }

                // Included meals remain zero-priced; unquoted food remains pending.
                $booking->addons()->createMany($entry['addons']);
                foreach ($entry['payments'] as $payment) {
                    $booking->payments()->create([...$payment, 'recorded_by' => $admin->id]);
                }
            }
        });
    }
}
