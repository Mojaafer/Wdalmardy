<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::query()->with('supplier:id,name', 'creator:id,name');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->integer('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('po_number', 'like', "%$q%")
                    ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%$q%"));
            });
        }

        $perPage = (int) $request->integer('per_page', 25);
        $paginator = $query->latest()->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'total_pending' => (float) PurchaseOrder::whereIn('status', ['draft', 'sent', 'confirmed'])->sum('total'),
                'total_received' => (float) PurchaseOrder::where('status', 'received')->sum('total'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

            $po = PurchaseOrder::create([
                'po_number' => PurchaseOrder::nextNumber(),
                'supplier_id' => $data['supplier_id'],
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'total' => $subtotal,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['items'] as $item) {
                $po->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['quantity'] * $item['unit_price'],
                    'received_quantity' => 0,
                ]);
            }

            return response()->json([
                'data' => $po->load(['items.product:id,name_ar,name_en', 'supplier:id,name', 'creator:id,name']),
            ], 201);
        });
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return response()->json([
            'data' => $purchaseOrder->load(['items.product:id,name_ar,name_en,unit', 'supplier', 'creator:id,name']),
        ]);
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', PurchaseOrder::STATUSES),
        ]);

        $purchaseOrder->status = $data['status'];

        if ($data['status'] === 'received' && ! $purchaseOrder->received_at) {
            $purchaseOrder->received_at = now();

            // Update stock for each item
            foreach ($purchaseOrder->items as $item) {
                $qtyToReceive = $item->quantity - $item->received_quantity;
                if ($qtyToReceive > 0) {
                    Product::where('id', $item->product_id)->increment('stock', $qtyToReceive);
                    $item->received_quantity = $item->quantity;
                    $item->save();
                }
            }
        }

        $purchaseOrder->save();

        return response()->json(['data' => $purchaseOrder->fresh('items')]);
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status === 'received') {
            return response()->json(['message' => 'لا يمكن حذف أمر شراء تم استلامه'], 422);
        }

        $purchaseOrder->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
