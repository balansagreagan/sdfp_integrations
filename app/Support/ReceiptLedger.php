<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class ReceiptLedger
{
    public static function query(): Builder
    {
        return DB::table('booking_payments')->select('paid_on', 'amount', 'payment_method');
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
