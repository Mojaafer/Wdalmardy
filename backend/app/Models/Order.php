<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'customer_name',
        'customer_phone',
        'customer_email',
        'address_state',
        'address_district',
        'address_details',
        'delivery_method',
        'payment_method',
        'status',
        'subtotal',
        'delivery_fee',
        'total',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public static function generateOrderNumber(): string
    {
        return 'WD-'.now()->format('ymd').str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    }
}
