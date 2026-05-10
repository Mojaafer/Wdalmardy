<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

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
            // award points the first time an order transitions to 'delivered'
            if ($order->wasChanged('status') && $order->status === 'delivered' && (int) $order->points_earned === 0) {
                $order->awardLoyaltyPoints();
            }
        });
    }

    protected $fillable = [
        'order_number',
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
        $payable = max(0, (float) $this->subtotal - (float) $this->discount_amount - (float) $this->points_discount);
        $earned = (int) floor($payable / self::LOYALTY_EARN_RATE);
        if ($earned <= 0) {
            return 0;
        }
        $customer = $this->customer()->first();
        if (! $customer) {
            return 0;
        }
        $customer->awardPoints($earned, 'earn', $this->id, 'طلب '.$this->order_number);
        $this->forceFill(['points_earned' => $earned])->saveQuietly();

        return $earned;
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
