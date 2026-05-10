<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    public const TIERS = [
        ['key' => 'bronze', 'label' => 'برونزي', 'min' => 0, 'color' => '#a16207'],
        ['key' => 'silver', 'label' => 'فضي', 'min' => 500, 'color' => '#94a3b8'],
        ['key' => 'gold', 'label' => 'ذهبي', 'min' => 2000, 'color' => '#eab308'],
        ['key' => 'platinum', 'label' => 'بلاتيني', 'min' => 10000, 'color' => '#7c3aed'],
    ];

    protected $fillable = [
        'name',
        'phone',
        'email',
        'city',
        'addresses',
        'is_blocked',
        'total_orders',
        'total_spent',
        'loyalty_points',
        'lifetime_points',
    ];

    protected $casts = [
        'addresses' => 'array',
        'is_blocked' => 'boolean',
        'total_spent' => 'decimal:2',
        'loyalty_points' => 'integer',
        'lifetime_points' => 'integer',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function pointMovements(): HasMany
    {
        return $this->hasMany(CustomerPointMovement::class);
    }

    public function tier(): array
    {
        $points = (int) $this->lifetime_points;
        $tier = self::TIERS[0];
        foreach (self::TIERS as $t) {
            if ($points >= $t['min']) {
                $tier = $t;
            }
        }

        return $tier;
    }

    /**
     * Award points to this customer (positive = earn, negative = redeem/adjust).
     * Increments balance and (only for positive deltas) lifetime_points so that
     * spending points doesn't downgrade tier.
     */
    public function awardPoints(int $points, string $type, ?int $orderId = null, ?string $reason = null, ?int $userId = null): CustomerPointMovement
    {
        $this->loyalty_points = max(0, (int) $this->loyalty_points + $points);
        if ($points > 0) {
            $this->lifetime_points = (int) $this->lifetime_points + $points;
        }
        $this->save();

        return CustomerPointMovement::create([
            'customer_id' => $this->id,
            'order_id' => $orderId,
            'user_id' => $userId,
            'type' => $type,
            'points' => $points,
            'balance_after' => $this->loyalty_points,
            'reason' => $reason,
        ]);
    }
}
