<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceShift extends Model
{
    use HasFactory;

    protected $attributes = [
        'am_status' => 'unrecorded',
        'pm_status' => 'unrecorded',
    ];

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'work_date',
        'am_status',
        'pm_status',
        'ot_hours',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'ot_hours' => 'decimal:2',
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

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
