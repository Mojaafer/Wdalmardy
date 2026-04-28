<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:60',
            'subtotal' => 'required|numeric|min:0',
            'shipping' => 'sometimes|numeric|min:0',
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

        if ($subtotal < (float) $coupon->min_order_amount) {
            return response()->json([
                'message' => 'الحد الأدنى للطلب '.number_format((float) $coupon->min_order_amount).' ج.س لاستخدام هذا الكوبون.',
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
