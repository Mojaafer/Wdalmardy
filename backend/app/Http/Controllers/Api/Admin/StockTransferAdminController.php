<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BranchProductStock;
use App\Models\EmployeeActivity;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Inter-branch stock transfers.
 *
 * Workflow:
 *   store()    -> creates a draft (status=pending); no stock moves yet.
 *   dispatch() -> pending -> in_transit; decrements the source branch.
 *   receive()  -> in_transit -> received; increments the destination branch.
 *   cancel()   -> pending/in_transit -> cancelled. A dispatched transfer can
 *                 only be cancelled by returning the stock to its source.
 *
 * All stock mutations go through StockMovement::record() so the per-branch
 * ledger and the products.stock aggregate stay consistent.
 */
class StockTransferAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = StockTransfer::query()
            ->with(['fromBranch:id,name_ar', 'toBranch:id,name_ar', 'creator:id,name'])
            ->withCount('items')
            ->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($branchId = $request->integer('branch_id')) {
            $query->where(fn ($q) => $q->where('from_branch_id', $branchId)->orWhere('to_branch_id', $branchId));
        }

        $perPage = (int) $request->integer('per_page', 20);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (StockTransfer $t) => $this->serialize($t)),
            'meta' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(StockTransfer $transfer)
    {
        $transfer->load(['fromBranch', 'toBranch', 'creator:id,name', 'items.product:id,name_ar,name_en,slug']);

        return response()->json(['data' => $this->serialize($transfer, withItems: true)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'from_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'to_branch_id' => ['required', 'integer', 'exists:branches,id', 'different:from_branch_id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $transfer = DB::transaction(function () use ($data, $request) {
            $transfer = StockTransfer::create([
                'from_branch_id' => (int) $data['from_branch_id'],
                'to_branch_id' => (int) $data['to_branch_id'],
                'status' => 'pending',
                'created_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $line) {
                $transfer->items()->create([
                    'product_id' => (int) $line['product_id'],
                    'quantity' => (int) $line['quantity'],
                ]);
            }

            return $transfer;
        });

        EmployeeActivity::log(
            (int) $request->user()->id,
            'stock_transfer.created',
            'أنشأ تحويل مخزون بين الفروع',
            ['transfer_id' => $transfer->id],
        );

        return response()->json(['data' => $this->serialize($transfer->fresh(['fromBranch:id,name_ar', 'toBranch:id,name_ar']), withItems: true)], 201);
    }

    /**
     * Dispatch: pull the stock out of the source branch.
     */
    public function dispatch(Request $request, StockTransfer $transfer)
    {
        if ($transfer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'لا يمكن شحن تحويل بحالة "'.($transfer->status).'".',
            ]);
        }

        DB::transaction(function () use ($transfer, $request) {
            // Lock + verify source availability for every line before moving anything.
            $productIds = $transfer->items->pluck('product_id')->unique()->all();
            $sourceStocks = BranchProductStock::query()
                ->where('branch_id', $transfer->from_branch_id)
                ->whereIn('product_id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('product_id');

            foreach ($transfer->items as $item) {
                $available = (int) ($sourceStocks[$item->product_id]->stock ?? 0);
                if ($available < (int) $item->quantity) {
                    throw ValidationException::withMessages([
                        'items' => 'الفرع المُصدّر لا يملك مخزوناً كافياً من "'.$item->product->name_ar.'" (المتاح: '.$available.').',
                    ]);
                }
            }

            foreach ($transfer->items as $item) {
                $product = Product::find($item->product_id);
                StockMovement::record(
                    product: $product,
                    type: 'out',
                    reason: 'manual',
                    quantity: (int) $item->quantity,
                    userId: (int) $request->user()->id,
                    referenceType: 'stock_transfer',
                    referenceId: $transfer->id,
                    notes: 'شحن تحويل مخزون',
                    branchId: (int) $transfer->from_branch_id,
                );
            }

            $transfer->update(['status' => 'in_transit', 'dispatched_at' => now()]);
        });

        EmployeeActivity::log(
            (int) $request->user()->id,
            'stock_transfer.dispatched',
            'شحن تحويل مخزون',
            ['transfer_id' => $transfer->id],
        );

        return response()->json(['data' => $this->serialize($transfer->fresh(['fromBranch:id,name_ar', 'toBranch:id,name_ar']), withItems: true)]);
    }

    /**
     * Receive: land the stock at the destination branch.
     */
    public function receive(Request $request, StockTransfer $transfer)
    {
        if ($transfer->status !== 'in_transit') {
            throw ValidationException::withMessages([
                'status' => 'لا يمكن استلام تحويل غير مُشحن.',
            ]);
        }

        DB::transaction(function () use ($transfer, $request) {
            foreach ($transfer->items as $item) {
                $product = Product::find($item->product_id);
                StockMovement::record(
                    product: $product,
                    type: 'in',
                    reason: 'restock',
                    quantity: (int) $item->quantity,
                    userId: (int) $request->user()->id,
                    referenceType: 'stock_transfer',
                    referenceId: $transfer->id,
                    notes: 'استلام تحويل مخزون',
                    branchId: (int) $transfer->to_branch_id,
                );
            }

            $transfer->update(['status' => 'received', 'received_at' => now()]);
        });

        EmployeeActivity::log(
            (int) $request->user()->id,
            'stock_transfer.received',
            'استلم تحويل مخزون',
            ['transfer_id' => $transfer->id],
        );

        return response()->json(['data' => $this->serialize($transfer->fresh(['fromBranch:id,name_ar', 'toBranch:id,name_ar']), withItems: true)]);
    }

    /**
     * Cancel. A pending transfer is simply voided. An in_transit transfer
     * must return the dispatched stock to its source first.
     */
    public function cancel(Request $request, StockTransfer $transfer)
    {
        if (! in_array($transfer->status, ['pending', 'in_transit'], true)) {
            throw ValidationException::withMessages([
                'status' => 'لا يمكن إلغاء تحويل بحالة "'.($transfer->status).'".',
            ]);
        }

        DB::transaction(function () use ($transfer, $request) {
            if ($transfer->status === 'in_transit') {
                // Stock already left the source — put it back.
                foreach ($transfer->items as $item) {
                    $product = Product::find($item->product_id);
                    StockMovement::record(
                        product: $product,
                        type: 'in',
                        reason: 'return',
                        quantity: (int) $item->quantity,
                        userId: (int) $request->user()->id,
                        referenceType: 'stock_transfer_cancel',
                        referenceId: $transfer->id,
                        notes: 'إلغاء تحويل مخزون',
                        branchId: (int) $transfer->from_branch_id,
                    );
                }
            }

            $transfer->update(['status' => 'cancelled']);
        });

        EmployeeActivity::log(
            (int) $request->user()->id,
            'stock_transfer.cancelled',
            'ألغى تحويل مخزون',
            ['transfer_id' => $transfer->id],
        );

        return response()->json(['data' => $this->serialize($transfer->fresh(['fromBranch:id,name_ar', 'toBranch:id,name_ar']), withItems: true)]);
    }

    private function serialize(StockTransfer $t, bool $withItems = false): array
    {
        $payload = [
            'id' => $t->id,
            'from_branch_id' => (int) $t->from_branch_id,
            'to_branch_id' => (int) $t->to_branch_id,
            'from_branch' => $t->fromBranch ? ['id' => $t->fromBranch->id, 'name_ar' => $t->fromBranch->name_ar] : null,
            'to_branch' => $t->toBranch ? ['id' => $t->toBranch->id, 'name_ar' => $t->toBranch->name_ar] : null,
            'status' => $t->status,
            'items_count' => (int) ($t->items_count ?? $t->items->count()),
            'notes' => $t->notes,
            'created_by' => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
            'dispatched_at' => $t->dispatched_at?->toIso8601String(),
            'received_at' => $t->received_at?->toIso8601String(),
            'created_at' => $t->created_at?->toIso8601String(),
        ];
        if ($withItems) {
            $payload['items'] = $t->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => (int) $item->product_id,
                'quantity' => (int) $item->quantity,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'slug' => $item->product->slug,
                    'name_ar' => $item->product->name_ar,
                    'name_en' => $item->product->name_en,
                ] : null,
            ])->values();
        }

        return $payload;
    }
}
