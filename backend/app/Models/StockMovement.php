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
        'branch_id',
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

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Apply a stock movement atomically.
     *
     * The per-branch row (branch_product_stocks) is the single source of
     * truth; products.stock is a derived aggregate (sum across all branches)
     * recomputed after every mutation. Pass `quantity` as a positive integer
     * for `in`, positive for `out` (will be subtracted), or signed for
     * `adjustment`.
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
        ?int $branchId = null,
    ): self {
        $branchId ??= Branch::defaultId();
        $delta = match ($type) {
            'in' => abs($quantity),
            'out' => -abs($quantity),
            'adjustment' => (int) $quantity,
            default => 0,
        };

        if (! $branchId) {
            throw new \LogicException('StockMovement::record requires a branch — no default branch is configured.');
        }

        // Per-branch row is the source of truth. A brand-new branch row seeds
        // to 0 (NOT the global stock), so a fresh branch does not silently
        // inherit the whole catalog's inventory. Populate it explicitly via an
        // inter-branch transfer or a stock adjustment instead.
        $branchStock = BranchProductStock::firstOrCreate(
            ['branch_id' => $branchId, 'product_id' => $product->id],
            ['stock' => 0, 'reserved_stock' => 0, 'low_stock_threshold' => 10],
        );
        $branchStock->stock = max(0, (int) $branchStock->stock + $delta);
        $branchStock->save();

        $stockAfter = (int) $branchStock->stock;

        // Recompute the aggregate products.stock as the sum across branches so
        // the legacy global column stays consistent with the per-branch rows.
        $aggregate = (int) BranchProductStock::query()
            ->where('product_id', $product->id)
            ->sum('stock');
        $product->stock = $aggregate;
        $product->save();

        $movement = static::create([
            'product_id' => $product->id,
            'branch_id' => $branchId,
            'type' => $type,
            'reason' => $reason,
            'quantity' => $delta,
            'stock_after' => $stockAfter,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'user_id' => $userId,
            'notes' => $notes,
        ]);

        // Low-stock alert fires on the branch row, against its own threshold.
        $threshold = (int) $branchStock->low_stock_threshold;
        if ($delta < 0 && $stockAfter <= $threshold && Setting::get('notify_low_stock', true)) {
            $branch = Branch::find($branchId);
            AdminNotification::fire(
                type: 'low_stock',
                title: 'تنبيه نفاد مخزون',
                body: ($product->name_ar ?? $product->name_en ?? '').' — متبقي '.$stockAfter.($branch ? ' ('.$branch->name_ar.')' : ''),
                payload: ['product_id' => $product->id, 'branch_id' => $branchId, 'stock' => $stockAfter, 'threshold' => $threshold],
                link: '/admin/inventory',
            );
        }

        return $movement;
    }
}
