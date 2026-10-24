<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class ReceiptLedger
{
    public static function query(): Builder
    {
        $bookings = DB::table('booking_payments')->select('paid_on', 'amount', 'payment_method');
        $brochures = DB::table('brochures')->where('source', 'sold')->selectRaw('purchased_on as paid_on, amount_paid as amount, payment_method');

        return DB::query()->fromSub($bookings->unionAll($brochures), 'receipts');
    }

    public static function total(string $date, ?string $method = null): float
    {
        $query = self::query()->whereDate('paid_on', $date);
        if ($method === 'cash') {
            $query->where('payment_method', 'cash');
        }
        if ($method === 'digital') {
            $query->where('payment_method', '!=', 'cash');
        }

        return (float) $query->sum('amount');
    }
}
