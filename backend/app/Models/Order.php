<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use Auditable, HasFactory;

    public const STATUSES = ['new', 'preparing', 'shipped', 'delivered', 'cancelled'];

    /**
     * 1 loyalty point per LOYALTY_EARN_RATE ج.س of the order's payable amount
     * (subtotal − discount, excludes delivery_fee + points_discount).
     */
    public const LOYALTY_EARN_RATE = 100;

    /** 1 redeemed point = LOYALTY_REDEEM_VALUE ج.س off. */
    public const LOYALTY_REDEEM_VALUE = 10;

    /** Cap point redemption at this fraction of subtotal so an order can't be zeroed out. */
    public const LOYALTY_REDEEM_CAP_PCT = 0.5;

    protected static function booted(): void
    {
        static::created(function (Order $order) {
            if (! Setting::get('notify_new_order', true)) {
                return;
            }
            AdminNotification::fire(
                type: 'order_new',
                title: 'طلب جديد '.$order->order_number,
                body: trim(($order->customer_name ?? '').' — '.number_format((float) $order->total).' ج.س'),
                payload: ['order_id' => $order->id, 'order_number' => $order->order_number, 'total' => (float) $order->total],
                link: '/admin/orders?focus='.$order->id,
            );
        });

        static::updated(function (Order $order) {
            if (! $order->wasChanged('status')) {
                return;
            }
            // award points the first time an order transitions to 'delivered'
            if ($order->status === 'delivered' && (int) $order->points_earned === 0) {
                $order->awardLoyaltyPoints();
            }
            // on cancel: refund any redeemed points and claw back any earned points
            if ($order->status === 'cancelled') {
                $order->reverseLoyaltyPoints();
            }
        });
    }

    protected $fillable = [
        'order_number',
        'branch_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'address_state',
        'address_district',
        'address_details',
        'delivery_method',
        'payment_method',
        'status',
        'assigned_driver_id',
        'subtotal',
        'delivery_fee',
        'total',
        'notes',
        'coupon_code',
        'coupon_id',
        'discount_amount',
        'delivery_zone_id',
        'points_earned',
        'points_redeemed',
        'points_discount',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'points_discount' => 'decimal:2',
        'points_earned' => 'integer',
        'points_redeemed' => 'integer',
    ];

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_driver_id');
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    /**
     * Calculate and credit loyalty points for a delivered order. Idempotent:
     * if points_earned is already > 0, this is a no-op.
     */
    public function awardLoyaltyPoints(): int
    {
        if ((int) $this->points_earned > 0 || ! $this->customer_id) {
            return 0;
        }
        // For free_shipping coupons, discount_amount holds the delivery fee
        // (which is already zeroed in delivery_fee), so don't subtract it again
        // from the product subtotal — that would under-award points.
        $couponDiscount = (float) $this->discount_amount;
        if ($this->coupon_id && $couponDiscount > 0) {
            $coupon = $this->coupon()->first();
            if ($coupon && $coupon->type === 'free_shipping') {
                $couponDiscount = 0.0;
            }
        }
        $payable = max(0, (float) $this->subtotal - $couponDiscount - (float) $this->points_discount);
        $earned = (int) floor($payable / self::LOYALTY_EARN_RATE);
        if ($earned <= 0) {
            return 0;
        }
        $customer = $this->customer()->first();
        if (! $customer) {
            return 0;
        }
        DB::transaction(function () use ($customer, $earned) {
            $customer->awardPoints($earned, 'earn', $this->id, 'طلب '.$this->order_number);
            $this->forceFill(['points_earned' => $earned])->saveQuietly();
        });

        return $earned;
    }

    /**
     * Reverse loyalty side-effects when an order is cancelled. Idempotent —
     * each side is only reversed once (the points_redeemed / points_earned
     * fields are zeroed after refund so re-running has no effect).
     *  - Redeemed points: credited back to the customer balance (without
     *    bumping lifetime, since the redemption never increased lifetime).
     *  - Earned points: clawed back from the balance only (lifetime stays so
     *    tier doesn't shift on a cancellation).
     */
    public function reverseLoyaltyPoints(): void
    {
        if (! $this->customer_id) {
            return;
        }
        $customer = $this->customer()->first();
        if (! $customer) {
            return;
        }
        $redeemed = (int) $this->points_redeemed;
        $earned = (int) $this->points_earned;
        if ($redeemed === 0 && $earned === 0) {
            return;
        }
        DB::transaction(function () use ($customer, $redeemed, $earned) {
            if ($redeemed > 0) {
                // Refund: restore the spendable balance only — lifetime_points
                // must NOT change, otherwise customers could climb tiers by
                // looping redeem-then-cancel. We zero points_redeemed for
                // idempotency. points_discount is left as-is so the order's
                // historical `total` stays consistent (subtotal - discounts +
                // fee). Re-delivering a cancelled order is blocked at the
                // controller level, so the field is purely historical.
                $customer->awardPoints($redeemed, 'refund', $this->id, 'إلغاء طلب '.$this->order_number, null, false);
                $this->forceFill(['points_redeemed' => 0])->saveQuietly();
            }
            if ($earned > 0) {
                $customer->awardPoints(-$earned, 'adjust', $this->id, 'إلغاء طلب '.$this->order_number);
                $this->forceFill(['points_earned' => 0])->saveQuietly();
            }
        });
    }

    public static function generateOrderNumber(): string
    {
        $prefix = 'WD-'.now()->format('ymd');
        $last = static::where('order_number', 'like', $prefix.'-%')
            ->orderByDesc('id')
            ->value('order_number');
        $seq = $last ? ((int) substr((string) $last, strrpos((string) $last, '-') + 1)) : 0;

        return $prefix.'-'.str_pad((string) ($seq + 1), 3, '0', STR_PAD_LEFT);
    }
}
