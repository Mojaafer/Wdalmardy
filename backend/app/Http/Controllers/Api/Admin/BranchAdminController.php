<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\Order;
use App\Models\PosSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BranchAdminController extends Controller
{
    public function index()
    {
        $branches = Branch::query()
            ->withCount([
                'orders',
                'posSales',
                'productStocks as products_count' => fn ($q) => $q->where('stock', '>', 0),
            ])
            ->orderByDesc('is_main')
            ->orderBy('sort_order')
            ->orderBy('name_ar')
            ->get();

        $rows = $branches->map(fn (Branch $branch) => $this->serialize($branch));

        return response()->json([
            'data' => $rows,
            'stats' => [
                'total_branches' => $branches->count(),
                'active_branches' => $branches->where('status', 'active')->count(),
                'total_sales' => $rows->sum('sales_total'),
                'total_products' => $rows->sum('products_count'),
                'total_stock_units' => BranchProductStock::sum('stock'),
                'stock_value' => (float) BranchProductStock::query()
                    ->join('products', 'branch_product_stocks.product_id', '=', 'products.id')
                    ->sum(DB::raw('branch_product_stocks.stock * products.price')),
            ],
            'inventory' => $this->inventoryRows(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        if (! empty($data['is_main'])) {
            Branch::query()->update(['is_main' => false]);
        }

        $branch = Branch::create($data);
        $this->ensureStockRows($branch->id);

        return response()->json(['data' => $this->serialize($branch->fresh())], 201);
    }

    public function update(Request $request, Branch $branch)
    {
        $data = $this->validated($request, $branch->id);
        if (! empty($data['is_main'])) {
            Branch::query()->whereKeyNot($branch->id)->update(['is_main' => false]);
        }

        $branch->update($data);
        $this->ensureStockRows($branch->id);

        return response()->json(['data' => $this->serialize($branch->fresh())]);
    }

    public function destroy(Branch $branch)
    {
        if ($branch->is_main) {
            return response()->json(['message' => 'لا يمكن حذف الفرع الرئيسي.'], 422);
        }
        $branch->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name_ar' => ['required', 'string', 'max:120'],
            'name_en' => ['nullable', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:80', 'unique:branches,code'.($ignoreId ? ','.$ignoreId : '')],
            'manager_name' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:60'],
            'address' => ['nullable', 'string', 'max:180'],
            'city' => ['nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'in:active,paused,closed'],
            'is_main' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }

    private function serialize(Branch $branch): array
    {
        $orderSales = (float) Order::query()
            ->where('branch_id', $branch->id)
            ->where('status', '!=', 'cancelled')
            ->sum('total');
        $posSales = (float) PosSale::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'completed')
            ->sum('total');
        $stockUnits = (int) BranchProductStock::where('branch_id', $branch->id)->sum('stock');
        $stockValue = (float) BranchProductStock::query()
            ->where('branch_id', $branch->id)
            ->join('products', 'branch_product_stocks.product_id', '=', 'products.id')
            ->sum(DB::raw('branch_product_stocks.stock * products.price'));
        $lowStock = BranchProductStock::query()
            ->where('branch_id', $branch->id)
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->count();

        return [
            'id' => $branch->id,
            'name_ar' => $branch->name_ar,
            'name_en' => $branch->name_en,
            'code' => $branch->code,
            'manager_name' => $branch->manager_name,
            'phone' => $branch->phone,
            'address' => $branch->address,
            'city' => $branch->city,
            'status' => $branch->status,
            'is_main' => (bool) $branch->is_main,
            'sort_order' => (int) $branch->sort_order,
            'orders_count' => (int) ($branch->orders_count ?? 0),
            'pos_sales_count' => (int) ($branch->pos_sales_count ?? 0),
            'products_count' => (int) ($branch->products_count ?? 0),
            'sales_total' => round($orderSales + $posSales, 2),
            'stock_units' => $stockUnits,
            'stock_value' => round($stockValue, 2),
            'low_stock_count' => $lowStock,
            'created_at' => $branch->created_at?->toIso8601String(),
        ];
    }

    private function inventoryRows()
    {
        return Branch::query()
            ->orderByDesc('is_main')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Branch $branch) {
                $stock = BranchProductStock::where('branch_id', $branch->id);

                return [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name_ar,
                    'products_count' => (clone $stock)->where('stock', '>', 0)->count(),
                    'stock_units' => (int) (clone $stock)->sum('stock'),
                    'low_stock' => (clone $stock)->whereColumn('stock', '<=', 'low_stock_threshold')->count(),
                    'stock_value' => (float) BranchProductStock::query()
                        ->where('branch_id', $branch->id)
                        ->join('products', 'branch_product_stocks.product_id', '=', 'products.id')
                        ->sum(DB::raw('branch_product_stocks.stock * products.price')),
                ];
            });
    }

    private function ensureStockRows(int $branchId): void
    {
        $existing = BranchProductStock::where('branch_id', $branchId)->pluck('product_id')->all();
        $missing = DB::table('products')
            ->whereNotIn('id', $existing)
            ->get(['id']);

        foreach ($missing as $product) {
            BranchProductStock::create([
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'stock' => 0,
                'reserved_stock' => 0,
                'low_stock_threshold' => 10,
            ]);
        }
    }
}
