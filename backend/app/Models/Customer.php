<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Model
{
    use Auditable, HasApiTokens, HasFactory;

    public const TIERS = [
        ['key' => 'bronze', 'label' => 'برونزي', 'min' => 0, 'color' => '#a16207'],
        ['key' => 'silver', 'label' => 'فضي', 'min' => 500, 'color' => '#94a3b8'],
        ['key' => 'gold', 'label' => 'ذهبي', 'min' => 2000, 'color' => '#eab308'],
        ['key' => 'platinum', 'label' => 'بلاتيني', 'min' => 10000, 'color' => '#7c3aed'],
    ];

    public const OTP_TTL_MINUTES = 10;

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
        'otp_code',
        'otp_expires_at',
    ];

    protected $casts = [
        'addresses' => 'array',
        'is_blocked' => 'boolean',
        'total_spent' => 'decimal:2',
        'loyalty_points' => 'integer',
        'lifetime_points' => 'integer',
        'otp_expires_at' => 'datetime',
    ];

    protected $hidden = [
        'otp_code',
        'otp_expires_at',
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

    /**
     * Generate a fresh 4-digit OTP, store it with a 10-minute expiry,
     * and return the plaintext code so the caller can deliver it
     * (SMS / WhatsApp). In simplified/dev mode the caller returns it
     * directly in the API response.
     */
    public function generateOtp(): string
    {
        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        $this->forceFill([
            'otp_code' => $code,
            'otp_expires_at' => Carbon::now()->addMinutes(self::OTP_TTL_MINUTES),
        ])->save();

        return $code;
    }

    public function verifyOtp(string $code): bool
    {
        if (empty($this->otp_code) || empty($this->otp_expires_at)) {
            return false;
        }

        return hash_equals((string) $this->otp_code, $code)
            && $this->otp_expires_at->isFuture();
    }

    public function clearOtp(): void
    {
        $this->forceFill([
            'otp_code' => null,
            'otp_expires_at' => null,
        ])->save();
    }

    /**
     * Public payload returned to the storefront after login / profile fetch.
     */
    public function toAuthArray(): array
    {
        $tier = $this->tier();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'city' => $this->city,
            'addresses' => $this->addresses ?? [],
            'total_orders' => (int) $this->total_orders,
            'total_spent' => (float) $this->total_spent,
            'loyalty_points' => (int) $this->loyalty_points,
            'lifetime_points' => (int) $this->lifetime_points,
            'tier' => $tier,
        ];
    }
}
