<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_code',
        'name',
        'category',
        'quantity_in_stock',
        'min_threshold',
        'unit',
        'condition_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_in_stock' => 'integer',
            'min_threshold' => 'integer',
        ];
    }
}
