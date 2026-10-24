<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $appends = ['stock_status', 'shortage_quantity', 'estimated_purchase_cost'];

    public function getStockStatusAttribute(): string
    {
        $stock = (int) round((float) $this->quantity_in_stock * 1000);
        $minimum = (int) round((float) $this->min_threshold * 1000);

        return match (true) {
            $stock === 0 => 'out_of_stock',
            $stock < $minimum => 'low_stock',
            $stock === $minimum => 'at_minimum',
            default => 'in_stock',
        };
    }

    public function getShortageQuantityAttribute(): float
    {
        return max(0, (int) round((float) $this->min_threshold * 1000) - (int) round((float) $this->quantity_in_stock * 1000)) / 1000;
    }

    public function getEstimatedPurchaseCostAttribute(): ?float
    {
        return $this->unit_cost === null ? null : round($this->shortage_quantity * (float) $this->unit_cost, 2);
    }

    protected $fillable = [
        'item_code',
        'inventory_location',
        'name',
        'category',
        'quantity_in_stock',
        'min_threshold',
        'unit',
        'unit_cost',
        'condition_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_in_stock' => 'decimal:3',
            'min_threshold' => 'decimal:3',
            'unit_cost' => 'decimal:2',
        ];
    }
}
