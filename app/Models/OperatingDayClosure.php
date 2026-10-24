<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperatingDayClosure extends Model
{
    use HasFactory;

    protected $fillable = ['work_date', 'closed_by', 'notes'];

    protected function casts(): array
    {
        return ['work_date' => 'date'];
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
