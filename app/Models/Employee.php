<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_code',
        'first_name',
        'last_name',
        'contact_number',
        'position_id',
        'daily_rate',
        'user_id',
        'status',
        'hired_date',
    ];

    protected function casts(): array
    {
        return [
            'daily_rate' => 'decimal:2',
            'hired_date' => 'date',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendanceShifts(): HasMany
    {
        return $this->hasMany(AttendanceShift::class);
    }

    public function payrollLines(): HasMany
    {
        return $this->hasMany(PayrollLine::class);
    }
}
