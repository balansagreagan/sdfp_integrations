<?php

namespace App\Support;

use App\Models\TicketType;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class BrochureProgramme
{
    public const EXPIRY = '2028-08-31';

    public const OFFERS = [
        'free_all_day' => ['label' => 'Free all-day play — up to 7 persons (one use)', 'scope' => 'free', 'percent' => 0],
        'bogo_all_day' => ['label' => 'Buy 1 take 1 — all-day play', 'scope' => 'admission', 'percent' => 0],
        'water_rides' => ['label' => '10% off water rides', 'scope' => 'water_rides', 'percent' => 10],
        'restaurant' => ['label' => '5% off SOAKED restaurant', 'scope' => 'restaurant', 'percent' => 5],
        'bogo_drinks' => ['label' => 'Buy 1 take 1 — drink bundles', 'scope' => 'drink_bundle', 'percent' => 0],
        'hotel' => ['label' => '10% off hotel accommodation', 'scope' => 'hotel', 'percent' => 10],
        'tour' => ['label' => '10% off tour packages', 'scope' => 'day_tour', 'percent' => 10],
        'two_days_one_night' => ['label' => '10% off 2 days / 1 night package', 'scope' => 'two_days_one_night', 'percent' => 10],
        'ticket_meal' => ['label' => '10% off ticket + meal', 'scope' => 'ticket_meal', 'percent' => 10],
    ];

    public function validateVisit(string $visit, string $departure, string $reservationDate): void
    {
        if (max($visit, $departure) > self::EXPIRY || today()->toDateString() > self::EXPIRY) {
            $this->invalid('This brochure offer is valid only through August 31, 2028.');
        }
        if (CarbonImmutable::parse($visit)->lt(CarbonImmutable::parse($reservationDate)->addDays(2))) {
            $this->invalid('Brochure reservations must be booked at least 2 days before the visit.');
        }
    }

    public function discount(string $type, TicketType $ticket, int $pax, array $items, array $addons): int
    {
        $offer = self::OFFERS[$type];
        $package = array_sum(array_map(fn ($item) => Money::cents($item['line_total']), $items));
        if ($type === 'free_all_day') {
            // The retired zero-priced rate is supported only when editing historical bookings.
            if (! in_array($ticket->code, ['ALL-DAY', 'FREE-BROCHURE'], true) || $pax > 7) {
                $this->invalid('The free all-day offer requires All Day Pass and covers up to 7 guests in one visit.');
            }

            return $package;
        }
        if ($ticket->code === 'FREE-BROCHURE') {
            $this->invalid('Free Tickets Brochure requires the free all-day coupon. Other coupons cannot be combined with free admission.');
        }
        if ($type === 'bogo_all_day') {
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
        if ($type === 'bogo_drinks') {
            if (count($eligible) !== 1 || (float) $eligible[0]['quantity'] < 2 || (float) $eligible[0]['quantity'] !== (float) (int) $eligible[0]['quantity']) {
                $this->invalid('For buy 1 take 1 drinks, add one drink-bundle line with a whole-number quantity of at least 2. One bundle is complimentary.');
            }

            return Money::cents($eligible[0]['unit_price']);
        }
        $eligibleCents = array_sum(array_map(fn ($row) => Money::cents($row['line_total']), $eligible));

        return intdiv($eligibleCents * $offer['percent'] + 50, 100);
    }

    public function confirmPresentation(bool $presented): void
    {
        if (! $presented) {
            $this->invalid('Confirm that the physical brochure coupon was presented before applying the offer at check-in.');
        }
        if (today()->toDateString() > self::EXPIRY) {
            $this->invalid('This brochure offer has expired.');
        }
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['brochure_offer' => $message]);
    }
}
