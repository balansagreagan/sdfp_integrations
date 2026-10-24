<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SalesSummary
{
    public function between(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $payments = DB::table('booking_payments')->where('paid_on', '>=', $start->toDateString())->where('paid_on', '<', $end->addDay()->toDateString())
            ->selectRaw('DATE(paid_on) as report_date, SUM(amount) as receipts, COUNT(*) as payment_count')->groupByRaw('DATE(paid_on)')->get()->keyBy('report_date');
        $bookings = DB::table('bookings')->where('status', '!=', 'cancelled')
            ->where('transaction_date', '>=', $start->toDateString())->where('transaction_date', '<', $end->addDay()->toDateString())
            ->selectRaw("DATE(transaction_date) as report_date, COUNT(*) as bookings, SUM(total_pax) as guests, SUM(CASE WHEN pricing_status = 'pending' THEN 1 ELSE 0 END) as pending_quotes, SUM(CASE WHEN pricing_status = 'pending' THEN 0 ELSE gross_amount END) as confirmed_charges")
            ->groupByRaw('DATE(transaction_date)')->get()->keyBy('report_date');
        $days = [];
        for ($day = $start; $day->lte($end); $day = $day->addDay()) {
            $date = $day->toDateString();
            $receipt = $payments->get($date);
            $booking = $bookings->get($date);
            $days[] = [
                'date' => $date,
                'receipts' => Money::decimal(Money::cents($receipt?->receipts ?? 0)),
                'payment_count' => (int) ($receipt?->payment_count ?? 0),
                'confirmed_charges' => Money::decimal(Money::cents($booking?->confirmed_charges ?? 0)),
                'bookings' => (int) ($booking?->bookings ?? 0),
                'guests' => (int) ($booking?->guests ?? 0),
                'pending_quotes' => (int) ($booking?->pending_quotes ?? 0),
            ];
        }

        return [
            'start' => $start->toDateString(), 'end' => $end->toDateString(), 'days' => $days,
            'totals' => [
                'receipts' => Money::decimal(array_sum(array_map(fn ($day) => Money::cents($day['receipts']), $days))),
                'confirmed_charges' => Money::decimal(array_sum(array_map(fn ($day) => Money::cents($day['confirmed_charges']), $days))),
                'bookings' => array_sum(array_column($days, 'bookings')),
                'guests' => array_sum(array_column($days, 'guests')),
                'pending_quotes' => array_sum(array_column($days, 'pending_quotes')),
                'payment_count' => array_sum(array_column($days, 'payment_count')),
            ],
        ];
    }
}
