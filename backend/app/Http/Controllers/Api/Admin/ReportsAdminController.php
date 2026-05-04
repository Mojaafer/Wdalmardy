<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportsAdminController extends Controller
{
    public function summary(Request $request)
    {
        $range = $request->string('range', '30d')->toString();
        [$from, $to] = $this->resolveRange($range);

        $orders = Order::whereBetween('created_at', [$from, $to])
            ->where('status', '!=', 'cancelled');

        $totalSales = (float) (clone $orders)->sum('total');
        $totalOrders = (int) (clone $orders)->count();
        $avgOrder = $totalOrders > 0 ? $totalSales / $totalOrders : 0;
        $totalDiscount = (float) (clone $orders)->sum('discount_amount');

        $newCustomers = Customer::whereBetween('created_at', [$from, $to])->count();

        // sales by day
        $byDay = (clone $orders)
            ->select(DB::raw('DATE(created_at) as d'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as cnt'))
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => [
                'date' => (string) $r->d,
                'total' => (float) $r->total,
                'count' => (int) $r->cnt,
            ]);

        // top products
        $topProducts = OrderItem::query()
            ->select('product_id', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(quantity * unit_price) as revenue'))
            ->whereHas('order', function ($q) use ($from, $to) {
                $q->whereBetween('created_at', [$from, $to])->where('status', '!=', 'cancelled');
            })
            ->groupBy('product_id')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $p = Product::find($row->product_id);

                return [
                    'product_id' => $row->product_id,
                    'name' => $p?->name_ar ?? '—',
                    'qty' => (int) $row->qty,
                    'revenue' => (float) $row->revenue,
                ];
            });

        // revenue by category
        $byCategory = OrderItem::query()
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->whereHas('order', function ($q) use ($from, $to) {
                $q->whereBetween('created_at', [$from, $to])->where('status', '!=', 'cancelled');
            })
            ->select('categories.id as category_id', 'categories.name_ar as name', DB::raw('SUM(order_items.quantity * order_items.unit_price) as revenue'))
            ->groupBy('categories.id', 'categories.name_ar')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                'category_id' => (int) $r->category_id,
                'name' => $r->name ?? '—',
                'revenue' => (float) $r->revenue,
            ]);

        // orders by status
        $byStatus = Order::whereBetween('created_at', [$from, $to])
            ->select('status', DB::raw('COUNT(*) as cnt'))
            ->groupBy('status')
            ->pluck('cnt', 'status');

        // top customers
        $topCustomers = (clone $orders)
            ->whereNotNull('customer_id')
            ->select('customer_id', DB::raw('COUNT(*) as orders_count'), DB::raw('SUM(total) as revenue'))
            ->groupBy('customer_id')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $c = Customer::find($row->customer_id);

                return [
                    'customer_id' => $row->customer_id,
                    'name' => $c?->name ?? '—',
                    'phone' => $c?->phone,
                    'orders_count' => (int) $row->orders_count,
                    'revenue' => (float) $row->revenue,
                ];
            });

        return response()->json([
            'data' => [
                'range' => $range,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'totals' => [
                    'sales' => $totalSales,
                    'orders' => $totalOrders,
                    'avg_order' => round($avgOrder, 2),
                    'discount' => $totalDiscount,
                    'new_customers' => $newCustomers,
                    'estimated_profit' => round($totalSales * 0.15, 2),
                ],
                'sales_by_day' => $byDay,
                'top_products' => $topProducts,
                'revenue_by_category' => $byCategory,
                'orders_by_status' => $byStatus,
                'top_customers' => $topCustomers,
            ],
        ]);
    }

    private function resolveRange(string $range): array
    {
        $to = Carbon::now()->endOfDay();
        $from = match ($range) {
            '7d' => Carbon::today()->subDays(6),
            '30d' => Carbon::today()->subDays(29),
            '90d' => Carbon::today()->subDays(89),
            'mtd' => Carbon::now()->startOfMonth(),
            'ytd' => Carbon::now()->startOfYear(),
            default => Carbon::today()->subDays(29),
        };

        return [$from, $to];
    }
}
