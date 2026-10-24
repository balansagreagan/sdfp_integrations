<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceReport extends Model
{
    protected $fillable = ['asset_name', 'location', 'inventory_item_id', 'description', 'priority', 'status', 'reported_by', 'assigned_to', 'due_date', 'resolution_notes', 'resolved_at'];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'resolved_at' => 'datetime'];
    }

    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if (! $user->isAdmin()) {
            $query->where(fn (Builder $reports) => $reports->where('reported_by', $user->id)->orWhere('assigned_to', $user->id));
        }
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(MaintenanceUpdate::class)->orderByDesc('id');
    }
}
