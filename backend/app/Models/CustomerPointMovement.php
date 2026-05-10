<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPointMovement extends Model
{
    public const TYPES = ['earn', 'redeem', 'adjust', 'refund'];

    protected $fillable = [
        'customer_id',
        'order_id',
        'user_id',
        'type',
        'points',
        'balance_after',
        'reason',
    ];

    protected $casts = [
        'points' => 'integer',
        'balance_after' => 'integer',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
