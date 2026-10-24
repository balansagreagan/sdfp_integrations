<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingAddon extends Model
{
    protected $fillable = ['booking_id', 'addon_item_id', 'name', 'quantity', 'unit', 'unit_price', 'line_total', 'is_included'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:2', 'unit_price' => 'decimal:2', 'line_total' => 'decimal:2', 'is_included' => 'boolean'];
    }
}
