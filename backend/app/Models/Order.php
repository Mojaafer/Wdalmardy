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
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'discount_amount' => 'decimal:2',
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
