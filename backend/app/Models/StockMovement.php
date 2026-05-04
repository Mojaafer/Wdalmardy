<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPES = ['in', 'out', 'adjustment'];

    public const REASONS = ['sale', 'return', 'restock', 'damage', 'manual'];

    protected $fillable = [
        'product_id',
        'type',
        'reason',
        'quantity',
        'stock_after',
        'reference_type',
        'reference_id',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_after' => 'integer',
        'reference_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Apply a stock movement atomically. Pass `quantity` as a positive integer for `in`,
     * positive for `out` (will be subtracted), or signed for `adjustment`.
     */
    public static function record(
        Product $product,
        string $type,
        string $reason,
        int $quantity,
        ?int $userId = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
    ): self {
        $delta = match ($type) {
            'in' => abs($quantity),
            'out' => -abs($quantity),
            'adjustment' => (int) $quantity,
            default => 0,
        };

        $product->stock = max(0, (int) $product->stock + $delta);
        $product->save();

        $movement = static::create([
            'product_id' => $product->id,
            'type' => $type,
            'reason' => $reason,
            'quantity' => $delta,
            'stock_after' => (int) $product->stock,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'user_id' => $userId,
            'notes' => $notes,
        ]);

        $threshold = (int) (Setting::get('low_stock_threshold', 10) ?? 10);
        if ($delta < 0 && $product->stock <= $threshold) {
            AdminNotification::fire(
                type: 'low_stock',
                title: 'تنبيه نفاد مخزون',
                body: ($product->name_ar ?? $product->name_en ?? '').' — متبقي '.$product->stock,
                payload: ['product_id' => $product->id, 'stock' => (int) $product->stock, 'threshold' => $threshold],
                link: '/admin/inventory',
            );
        }

        return $movement;
    }
}
