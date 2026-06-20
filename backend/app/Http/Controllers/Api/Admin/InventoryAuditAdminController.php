<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\InventoryAuditItem;
use App\Models\InventoryAuditSession;
use App\Models\InventoryAuditTemplate;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryAuditAdminController extends Controller
{
    public function index()
    {
        $sessions = InventoryAuditSession::query()
            ->with(['branch:id,name_ar', 'startedBy:id,name'])
            ->withCount('items')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $sessions->map(fn (InventoryAuditSession $session) => $this->serializeSession($session)),
            'templates' => InventoryAuditTemplate::where('is_active', true)->orderBy('id')->get(),
            'stats' => [
                'open' => InventoryAuditSession::where('status', 'open')->count(),
                'closed' => InventoryAuditSession::where('status', 'closed')->count(),
                'avg_accuracy' => round((float) InventoryAuditSession::where('status', 'closed')->avg('accuracy_rate'), 2),
                'variance_items' => InventoryAuditItem::where('variance', '!=', 0)->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'name' => ['nullable', 'string', 'max:140'],
            'cadence' => ['required', 'in:daily,weekly,monthly'],
            'scope' => ['sometimes', 'in:all,low_stock'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $branchId = $data['branch_id'] ?? Branch::defaultId();

        return DB::transaction(function () use ($data, $branchId, $request) {
            $session = InventoryAuditSession::create([
                'branch_id' => $branchId,
                'name' => $data['name'] ?? 'جرد سريع - '.now()->format('Y-m-d H:i'),
                'cadence' => $data['cadence'],
                'status' => 'open',
                'started_by' => $request->user()->id,
                'started_at' => now(),
                'notes' => $data['notes'] ?? null,
            ]);

            $stocks = BranchProductStock::query()
                ->where('branch_id', $branchId)
                ->when(($data['scope'] ?? 'all') === 'low_stock', fn ($q) => $q->whereColumn('stock', '<=', 'low_stock_threshold'))
                ->with('product:id,name_ar,name_en,barcode')
                ->limit(200)
                ->get();

            foreach ($stocks as $stock) {
                InventoryAuditItem::create([
                    'session_id' => $session->id,
                    'product_id' => $stock->product_id,
                    'expected_qty' => (int) $stock->stock,
                    'status' => 'pending',
                ]);
            }

            return response()->json(['data' => $this->serializeSession($session->fresh(['branch:id,name_ar', 'startedBy:id,name']), true)], 201);
        });
    }

    public function show(InventoryAuditSession $session)
    {
        $session->load(['branch:id,name_ar', 'startedBy:id,name', 'closedBy:id,name', 'items.product:id,name_ar,name_en,barcode,image']);

        return response()->json(['data' => $this->serializeSession($session, true)]);
    }

    public function updateItem(Request $request, InventoryAuditSession $session, InventoryAuditItem $item)
    {
        if ($item->session_id !== $session->id) {
            abort(404);
        }
        if ($session->status !== 'open') {
            return response()->json(['message' => 'جلسة الجرد مغلقة.'], 422);
        }

        $data = $request->validate([
            'counted_qty' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $variance = (int) $data['counted_qty'] - (int) $item->expected_qty;
        $item->update([
            'counted_qty' => $data['counted_qty'],
            'variance' => $variance,
            'status' => $variance === 0 ? 'matched' : 'variance',
            'notes' => $data['notes'] ?? $item->notes,
        ]);

        return response()->json(['data' => $this->serializeItem($item->fresh('product:id,name_ar,name_en,barcode,image'))]);
    }

    public function close(Request $request, InventoryAuditSession $session)
    {
        if ($session->status !== 'open') {
            return response()->json(['message' => 'جلسة الجرد مغلقة بالفعل.'], 422);
        }

        $data = $request->validate([
            'apply_adjustments' => ['sometimes', 'boolean'],
        ]);

        return DB::transaction(function () use ($session, $request, $data) {
            $items = $session->items()->with('product')->get();
            $counted = $items->whereNotNull('counted_qty')->count();
            $matched = $items->where('variance', 0)->whereNotNull('counted_qty')->count();
            $accuracy = $counted > 0 ? round(($matched / $counted) * 100, 2) : 0;
            $totalVariance = (int) $items->sum('variance');

            if (! empty($data['apply_adjustments'])) {
                foreach ($items->where('variance', '!=', 0) as $item) {
                    if (! $item->product) {
                        continue;
                    }
                    StockMovement::record(
                        $item->product,
                        'adjustment',
                        'manual',
                        (int) $item->variance,
                        (int) $request->user()->id,
                        'inventory_audit',
                        $session->id,
                        'تسوية جرد '.$session->name,
                        $session->branch_id,
                    );
                }
            }

            $session->update([
                'status' => 'closed',
                'closed_by' => $request->user()->id,
                'closed_at' => now(),
                'accuracy_rate' => $accuracy,
                'total_variance' => $totalVariance,
            ]);

            return response()->json(['data' => $this->serializeSession($session->fresh(['branch:id,name_ar', 'closedBy:id,name']), true)]);
        });
    }

    private function serializeSession(InventoryAuditSession $session, bool $withItems = false): array
    {
        $payload = [
            'id' => $session->id,
            'branch_id' => $session->branch_id,
            'branch' => $session->branch ? ['id' => $session->branch->id, 'name_ar' => $session->branch->name_ar] : null,
            'name' => $session->name,
            'cadence' => $session->cadence,
            'status' => $session->status,
            'items_count' => $session->items_count ?? $session->items()->count(),
            'accuracy_rate' => (float) $session->accuracy_rate,
            'total_variance' => (int) $session->total_variance,
            'started_at' => $session->started_at?->toIso8601String(),
            'closed_at' => $session->closed_at?->toIso8601String(),
            'started_by' => $session->startedBy ? ['id' => $session->startedBy->id, 'name' => $session->startedBy->name] : null,
            'closed_by' => $session->closedBy ? ['id' => $session->closedBy->id, 'name' => $session->closedBy->name] : null,
        ];

        if ($withItems) {
            $payload['items'] = $session->items->map(fn (InventoryAuditItem $item) => $this->serializeItem($item))->values();
        }

        return $payload;
    }

    private function serializeItem(InventoryAuditItem $item): array
    {
        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'product' => $item->product ? [
                'id' => $item->product->id,
                'name_ar' => $item->product->name_ar,
                'name_en' => $item->product->name_en,
                'barcode' => $item->product->barcode,
                'image' => $item->product->image,
            ] : null,
            'expected_qty' => (int) $item->expected_qty,
            'counted_qty' => $item->counted_qty === null ? null : (int) $item->counted_qty,
            'variance' => (int) $item->variance,
            'status' => $item->status,
            'notes' => $item->notes,
        ];
    }
}
