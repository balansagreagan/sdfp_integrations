<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Support\Money;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_reference',
        'guest_id',
        'transaction_date',
        'playtime_date',
        'visit_end_date',
        'allocated_time_slot_start',
        'allocated_time_slot_end',
        'total_pax',
        'adult_count', 'child_count', 'child_unit_price', 'package_amount', 'pricing_status',
        'food_serving_time', 'promotion_reference',
        'child_ages', 'child_policy',
        'subtotal_amount',
        'discount_amount',
        'gross_amount',
        'payment_method',
        'status',
        'remarks',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'playtime_date' => 'date',
            'visit_end_date' => 'date',
            'subtotal_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'gross_amount' => 'decimal:2',
            'total_pax' => 'integer',
            'adult_count' => 'integer', 'child_count' => 'integer',
            'child_unit_price' => 'decimal:2', 'package_amount' => 'decimal:2',
            'child_ages' => 'array', 'child_policy' => 'array',
        ];
    }

    protected $appends = ['amount_paid', 'balance_due', 'known_balance_due', 'payment_status'];

    public function payments(): HasMany
    {
        return $this->hasMany(BookingPayment::class)->orderBy('paid_on')->orderBy('id');
    }

    public function getAmountPaidAttribute(): string
    {
        $paid = $this->relationLoaded('payments') ? $this->payments->sum('amount') : $this->payments()->sum('amount');
        return Money::decimal(Money::cents($paid));
    }

    public function getBalanceDueAttribute(): ?string
    {
        return $this->pricing_status === 'pending' ? null : $this->known_balance_due;
    }

    public function getKnownBalanceDueAttribute(): string
    {
        return Money::decimal(max(0, Money::cents($this->gross_amount) - Money::cents($this->amount_paid)));
    }

    public function getPaymentStatusAttribute(): string
    {
        if ($this->pricing_status === 'pending') return 'pending_quote';
        if (Money::cents($this->balance_due) === 0) return 'paid';
        return Money::cents($this->amount_paid) > 0 ? 'partial' : 'unpaid';
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BookingItem::class);
    }

    public function addons(): HasMany
    {
        return $this->hasMany(BookingAddon::class);
    }

    public function wristbandAllocations(): HasMany
    {
        return $this->hasMany(WristbandAllocation::class);
    }
}
