<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrochureCoupon extends Model
{
    protected $fillable = ['brochure_id', 'type', 'number', 'state', 'booking_id', 'redeemed_at'];

    protected function casts(): array
    {
        return ['redeemed_at' => 'datetime', 'number' => 'integer'];
    }

    public function brochure(): BelongsTo
    {
        return $this->belongsTo(Brochure::class);
    }
}
