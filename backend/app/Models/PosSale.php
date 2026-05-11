<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSale extends Model
{
    public const STATUSES = ['completed', 'voided'];

    public const PAYMENT_METHODS = ['cash', 'mobile_money', 'card'];

    protected $fillable = [
        'sale_number',
        'session_id',
        'cashier_id',
        'customer_id',
        'subtotal',
        'discount_amount',
        'total',
        'payment_method',
        'amount_paid',
        'change_given',
        'points_earned',
        'status',
        'voided_by',
        'voided_at',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'change_given' => 'decimal:2',
        'points_earned' => 'integer',
        'voided_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'completed',
        'payment_method' => 'cash',
        'discount_amount' => 0,
        'change_given' => 0,
        'points_earned' => 0,
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(PosSession::class, 'session_id');
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PosSaleItem::class, 'sale_id');
    }

    public static function nextNumber(): string
    {
        $prefix = 'POS-'.now()->format('ymd').'-';
        $last = static::where('sale_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('sale_number');
        $seq = $last ? ((int) substr($last, -3) + 1) : 1;

        return $prefix.str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
    }
}
