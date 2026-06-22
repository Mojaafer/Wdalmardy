<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\EmployeeActivity;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryAdminController extends Controller
{
    public function movements(Request $request)
    {
        $query = StockMovement::query()
            ->with(['product:id,name_ar,name_en,slug', 'user:id,name', 'branch:id,name_ar'])
            ->orderByDesc('id');

        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }
        if ($productId = $request->integer('product_id')) {
            $query->where('product_id', $productId);
        }
        if ($branchId = $request->integer('branch_id')) {
            $query->where('branch_id', $branchId);
        }
        if ($q = $request->string('q')->toString()) {
            $query->whereHas('product', function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%");
            });
        }

        $perPage = (int) $request->integer('per_page', 50);
        $movements = $query->paginate($perPage);

        return response()->json([
            'data' => $movements->getCollection()->map(fn (StockMovement $m) => $this->serialize($m)),
            'meta' => [
                'total' => $movements->total(),
                'per_page' => $movements->perPage(),
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
            ],
            'stats' => $this->stats($request),
        ]);
    }

    public function lowStock(Request $request)
    {
        $threshold = (int) $request->integer('threshold', 10);
        $branchId = $request->integer('branch_id') ?: null;

        // When a branch is in context, low-stock is read from the per-branch
        // rows against their own thresholds; otherwise from the aggregate.
        if ($branchId) {
            $rows = BranchProductStock::query()
                ->where('branch_id', $branchId)
                ->whereColumn('stock', '<=', 'low_stock_threshold')
                ->whereHas('product', fn ($q) => $q->where('is_active', true))
                ->with('product:id,slug,name_ar,name_en,price,unit_ar')
                ->orderBy('stock')
                ->limit(100)
                ->get();

            return response()->json([
                'data' => $rows->map(fn (BranchProductStock $row) => [
                    'id' => $row->product->id,
                    'slug' => $row->product->slug,
                    'name_ar' => $row->product->name_ar,
                    'name_en' => $row->product->name_en,
                    'stock' => (int) $row->stock,
                    'price' => (float) $row->product->price,
                    'unit_ar' => $row->product->unit_ar,
                ]),
                'threshold' => $threshold,
                'branch_id' => $branchId,
            ]);
        }

        $products = Product::query()
            ->where('is_active', true)
            ->where('stock', '<=', $threshold)
            ->orderBy('stock')
            ->limit(100)
            ->get(['id', 'slug', 'name_ar', 'name_en', 'stock', 'price', 'unit_ar']);

        return response()->json([
            'data' => $products->map(fn (Product $p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name_ar' => $p->name_ar,
                'name_en' => $p->name_en,
                'stock' => (int) $p->stock,
                'price' => (float) $p->price,
                'unit_ar' => $p->unit_ar,
            ]),
            'threshold' => $threshold,
        ]);
    }

    public function adjust(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'type' => 'required|in:in,out,adjustment',
            'reason' => 'required|in:restock,return,damage,manual',
            'quantity' => 'required|integer',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $product = Product::findOrFail($data['product_id']);
        $branchId = (int) ($data['branch_id'] ?? Branch::defaultId());

        $movement = DB::transaction(fn () => StockMovement::record(
            $product,
            $data['type'],
            $data['reason'],
            (int) $data['quantity'],
            (int) $request->user()->id,
            'manual',
            null,
            $data['notes'] ?? null,
            $branchId,
        ));

        EmployeeActivity::log(
            (int) $request->user()->id,
            'inventory.adjust',
            'تعديل مخزون "'.$product->name_ar.'" ('.($data['type'] === 'in' ? 'إضافة' : ($data['type'] === 'out' ? 'سحب' : 'تسوية')).' '.abs((int) $data['quantity']).')',
            ['product_id' => $product->id, 'type' => $data['type'], 'quantity' => $data['quantity']],
        );

        return response()->json(['data' => $this->serialize($movement->load(['product:id,name_ar,name_en,slug', 'user:id,name']))], 201);
    }

    public function stats(?Request $request = null): array
    {
        $branchId = $request?->integer('branch_id') ?: null;

        // Per-branch stats read from branch_product_stocks; otherwise from the
        // aggregate products.stock column.
        if ($branchId) {
            $base = BranchProductStock::query()->where('branch_id', $branchId);
            $activeProducts = Product::where('is_active', true)->count();

            return [
                'total_products' => $activeProducts,
                'low_stock' => (clone $base)->whereColumn('stock', '<=', 'low_stock_threshold')->count(),
                'out_of_stock' => (clone $base)->where('stock', '<=', 0)->count(),
                'total_stock_units' => (int) (clone $base)->sum('stock'),
                'branch_id' => $branchId,
            ];
        }

        $totalProducts = Product::where('is_active', true)->count();
        $lowStock = Product::where('is_active', true)->where('stock', '<=', 10)->count();
        $outOfStock = Product::where('is_active', true)->where('stock', '<=', 0)->count();
        $totalStockUnits = (int) Product::where('is_active', true)->sum('stock');

        return [
            'total_products' => $totalProducts,
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
            'total_stock_units' => $totalStockUnits,
        ];
    }

    private function serialize(StockMovement $m): array
    {
        return [
            'id' => $m->id,
            'branch_id' => $m->branch_id,
            'branch' => $m->branch ? [
                'id' => $m->branch->id,
                'name_ar' => $m->branch->name_ar,
            ] : null,
            'type' => $m->type,
            'reason' => $m->reason,
            'quantity' => (int) $m->quantity,
            'stock_after' => (int) $m->stock_after,
            'reference_type' => $m->reference_type,
            'reference_id' => $m->reference_id,
            'notes' => $m->notes,
            'created_at' => $m->created_at?->toIso8601String(),
            'product' => $m->product ? [
                'id' => $m->product->id,
                'slug' => $m->product->slug,
                'name_ar' => $m->product->name_ar,
                'name_en' => $m->product->name_en,
            ] : null,
            'user' => $m->user ? [
                'id' => $m->user->id,
                'name' => $m->user->name,
            ] : null,
        ];
    }
}
