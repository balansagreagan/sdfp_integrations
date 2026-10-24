<?php

namespace App\Support;

class Money
{
    public static function cents(string|int|float|null $value): int
    {
        return (int) round((float) $value * 100);
    }

    public static function decimal(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
