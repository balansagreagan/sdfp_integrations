<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected $appends = [
        'user_type',
    ];

    public function getUserTypeAttribute(): string
    {
        if ($this->role === 'admin') {
            return 'admin';
        }

        $positionTitle = strtolower($this->employee?->position?->title ?? '');

        if (str_contains($positionTitle, 'lifeguard')) {
            return 'lifeguard';
        }

        return 'staff';
    }

    public function isAdmin(): bool
    {
        return $this->user_type === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->user_type === 'staff';
    }

    public function isLifeguard(): bool
    {
        return $this->user_type === 'lifeguard';
    }

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'recorded_by');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'recorded_by');
    }
}
