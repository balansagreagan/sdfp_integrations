<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\BrochureCoupon;
use App\Models\TicketType;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class BrochureProgramme
{
    public const OFFERS = [
        'free_all_day' => ['label' => 'Free all-day play — up to 7 persons (one use)', 'count' => 1, 'scope' => 'free', 'percent' => 0],
        'bogo_all_day' => ['label' => 'Buy 1 take 1 — all-day play', 'count' => 3, 'scope' => 'admission', 'percent' => 0],
        'water_rides' => ['label' => '10% off water rides', 'count' => 2, 'scope' => 'water_rides', 'percent' => 10],
        'restaurant' => ['label' => '5% off SOAKED restaurant', 'count' => 2, 'scope' => 'restaurant', 'percent' => 5],
        'bogo_drinks' => ['label' => 'Buy 1 take 1 — drink bundles', 'count' => 2, 'scope' => 'drink_bundle', 'percent' => 0],
        'hotel' => ['label' => '10% off hotel accommodation', 'count' => 2, 'scope' => 'hotel', 'percent' => 10],
        'tour' => ['label' => '10% off tour packages', 'count' => 2, 'scope' => 'day_tour', 'percent' => 10],
        'two_days_one_night' => ['label' => '10% off 2 days / 1 night package', 'count' => 2, 'scope' => 'two_days_one_night', 'percent' => 10],
        'ticket_meal' => ['label' => '10% off ticket + meal', 'count' => 2, 'scope' => 'ticket_meal', 'percent' => 10],
    ];

    public function available(int $id, string $visit, string $departure, string $reservationDate, ?Booking $booking = null): BrochureCoupon
    {
        $coupon = BrochureCoupon::with('brochure')->lockForUpdate()->findOrFail($id);
        if ($coupon->state !== 'unused' && (! $booking || $coupon->booking_id !== $booking->id)) {
            $this->invalid('This coupon is already reserved or redeemed. Choose an unused coupon.');
        }
        if ($coupon->brochure->expires_on->toDateString() < max($visit, $departure) || $coupon->brochure->expires_on->isBefore(today())) {
            $this->invalid('This brochure is valid only through August 31, 2028.');
        }
        if (CarbonImmutable::parse($visit)->lt(CarbonImmutable::parse($reservationDate)->addDays(2))) {
            $this->invalid('Brochure reservations must be booked at least 2 days before the visit.');
        }
        if ($coupon->brochure->purchased_on->toDateString() > $reservationDate) {
            $this->invalid('The brochure purchase date cannot be after the reservation date.');
        }

        return $coupon;
    }

    public function discount(BrochureCoupon $coupon, TicketType $ticket, int $pax, array $items, array $addons): int
    {
        $offer = self::OFFERS[$coupon->type];
        $package = array_sum(array_map(fn ($item) => Money::cents($item['line_total']), $items));
        if ($coupon->type === 'free_all_day') {
            if ($ticket->code !== 'FREE-BROCHURE' || $pax > 7) {
                $this->invalid('The free all-day coupon covers up to 7 guests in one visit. Select Free Tickets Brochure.');
            }

            return $package;
        }
        if ($ticket->code === 'FREE-BROCHURE') {
            $this->invalid('Free Tickets Brochure requires the free all-day coupon. Other coupons cannot be combined with free admission.');
        }
        if ($coupon->type === 'bogo_all_day') {
            if ($ticket->code !== 'ALL-DAY' || $pax < 2) {
                $this->invalid('Buy 1 take 1 admission requires All Day Pass and at least 2 guests. One coupon gives one complimentary admission.');
            }

            return Money::cents($ticket->price);
        }
        if (in_array($offer['scope'], ['day_tour', 'two_days_one_night', 'ticket_meal'], true)) {
            if ($ticket->category !== $offer['scope']) {
                $this->invalid('This coupon does not apply to the selected package.');
            }

            return intdiv($package * $offer['percent'] + 50, 100);
        }
        $eligible = array_values(array_filter($addons, fn ($row) => $row['brochure_scope'] === $offer['scope'] && ! $row['is_included']));
        if ($eligible === []) {
            $this->invalid('Add a matching catalogue item for this coupon. Included meals and custom items do not qualify for an additional discount.');
        }
        if ($coupon->type === 'bogo_drinks') {
            if (count($eligible) !== 1 || (float) $eligible[0]['quantity'] < 2 || (float) $eligible[0]['quantity'] !== (float) (int) $eligible[0]['quantity']) {
                $this->invalid('For buy 1 take 1 drinks, add one drink-bundle line with a whole-number quantity of at least 2. One bundle is complimentary.');
            }

            return Money::cents($eligible[0]['unit_price']);
        }
        $eligibleCents = array_sum(array_map(fn ($row) => Money::cents($row['line_total']), $eligible));

        return intdiv($eligibleCents * $offer['percent'] + 50, 100);
    }

    public function reserve(BrochureCoupon $coupon, Booking $booking, bool $presented): void
    {
        $used = in_array($booking->status, ['checked_in', 'completed'], true);
        if ($used && ! $presented) {
            $this->invalid('Confirm that the physical brochure and coupon were presented before redemption.');
        }
        $coupon->update(['booking_id' => $booking->id, 'state' => $used ? 'used' : 'reserved', 'redeemed_at' => $used ? now() : null]);
    }

    public function changeStatus(Booking $booking, string $status, bool $presented): void
    {
        if (! $booking->brochure_coupon_id) {
            return;
        }
        $coupon = BrochureCoupon::with('brochure')->lockForUpdate()->findOrFail($booking->brochure_coupon_id);
        if ($coupon->state === 'used') {
            if ($coupon->booking_id !== $booking->id) {
                $this->invalid('This coupon has already been redeemed on another booking.');
            }

            return;
        }
        if ($status === 'cancelled') {
            // A repeated cancellation must not release a coupon since reserved by someone else.
            if ($coupon->booking_id === $booking->id) {
                $coupon->update(['state' => 'unused', 'booking_id' => null]);
            }

            return;
        }
        $coupon = $this->available($coupon->id, $booking->playtime_date->toDateString(), $booking->visit_end_date->toDateString(), $booking->transaction_date->toDateString(), $booking);
        if ($coupon->state === 'unused') {
            $coupon->update(['state' => 'reserved', 'booking_id' => $booking->id]);
        }
        if (in_array($status, ['checked_in', 'completed'], true)) {
            if (! $presented) {
                $this->invalid('The physical brochure and coupon must be presented. No brochure, no discount.');
            }
            if ($coupon->brochure->expires_on->isBefore(today())) {
                $this->invalid('This brochure has expired.');
            }
            $coupon->update(['state' => 'used', 'redeemed_at' => now()]);
        }
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['brochure_coupon_id' => $message]);
    }
}
