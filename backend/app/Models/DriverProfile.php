<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverProfile extends Model
{
    public const AVAILABILITIES = ['available', 'on_delivery', 'off_duty'];

    protected $fillable = [
        'user_id',
        'zone_id',
        'availability',
        'vehicle',
        'vehicle_plate',
        'national_id',
        'completed_orders',
        'rating',
        'notes',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'completed_orders' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'zone_id');
    }
}
