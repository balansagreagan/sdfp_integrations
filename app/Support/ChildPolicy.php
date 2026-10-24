<?php

namespace App\Support;

use App\Models\TicketType;

class ChildPolicy
{
    public static function definitions(): array
    {
        $tickets = ['key' => 'tickets_2026', 'year' => 2026,
            'summary' => 'Ages 0–3: free; age 4: to confirm; ages 5+: regular rate.',
            'bands' => [
                ['min' => 0, 'max' => 3, 'percent' => 0, 'label' => 'Free'],
                ['min' => 4, 'max' => 4, 'percent' => null, 'label' => 'To confirm'],
                ['min' => 5, 'max' => null, 'percent' => 100, 'label' => 'Regular rate'],
            ]];
        $water = ['key' => 'water_fun_2026', 'year' => 2026,
            'summary' => 'Ages 0–4: free; ages 5–8: 50%; ages 9+: regular rate.',
            'bands' => [
                ['min' => 0, 'max' => 4, 'percent' => 0, 'label' => 'Free'],
                ['min' => 5, 'max' => 8, 'percent' => 50, 'label' => '50% of regular rate'],
                ['min' => 9, 'max' => null, 'percent' => 100, 'label' => 'Regular rate'],
            ]];
        $stay = ['key' => 'stay_2026', 'year' => 2026,
            'summary' => 'Ages 0–5: free; ages 6–10: 50%; ages 11+: regular rate.',
            'bands' => [
                ['min' => 0, 'max' => 5, 'percent' => 0, 'label' => 'Free'],
                ['min' => 6, 'max' => 10, 'percent' => 50, 'label' => '50% of regular rate'],
                ['min' => 11, 'max' => null, 'percent' => 100, 'label' => 'Regular rate'],
            ]];
        return ['admission' => $tickets, 'water_fun' => $water, 'overnight' => $stay, 'two_days_one_night' => $stay];
    }

    public static function forTicket(TicketType $ticket): ?array
    {
        return $ticket->pricing_basis === 'per_person' && $ticket->child_pricing === 'age_based'
            ? (self::definitions()[$ticket->category] ?? null) : null;
    }

    public static function quote(array $policy, ?int $age, string $regularPrice): array
    {
        foreach ($policy['bands'] as $band) {
            if ($age !== null && $age >= $band['min'] && ($band['max'] === null || $age <= $band['max'])) {
                return ['unit_price' => $band['percent'] === null ? null : Money::decimal(intdiv(Money::cents($regularPrice) * $band['percent'] + 50, 100)), 'label' => $band['label']];
            }
        }
        return ['unit_price' => null, 'label' => 'Age to confirm'];
    }

    // One saved line per age group. Prices use the booking's original regular rate.
    public static function items(array $policy, array $ages, string $regularPrice, array $base): array
    {
        $groups = [];
        foreach ($ages as $age) {
            $key = $age === null ? 'unknown' : (string) $age;
            if (!isset($groups[$key])) {
                $quote = self::quote($policy, $age, $regularPrice);
                $groups[$key] = [...$base, 'guest_type' => 'child', 'guest_age' => $age, 'quantity' => 0, 'unit_price' => $quote['unit_price']];
            }
            $groups[$key]['quantity']++;
        }
        return array_values($groups);
    }
}
