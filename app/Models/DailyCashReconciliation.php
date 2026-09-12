<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyCashReconciliation extends Model
{
    use HasFactory;

    protected $fillable = [
        'reconciliation_date',
        'opening_cash_float',
        'total_cash_sales',
        'total_digital_sales',
        'total_cash_expenses',
        'expected_cash_on_hand',
        'actual_cash_counted',
        'cash_variance',
        'status',
        'remarks',
        'closed_by',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'reconciliation_date' => 'date',
            'opening_cash_float' => 'decimal:2',
            'total_cash_sales' => 'decimal:2',
            'total_digital_sales' => 'decimal:2',
            'total_cash_expenses' => 'decimal:2',
            'expected_cash_on_hand' => 'decimal:2',
            'actual_cash_counted' => 'decimal:2',
            'cash_variance' => 'decimal:2',
        ];
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
