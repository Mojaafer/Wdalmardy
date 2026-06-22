<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill branch_product_stocks rows for any product that lacks one at the
     * main branch. This catches products added via ProductAdminController
     * (which previously created no branch rows) so that under per-branch stock
     * isolation they don't appear to have zero availability everywhere.
     *
     * The seeded stock mirrors the legacy products.stock column — i.e. the
     * product's current global inventory is assigned to the main branch.
     */
    public function up(): void
    {
        $mainBranchId = DB::table('branches')->where('is_main', true)->value('id')
            ?? DB::table('branches')->value('id');

        if (! $mainBranchId) {
            return;
        }

        $now = now();
        DB::table('products')
            ->orderBy('id')
            ->chunk(200, function ($products) use ($mainBranchId, $now) {
                $existing = DB::table('branch_product_stocks')
                    ->where('branch_id', $mainBranchId)
                    ->whereIn('product_id', $products->pluck('id'))
                    ->pluck('product_id')
                    ->all();

                $rows = [];
                foreach ($products as $product) {
                    if (in_array($product->id, $existing, true)) {
                        continue;
                    }
                    $rows[] = [
                        'branch_id' => $mainBranchId,
                        'product_id' => $product->id,
                        'stock' => (int) $product->stock,
                        'reserved_stock' => 0,
                        'low_stock_threshold' => 10,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if ($rows) {
                    DB::table('branch_product_stocks')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        // No destructive rollback — the backfill only added rows that were
        // legitimately missing. Removing them would corrupt per-branch stock.
    }
};
