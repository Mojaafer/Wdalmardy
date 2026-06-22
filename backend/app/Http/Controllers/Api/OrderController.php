<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            'redeem_points' => 'nullable|integer|min:0|max:1000000',
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
            // Lock the customer row so two concurrent orders for the same phone
            // (e.g. a redeem-points double-submit) can't both pass the balance
            // check and apply the discount twice.
            $customer = Customer::where('phone', $validated['customer_phone'])
                ->lockForUpdate()
                ->first()
                ?? new Customer(['phone' => $validated['customer_phone']]);
            $customer->fill([
                'name' => $validated['customer_name'],
                'email' => $validated['customer_email'] ?? $customer->email,
                'city' => $validated['address_state'] ?? $customer->city,
            ]);
            $customer->save();

            $subtotal = 0;
            $itemsToCreate = [];

            // Web orders default to the main branch (manual reassignment later).
            // Guard against overselling by checking the main branch's per-branch
            // stock, locking those rows for the duration of the transaction.
            $fulfilmentBranchId = Branch::defaultId();
            $productIds = collect($validated['items'])->pluck('product_id')->unique()->all();
            $branchStocks = $fulfilmentBranchId
                ? BranchProductStock::query()
                    ->where('branch_id', $fulfilmentBranchId)
                    ->whereIn('product_id', $productIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('product_id')
                : collect();

            foreach ($validated['items'] as $row) {
                $product = Product::active()->findOrFail($row['product_id']);
                $available = (int) ($branchStocks[$product->id]->stock ?? 0);
                if ($available < (int) $row['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => 'الكمية المطلوبة غير متوفرة للمنتج "'.($product->name_ar ?? $product->name_en ?? '').'" (المتاح: '.$available.').',
                    ]);
                }
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
            // Loyalty redemption — validate against the (now-known) customer balance
            // and a 50% subtotal cap so an order can never be zeroed out by points.
            $requestedRedeem = (int) ($validated['redeem_points'] ?? 0);
            $pointsRedeemed = 0;
            $pointsDiscount = 0.0;
            if ($requestedRedeem > 0) {
                $maxByBalance = (int) $customer->loyalty_points;
                $maxByCap = (int) floor(($subtotal * Order::LOYALTY_REDEEM_CAP_PCT) / Order::LOYALTY_REDEEM_VALUE);
                $pointsRedeemed = max(0, min($requestedRedeem, $maxByBalance, $maxByCap));
                $pointsDiscount = $pointsRedeemed * Order::LOYALTY_REDEEM_VALUE;
            }

            $total = ($coupon?->type === 'free_shipping')
                ? max(0, $subtotal - $pointsDiscount) + $finalDeliveryFee
                : max(0, $subtotal - $discount - $pointsDiscount) + $finalDeliveryFee;

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'branch_id' => Branch::defaultId(),
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
                'points_redeemed' => $pointsRedeemed,
                'points_discount' => $pointsDiscount,
            ]);

            if ($coupon) {
                $coupon->increment('used_count');
            }

            if ($pointsRedeemed > 0) {
                $customer->awardPoints(-$pointsRedeemed, 'redeem', $order->id, 'استبدال في طلب '.$order->order_number);
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
                        $order->branch_id,
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
                'points_redeemed' => (int) $order->points_redeemed,
                'points_discount' => (float) $order->points_discount,
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
        if ((int) $order->points_redeemed > 0) {
            $lines[] = 'نقاط مستبدلة ('.number_format((int) $order->points_redeemed).' نقطة): -'.number_format((float) $order->points_discount).' ج.س';
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
