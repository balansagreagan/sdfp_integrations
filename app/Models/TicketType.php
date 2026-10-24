<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketType extends Model
{
    use HasFactory;

    public const RETIRED_CHILD_RATE_CODES = ['KIDDIE-2HR'];

    public const RETIRED_RATE_CODES = [...self::RETIRED_CHILD_RATE_CODES, 'FREE-BROCHURE'];

    public const CATEGORIES = [
        'admission' => 'Admission Tickets', 'ticket_meal' => 'Ticket + Meal (1 person)', 'ticket_bilao' => 'Ticket + Bilao',
        'ticket_cajun' => 'Ticket + Cajun', 'ticket_stk' => 'Ticket + STK',
        'water_fun' => 'Water Fun Package', 'day_tour' => 'Day Tour Package',
        'overnight' => 'Overnight Package', 'two_days_one_night' => '2D 1N Package',
    ];

    protected $fillable = [
        'category', 'variant_name', 'pricing_basis', 'duration_label', 'description',
        'min_pax', 'max_pax', 'included_pax',
        'child_pricing', 'child_price',
        'code',
        'name',
        'duration_hours',
        'price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'child_price' => 'decimal:2',
            'duration_hours' => 'integer',
            'is_active' => 'boolean',
            'min_pax' => 'integer', 'max_pax' => 'integer', 'included_pax' => 'integer',
        ];
    }

    public function bookingItems(): HasMany
    {
        return $this->hasMany(BookingItem::class);
    }
}
