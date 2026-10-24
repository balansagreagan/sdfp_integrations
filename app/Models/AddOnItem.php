<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddOnItem extends Model
{
    protected $table = 'add_on_items';

    protected $fillable = ['code', 'name', 'unit', 'price', 'is_active', 'brochure_scope'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'is_active' => 'boolean'];
    }
}
