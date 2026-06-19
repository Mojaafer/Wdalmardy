<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Customer;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:60',
            'subtotal' => 'required|numeric|min:0',
            'shipping' => 'sometimes|numeric|min:0',
            'customer_phone' => 'nullable|string|max:60',
            'region' => 'nullable|string|max:80',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
        ]);

        $coupon = Coupon::where('code', strtoupper($data['code']))->first();

        if (! $coupon) {
            return response()->json(['message' => 'الكوبون غير موجود.'], 404);
        }

        $status = $coupon->status();
        if ($status !== 'active') {
            return response()->json([
                'message' => match ($status) {
                    'paused' => 'الكوبون غير مفعّل.',
                    'expired' => 'انتهت صلاحية الكوبون.',
                    'scheduled' => 'الكوبون لم يبدأ بعد.',
                    'exhausted' => 'استُنفد عدد مرات استخدام الكوبون.',
                    default => 'الكوبون غير صالح.',
                },
            ], 422);
        }

        $subtotal = (float) $data['subtotal'];
        $shipping = (float) ($data['shipping'] ?? 0);
        $customer = ! empty($data['customer_phone'])
            ? Customer::where('phone', $data['customer_phone'])->first()
            : null;

        if ($subtotal < (float) $coupon->min_order_amount) {
            return response()->json([
                'message' => 'الحد الأدنى للطلب '.number_format((float) $coupon->min_order_amount).' ج.س لاستخدام هذا الكوبون.',
            ], 422);
        }

        if (! $coupon->matchesTarget($customer, $data['region'] ?? null, $data['product_ids'] ?? [])) {
            return response()->json([
                'message' => 'هذا الكوبون لا ينطبق على بيانات هذا الطلب.',
            ], 422);
        }

        $discount = $coupon->calculateDiscount($subtotal, $shipping);

        return response()->json([
            'data' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => (float) $coupon->value,
                'discount' => $discount,
                'free_shipping' => $coupon->type === 'free_shipping',
            ],
        ]);
    }
}
