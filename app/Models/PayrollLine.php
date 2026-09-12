<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'daily_rate_snapshot',
        'days_worked',
        'total_ot_hours',
        'hourly_ot_rate',
        'gross_pay',
        'additions_total',
        'deductions_total',
        'net_pay',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'daily_rate_snapshot' => 'decimal:2',
            'days_worked' => 'decimal:2',
            'total_ot_hours' => 'decimal:2',
            'hourly_ot_rate' => 'decimal:2',
            'gross_pay' => 'decimal:2',
            'additions_total' => 'decimal:2',
            'deductions_total' => 'decimal:2',
            'net_pay' => 'decimal:2',
        ];
    }

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(PayrollDeduction::class);
    }

    public function additions(): HasMany
    {
        return $this->hasMany(PayrollAddition::class);
    }
}
