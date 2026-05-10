<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPointMovement;
use App\Models\Order;
use Illuminate\Http\Request;

class LoyaltyAdminController extends Controller
{
    public function summary(Request $request)
    {
        // Tier histogram from lifetime_points
        $tiers = Customer::TIERS;
        $tierBuckets = [];
        for ($i = 0; $i < count($tiers); $i++) {
            $min = $tiers[$i]['min'];
            $max = $tiers[$i + 1]['min'] ?? null;
            $q = Customer::query()->where('lifetime_points', '>=', $min);
            if ($max !== null) {
                $q->where('lifetime_points', '<', $max);
            }
            $tierBuckets[] = [
                'key' => $tiers[$i]['key'],
                'label' => $tiers[$i]['label'],
                'min' => $min,
                'color' => $tiers[$i]['color'],
                'count' => (int) $q->count(),
            ];
        }

        $leaderboard = Customer::query()
            ->orderByDesc('lifetime_points')
            ->limit(20)
            ->get(['id', 'name', 'phone', 'lifetime_points', 'loyalty_points', 'total_orders', 'total_spent']);

        $leaderboard->each(function (Customer $c) {
            $c->setAttribute('tier', $c->tier());
        });

        $recentMovements = CustomerPointMovement::with(['customer:id,name,phone', 'order:id,order_number'])
            ->latest()
            ->limit(20)
            ->get();

        return response()->json([
            'data' => [
                'tiers' => $tierBuckets,
                'leaderboard' => $leaderboard,
                'recent_movements' => $recentMovements,
                'totals' => [
                    'customers' => Customer::count(),
                    'total_lifetime_points' => (int) Customer::sum('lifetime_points'),
                    'outstanding_balance' => (int) Customer::sum('loyalty_points'),
                    'rules' => [
                        'earn_rate' => Order::LOYALTY_EARN_RATE,
                        'redeem_value' => Order::LOYALTY_REDEEM_VALUE,
                        'redeem_cap_pct' => Order::LOYALTY_REDEEM_CAP_PCT,
                    ],
                ],
            ],
        ]);
    }

    public function customer(Request $request, Customer $customer)
    {
        $movements = $customer->pointMovements()
            ->with('order:id,order_number')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'loyalty_points' => $customer->loyalty_points,
                    'lifetime_points' => $customer->lifetime_points,
                    'tier' => $customer->tier(),
                ],
                'movements' => $movements,
            ],
        ]);
    }

    public function adjust(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'points' => 'required|integer|not_in:0',
            'reason' => 'required|string|max:200',
        ]);

        $movement = $customer->awardPoints(
            (int) $data['points'],
            'adjust',
            null,
            $data['reason'],
            $request->user()?->id,
        );

        return response()->json([
            'data' => [
                'movement' => $movement,
                'customer' => [
                    'id' => $customer->id,
                    'loyalty_points' => $customer->loyalty_points,
                    'lifetime_points' => $customer->lifetime_points,
                    'tier' => $customer->tier(),
                ],
            ],
        ]);
    }
}
