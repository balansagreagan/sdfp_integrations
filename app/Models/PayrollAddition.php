<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollAddition extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_line_id',
        'addition_type',
        'description',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function payrollLine(): BelongsTo
    {
        return $this->belongsTo(PayrollLine::class);
    }
}
