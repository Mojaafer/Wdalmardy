<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Customer extends Model
{
    use Auditable, HasFactory;

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
     * Uses an atomic UPDATE so concurrent orders cannot double-spend points:
     * the balance is read+written in a single SQL statement that also clamps
     * to zero. Lifetime points are only incremented on positive deltas so
     * that spending points doesn't downgrade tier.
     */
    public function awardPoints(int $points, string $type, ?int $orderId = null, ?string $reason = null, ?int $userId = null, bool $bumpLifetime = true): CustomerPointMovement
    {
        if ($points > 0) {
            $update = [
                'loyalty_points' => DB::raw('loyalty_points + '.(int) $points),
                'updated_at' => now(),
            ];
            if ($bumpLifetime) {
                $update['lifetime_points'] = DB::raw('lifetime_points + '.(int) $points);
            }
            DB::table('customers')
                ->where('id', $this->id)
                ->update($update);
        } else {
            DB::table('customers')
                ->where('id', $this->id)
                ->update([
                    'loyalty_points' => DB::raw('GREATEST(0, loyalty_points + ('.(int) $points.'))'),
                    'updated_at' => now(),
                ]);
        }
        $this->refresh();

        return CustomerPointMovement::create([
            'customer_id' => $this->id,
            'order_id' => $orderId,
            'user_id' => $userId,
            'type' => $type,
            'points' => $points,
            'balance_after' => (int) $this->loyalty_points,
            'reason' => $reason,
        ]);
    }
}
