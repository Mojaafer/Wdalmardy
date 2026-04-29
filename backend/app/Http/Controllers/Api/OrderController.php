<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:120',
            'customer_phone' => 'required|string|max:30',
            'customer_email' => 'nullable|email|max:120',
            'address_state' => 'nullable|string|max:80',
            'address_district' => 'nullable|string|max:80',
            'address_details' => 'nullable|string|max:500',
            'delivery_method' => 'required|in:delivery,pickup',
            'payment_method' => 'required|in:whatsapp,cod,bank_transfer',
            'notes' => 'nullable|string|max:500',
            'coupon_code' => 'nullable|string|max:60',
            'delivery_zone_id' => 'nullable|integer|exists:delivery_zones,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:999',
        ]);

        $zone = null;
        if ($validated['delivery_method'] === 'delivery') {
            if (! empty($validated['delivery_zone_id'])) {
                $zone = DeliveryZone::active()->find($validated['delivery_zone_id']);
            }
            $deliveryFee = $zone ? (float) $zone->fee : 1500.0;
        } else {
            $deliveryFee = 0.0;
        }

        $order = DB::transaction(function () use ($validated, $deliveryFee, $zone) {
            $customer = Customer::firstOrNew(['phone' => $validated['customer_phone']]);
            $customer->fill([
                'name' => $validated['customer_name'],
                'email' => $validated['customer_email'] ?? $customer->email,
                'city' => $validated['address_state'] ?? $customer->city,
            ]);
            $customer->save();

            $subtotal = 0;
            $itemsToCreate = [];

            foreach ($validated['items'] as $row) {
                $product = Product::active()->findOrFail($row['product_id']);
                $lineTotal = (float) $product->price * (int) $row['quantity'];
                $subtotal += $lineTotal;
                $itemsToCreate[] = [
                    'product_id' => $product->id,
                    'name_ar' => $product->name_ar,
                    'name_en' => $product->name_en,
                    'unit_price' => $product->price,
                    'quantity' => $row['quantity'],
                    'line_total' => $lineTotal,
                ];
            }

            $coupon = null;
            $discount = 0;
            $finalDeliveryFee = $deliveryFee;
            if (! empty($validated['coupon_code'])) {
                $coupon = Coupon::where('code', strtoupper((string) $validated['coupon_code']))
                    ->lockForUpdate()
                    ->first();
                if ($coupon && $coupon->status() === 'active' && $subtotal >= (float) $coupon->min_order_amount) {
                    $discount = $coupon->calculateDiscount($subtotal, $deliveryFee);
                    if ($coupon->type === 'free_shipping') {
                        $finalDeliveryFee = 0;
                    }
                } else {
                    $coupon = null;
                }
            }
            $total = ($coupon?->type === 'free_shipping')
                ? $subtotal + $finalDeliveryFee
                : max(0, $subtotal - $discount) + $finalDeliveryFee;

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'customer_id' => $customer->id,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'] ?? null,
                'address_state' => $validated['address_state'] ?? null,
                'address_district' => $validated['address_district'] ?? null,
                'address_details' => $validated['address_details'] ?? null,
                'delivery_zone_id' => $zone?->id,
                'delivery_method' => $validated['delivery_method'],
                'payment_method' => $validated['payment_method'],
                'status' => 'new',
                'subtotal' => $subtotal,
                'delivery_fee' => $finalDeliveryFee,
                'total' => $total,
                'notes' => $validated['notes'] ?? null,
                'coupon_id' => $coupon?->id,
                'coupon_code' => $coupon?->code,
                'discount_amount' => $discount,
            ]);

            if ($coupon) {
                $coupon->increment('used_count');
            }

            foreach ($itemsToCreate as $item) {
                OrderItem::create([...$item, 'order_id' => $order->id]);
                $product = Product::find($item['product_id']);
                if ($product) {
                    StockMovement::record(
                        $product,
                        'out',
                        'sale',
                        (int) $item['quantity'],
                        null,
                        'order',
                        $order->id,
                        'طلب '.$order->order_number,
                    );
                }
            }

            $customer->increment('total_orders');
            $customer->increment('total_spent', (float) $order->total);

            return $order->load('items');
        });

        return response()->json([
            'data' => [
                'order_number' => $order->order_number,
                'total' => (float) $order->total,
                'subtotal' => (float) $order->subtotal,
                'delivery_fee' => (float) $order->delivery_fee,
                'discount_amount' => (float) $order->discount_amount,
                'coupon_code' => $order->coupon_code,
                'status' => $order->status,
                'whatsapp_url' => $order->payment_method === 'whatsapp'
                    ? $this->buildWhatsappUrl($order)
                    : null,
            ],
        ], 201);
    }

    public function buildWhatsappUrlPublic(Order $order): string
    {
        return $this->buildWhatsappUrl($order);
    }

    private function buildWhatsappUrl(Order $order): string
    {
        $phone = preg_replace('/\D+/', '', config('services.whatsapp.phone', '249123456789'));

        $lines = [
            '*طلب جديد - ود المرضي ماركت*',
            "رقم الطلب: {$order->order_number}",
            '',
            '*العميل*',
            "الاسم: {$order->customer_name}",
            "الهاتف: {$order->customer_phone}",
        ];

        if ($order->delivery_method === 'delivery') {
            $lines[] = "العنوان: {$order->address_state} / {$order->address_district} - {$order->address_details}";
        } else {
            $lines[] = 'الاستلام: من المتجر';
        }

        $lines[] = '';
        $lines[] = '*المنتجات*';
        foreach ($order->items as $item) {
            $lines[] = "- {$item->name_ar} × {$item->quantity} = ".number_format((float) $item->line_total).' ج.س';
        }

        $lines[] = '';
        $lines[] = 'المجموع الفرعي: '.number_format((float) $order->subtotal).' ج.س';
        if ((float) $order->discount_amount > 0) {
            $code = $order->coupon_code ? " (كود: {$order->coupon_code})" : '';
            $lines[] = 'الخصم'.$code.': -'.number_format((float) $order->discount_amount).' ج.س';
        }
        $lines[] = 'رسوم التوصيل: '.number_format((float) $order->delivery_fee).' ج.س';
        $lines[] = '*الإجمالي: '.number_format((float) $order->total).' ج.س*';

        if ($order->notes) {
            $lines[] = '';
            $lines[] = "ملاحظات: {$order->notes}";
        }

        return 'https://wa.me/'.$phone.'?text='.rawurlencode(implode("\n", $lines));
    }
}
