<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WristbandAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'color',
        'series_code',
        'start_number',
        'end_number',
        'total_allocated',
        'remarks',
        'assigned_by',
    ];

    protected function casts(): array
    {
        return [
            'start_number' => 'integer',
            'end_number' => 'integer',
            'total_allocated' => 'integer',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
