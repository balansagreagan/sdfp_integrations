<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brochure extends Model
{
    public const PRICE = '499.00';

    public const EXPIRY = '2028-08-31';

    protected $fillable = ['card_number', 'guest_id', 'purchased_on', 'expires_on', 'source', 'price', 'amount_paid', 'payment_method', 'reference', 'recorded_by'];

    protected function casts(): array
    {
        return ['purchased_on' => 'date', 'expires_on' => 'date', 'price' => 'decimal:2', 'amount_paid' => 'decimal:2'];
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(BrochureCoupon::class)->orderBy('id');
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
