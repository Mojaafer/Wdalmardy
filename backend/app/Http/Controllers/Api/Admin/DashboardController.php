<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $todayStart = Carbon::today();
        $yesterdayStart = Carbon::yesterday();
        $sevenDaysAgo = Carbon::today()->subDays(6);

        $todayOrders = Order::whereDate('created_at', $todayStart);
        $yesterdayOrders = Order::whereDate('created_at', $yesterdayStart);

        $todaySales = (float) $todayOrders->clone()->where('status', '!=', 'cancelled')->sum('total');
        $yesterdaySales = (float) $yesterdayOrders->clone()->where('status', '!=', 'cancelled')->sum('total');

        $todayCount = (int) $todayOrders->clone()->count();
        $yesterdayCount = (int) $yesterdayOrders->clone()->count();

        $newCustomers = Customer::where('created_at', '>=', $todayStart)->count();
        $newCustomersYesterday = Customer::whereBetween('created_at', [$yesterdayStart, $todayStart])->count();

        $avgOrder = $todayCount > 0 ? $todaySales / $todayCount : 0;
        $avgOrderYesterday = $yesterdayCount > 0 ? $yesterdaySales / $yesterdayCount : 0;

        $salesSeries = collect(range(0, 6))->map(function ($i) use ($sevenDaysAgo) {
            $day = $sevenDaysAgo->copy()->addDays($i);

            return [
                'date' => $day->toDateString(),
                'total' => (float) Order::whereDate('created_at', $day)
                    ->where('status', '!=', 'cancelled')
                    ->sum('total'),
            ];
        });

        $newOrders = Order::with('items')->latest()->limit(5)->get(['id', 'order_number', 'customer_name', 'total', 'status', 'created_at']);

        $lowStock = Product::active()
            ->where('stock', '<', 10)
            ->orderBy('stock')
            ->limit(5)
            ->get(['id', 'name_ar', 'name_en', 'stock', 'image']);

        $customerStats = [
            'total' => Customer::count(),
            'new' => Customer::where('created_at', '>=', Carbon::now()->subDays(30))->count(),
            'active' => Customer::where('total_orders', '>', 0)->where('updated_at', '>=', Carbon::now()->subDays(30))->count(),
            'returning' => Customer::where('total_orders', '>', 1)->count(),
        ];

        return response()->json([
            'data' => [
                'kpis' => [
                    'sales' => ['today' => $todaySales, 'yesterday' => $yesterdaySales],
                    'profit' => ['today' => round($todaySales * 0.15, 2), 'yesterday' => round($yesterdaySales * 0.15, 2)],
                    'orders' => ['today' => $todayCount, 'yesterday' => $yesterdayCount],
                    'avg_order' => ['today' => round($avgOrder, 2), 'yesterday' => round($avgOrderYesterday, 2)],
                    'new_customers' => ['today' => $newCustomers, 'yesterday' => $newCustomersYesterday],
                ],
                'sales_series' => $salesSeries->all(),
                'recent_orders' => $newOrders,
                'low_stock' => $lowStock,
                'customer_stats' => $customerStats,
            ],
        ]);
    }
}
