<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\EmployeeActivity;
use App\Models\Order;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\PosSession;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PosSaleAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = PosSale::query()
            ->with(['cashier:id,name', 'customer:id,name,phone', 'session:id,register'])
            ->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($method = $request->string('payment_method')->toString()) {
            $query->where('payment_method', $method);
        }
        if ($sessionId = $request->integer('session_id')) {
            $query->where('session_id', $sessionId);
        }
        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('sale_number', 'like', "%$q%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%$q%")->orWhere('phone', 'like', "%$q%"));
            });
        }
        if ($from = $request->date('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('created_at', '<=', $to->endOfDay());
        }

        $sales = $query->paginate((int) $request->integer('per_page', 25));

        return response()->json([
            'data' => $sales->getCollection()->map(fn (PosSale $s) => $this->serializeSale($s)),
            'meta' => [
                'total' => $sales->total(),
                'per_page' => $sales->perPage(),
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, PosSale $sale)
    {
        $sale->load(['cashier:id,name', 'customer:id,name,phone,loyalty_points', 'session:id,register', 'items']);

        return response()->json(['data' => $this->serializeSale($sale, withItems: true)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['required', 'integer', 'exists:pos_sessions,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'in:cash,mobile_money,card'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $session = PosSession::findOrFail($data['session_id']);
        if ($session->status !== 'open') {
            throw ValidationException::withMessages(['session_id' => 'الجلسة مُقفلة. الرجاء فتح جلسة جديدة.']);
        }

        return DB::transaction(function () use ($data, $session, $request) {
            $productIds = collect($data['items'])->pluck('product_id')->unique()->all();
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0.0;
            $itemRows = [];
            foreach ($data['items'] as $line) {
                $product = $products[$line['product_id']] ?? null;
                if (! $product) {
                    throw ValidationException::withMessages(['items' => 'المنتج غير موجود.']);
                }
                if ((int) $product->stock < (int) $line['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => 'الكمية المطلوبة غير متوفرة للمنتج "'.($product->name_ar ?? $product->name_en ?? '').'" (المتاح: '.$product->stock.').',
                    ]);
                }
                $unit = (float) $product->price;
                $lineTotal = $unit * (int) $line['quantity'];
                $subtotal += $lineTotal;
                $itemRows[] = [
                    'product' => $product,
                    'unit_price' => $unit,
                    'quantity' => (int) $line['quantity'],
                    'line_total' => $lineTotal,
                ];
            }

            $discount = max(0.0, min((float) ($data['discount_amount'] ?? 0), $subtotal));
            $total = round($subtotal - $discount, 2);
            $amountPaid = (float) $data['amount_paid'];

            if ($data['payment_method'] === 'cash') {
                if ($amountPaid < $total) {
                    throw ValidationException::withMessages([
                        'amount_paid' => 'المبلغ المدفوع أقل من الإجمالي.',
                    ]);
                }
            } else {
                // for non-cash methods we treat amount_paid as the exact total
                if (abs($amountPaid - $total) > 0.01) {
                    $amountPaid = $total;
                }
            }
            $change = $data['payment_method'] === 'cash' ? round($amountPaid - $total, 2) : 0.0;

            $customer = null;
            if (! empty($data['customer_phone'])) {
                $customer = Customer::firstWhere('phone', $data['customer_phone']);
            }

            $sale = PosSale::create([
                'sale_number' => PosSale::nextNumber(),
                'session_id' => $session->id,
                'cashier_id' => $request->user()->id,
                'customer_id' => $customer?->id,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'total' => $total,
                'payment_method' => $data['payment_method'],
                'amount_paid' => $amountPaid,
                'change_given' => $change,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($itemRows as $row) {
                /** @var Product $product */
                $product = $row['product'];
                PosSaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name_ar ?? $product->name_en ?? '',
                    'barcode' => $product->barcode,
                    'unit_price' => $row['unit_price'],
                    'quantity' => $row['quantity'],
                    'line_total' => $row['line_total'],
                ]);
                StockMovement::record(
                    product: $product,
                    type: 'out',
                    reason: 'sale',
                    quantity: $row['quantity'],
                    userId: $request->user()->id,
                    referenceType: 'pos_sale',
                    referenceId: $sale->id,
                    notes: 'بيع نقطة بيع '.$sale->sale_number,
                );
            }

            if ($customer) {
                $earned = (int) floor($total / Order::LOYALTY_EARN_RATE);
                if ($earned > 0) {
                    $customer->awardPoints($earned, 'earn', null, 'بيع نقطة بيع '.$sale->sale_number, (int) $request->user()->id);
                    $sale->forceFill(['points_earned' => $earned])->save();
                }
            }

            return response()->json([
                'data' => $this->serializeSale($sale->fresh(['cashier:id,name', 'customer:id,name,phone,loyalty_points', 'items']), withItems: true),
            ], 201);
        });
    }

    public function void(Request $request, PosSale $sale)
    {
        if ($sale->status === 'voided') {
            return response()->json(['message' => 'هذه العملية مُلغاة بالفعل.'], 422);
        }
        if (! $request->user()->hasPermissionTo('pos.manage')) {
            return response()->json(['message' => 'لا تملك صلاحية إلغاء عمليات نقطة البيع.'], 403);
        }

        DB::transaction(function () use ($sale, $request) {
            foreach ($sale->items()->with('product')->get() as $item) {
                if ($item->product) {
                    StockMovement::record(
                        product: $item->product,
                        type: 'in',
                        reason: 'return',
                        quantity: (int) $item->quantity,
                        userId: (int) $request->user()->id,
                        referenceType: 'pos_sale_void',
                        referenceId: $sale->id,
                        notes: 'إرجاع نقطة بيع '.$sale->sale_number,
                    );
                }
            }
            if ($sale->customer_id && (int) $sale->points_earned > 0) {
                $customer = Customer::find($sale->customer_id);
                if ($customer) {
                    $customer->awardPoints(
                        -1 * (int) $sale->points_earned,
                        'reverse',
                        null,
                        'إلغاء بيع نقطة بيع '.$sale->sale_number,
                        (int) $request->user()->id,
                        bumpLifetime: false,
                    );
                    DB::table('customers')
                        ->where('id', $customer->id)
                        ->update([
                            'lifetime_points' => DB::raw('GREATEST(0, lifetime_points - '.(int) $sale->points_earned.')'),
                            'updated_at' => now(),
                        ]);
                }
            }
            $sale->update([
                'status' => 'voided',
                'voided_by' => (int) $request->user()->id,
                'voided_at' => now(),
                'points_earned' => 0,
            ]);
            EmployeeActivity::log(
                (int) $request->user()->id,
                'pos.sale_voided',
                'ألغى عملية بيع '.$sale->sale_number,
            );
        });

        return response()->json([
            'data' => $this->serializeSale($sale->fresh(['cashier:id,name', 'customer:id,name,phone', 'items']), withItems: true),
        ]);
    }

    public function lookupProduct(Request $request)
    {
        $q = trim($request->string('q')->toString());
        if ($q === '') {
            return response()->json(['data' => []]);
        }
        $products = Product::query()
            ->where('is_active', true)
            ->where(function ($w) use ($q) {
                $w->where('barcode', $q)
                    ->orWhere('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('slug', 'like', "%$q%");
            })
            ->limit(20)
            ->get(['id', 'slug', 'name_ar', 'name_en', 'barcode', 'price', 'stock']);

        return response()->json([
            'data' => $products->map(fn (Product $p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => ['ar' => $p->name_ar, 'en' => $p->name_en],
                'barcode' => $p->barcode,
                'price' => (float) $p->price,
                'stock' => (int) $p->stock,
            ]),
        ]);
    }

    private function serializeSale(PosSale $sale, bool $withItems = false): array
    {
        $payload = [
            'id' => $sale->id,
            'sale_number' => $sale->sale_number,
            'session_id' => $sale->session_id,
            'session' => $sale->relationLoaded('session') && $sale->session ? [
                'id' => $sale->session->id,
                'register' => $sale->session->register,
            ] : null,
            'cashier' => $sale->cashier ? ['id' => $sale->cashier->id, 'name' => $sale->cashier->name] : null,
            'customer' => $sale->customer ? [
                'id' => $sale->customer->id,
                'name' => $sale->customer->name,
                'phone' => $sale->customer->phone,
                'loyalty_points' => isset($sale->customer->loyalty_points) ? (int) $sale->customer->loyalty_points : null,
            ] : null,
            'subtotal' => (float) $sale->subtotal,
            'discount_amount' => (float) $sale->discount_amount,
            'total' => (float) $sale->total,
            'payment_method' => $sale->payment_method,
            'amount_paid' => (float) $sale->amount_paid,
            'change_given' => (float) $sale->change_given,
            'points_earned' => (int) $sale->points_earned,
            'status' => $sale->status,
            'notes' => $sale->notes,
            'created_at' => $sale->created_at?->toIso8601String(),
            'voided_at' => $sale->voided_at?->toIso8601String(),
        ];
        if ($withItems) {
            $payload['items'] = $sale->items->map(fn (PosSaleItem $i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_name' => $i->product_name,
                'barcode' => $i->barcode,
                'unit_price' => (float) $i->unit_price,
                'quantity' => (int) $i->quantity,
                'line_total' => (float) $i->line_total,
            ])->values();
        }

        return $payload;
    }
}
