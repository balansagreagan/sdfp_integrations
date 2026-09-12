<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_code',
        'start_date',
        'end_date',
        'status',
        'prepared_by',
        'prepared_at',
        'reviewed_by',
        'reviewed_at',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'prepared_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function preparedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function reviewedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attendanceShifts(): HasMany
    {
        return $this->hasMany(AttendanceShift::class);
    }

    public function payrollLines(): HasMany
    {
        return $this->hasMany(PayrollLine::class);
    }

    /**
     * Find or create the weekly payroll period covering the given date (Monday–Sunday).
     */
    public static function findOrCreateForDate(\Carbon\Carbon|string $date): self
    {
        $dateStr = is_string($date) ? \Carbon\Carbon::parse($date)->toDateString() : $date->toDateString();

        $existing = static::where('start_date', '<=', $dateStr)
            ->where('end_date', '>=', $dateStr)
            ->first();

        if ($existing) {
            return $existing;
        }

        $carbon = \Carbon\Carbon::parse($dateStr);
        $startOfWeek = $carbon->copy()->startOfWeek(); // Monday
        $endOfWeek = $carbon->copy()->endOfWeek();     // Sunday
        $periodCode = 'PR-' . $startOfWeek->format('Y') . '-W' . $startOfWeek->weekOfYear;

        return static::firstOrCreate(
            ['period_code' => $periodCode],
            [
                'start_date' => $startOfWeek->toDateString(),
                'end_date'   => $endOfWeek->toDateString(),
                'status'     => 'draft',
                'notes'      => 'Weekly operational payroll covering Monday to Sunday staff shifts.',
            ]
        );
    }
}
