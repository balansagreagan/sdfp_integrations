<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'allocated_time_slot_start',
        'allocated_time_slot_end',
        'total_pax',
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
            'subtotal_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'gross_amount' => 'decimal:2',
            'total_pax' => 'integer',
        ];
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

    public function wristbandAllocations(): HasMany
    {
        return $this->hasMany(WristbandAllocation::class);
    }
}
