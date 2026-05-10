<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    /**
     * Public balance lookup — given a phone number return the customer's
     * loyalty wallet (balance, lifetime, tier, recent earn/redeem). The
     * storefront uses this on /account and /checkout.
     */
    public function balance(Request $request)
    {
        $phone = $request->string('phone')->toString();
        if ($phone === '') {
            return response()->json(['data' => null]);
        }

        $customer = Customer::where('phone', $phone)->first();
        if (! $customer) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'name' => $customer->name,
                'phone' => $customer->phone,
                'loyalty_points' => (int) $customer->loyalty_points,
                'lifetime_points' => (int) $customer->lifetime_points,
                'tier' => $customer->tier(),
                'rules' => [
                    'earn_rate' => Order::LOYALTY_EARN_RATE,
                    'redeem_value' => Order::LOYALTY_REDEEM_VALUE,
                    'redeem_cap_pct' => Order::LOYALTY_REDEEM_CAP_PCT,
                ],
                'next_tier' => $this->nextTier((int) $customer->lifetime_points),
            ],
        ]);
    }

    private function nextTier(int $lifetime): ?array
    {
        foreach (Customer::TIERS as $tier) {
            if ($lifetime < $tier['min']) {
                return [
                    'key' => $tier['key'],
                    'label' => $tier['label'],
                    'min' => $tier['min'],
                    'remaining' => $tier['min'] - $lifetime,
                ];
            }
        }

        return null;
    }
}
