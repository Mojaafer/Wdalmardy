<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmployeeActivity;
use App\Models\PosSale;
use App\Models\PosSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosSessionAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = PosSession::query()
            ->with(['openedBy:id,name', 'closedBy:id,name'])
            ->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($from = $request->date('from')) {
            $query->where('opened_at', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('opened_at', '<=', $to->endOfDay());
        }

        $sessions = $query->paginate((int) $request->integer('per_page', 25));

        return response()->json([
            'data' => $sessions->getCollection()->map(fn (PosSession $s) => $this->serialize($s)),
            'meta' => [
                'total' => $sessions->total(),
                'per_page' => $sessions->perPage(),
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
            ],
        ]);
    }

    public function current(Request $request)
    {
        $session = PosSession::query()
            ->where('opened_by', $request->user()->id)
            ->where('status', 'open')
            ->with(['openedBy:id,name'])
            ->latest('opened_at')
            ->first();

        return response()->json(['data' => $session ? $this->serialize($session, withTotals: true) : null]);
    }

    public function open(Request $request)
    {
        $data = $request->validate([
            'register' => ['nullable', 'string', 'max:60'],
            'opening_cash' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $existing = PosSession::query()
            ->where('opened_by', $request->user()->id)
            ->where('status', 'open')
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'لديك جلسة بيع مفتوحة بالفعل. الرجاء إقفالها أولاً.',
                'data' => $this->serialize($existing->loadMissing('openedBy:id,name'), withTotals: true),
            ], 422);
        }

        $session = PosSession::create([
            'register' => $data['register'] ?? 'main',
            'opened_by' => $request->user()->id,
            'opening_cash' => $data['opening_cash'],
            'notes' => $data['notes'] ?? null,
            'opened_at' => now(),
        ]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'pos.session_opened',
            'فتح جلسة نقطة البيع برصيد افتتاحي '.number_format((float) $session->opening_cash, 2).' ج.س',
        );

        return response()->json([
            'data' => $this->serialize($session->load('openedBy:id,name'), withTotals: true),
        ], 201);
    }

    public function close(Request $request, PosSession $session)
    {
        if ($session->status !== 'open') {
            return response()->json(['message' => 'هذه الجلسة مُقفلة بالفعل.'], 422);
        }
        if ($session->opened_by !== $request->user()->id && ! $request->user()->hasPermissionTo('pos.manage')) {
            return response()->json(['message' => 'لا تملك صلاحية إقفال جلسة موظف آخر.'], 403);
        }

        $data = $request->validate([
            'closing_cash_counted' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $expected = $session->expectedCash();
        $variance = (float) $data['closing_cash_counted'] - $expected;

        $session->update([
            'status' => 'closed',
            'closed_by' => $request->user()->id,
            'closed_at' => now(),
            'closing_cash_expected' => $expected,
            'closing_cash_counted' => $data['closing_cash_counted'],
            'variance' => $variance,
            'notes' => $data['notes'] ?? $session->notes,
        ]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'pos.session_closed',
            'أقفل جلسة نقطة البيع #'.$session->id.' بفارق '.number_format($variance, 2).' ج.س',
        );

        return response()->json([
            'data' => $this->serialize($session->load(['openedBy:id,name', 'closedBy:id,name']), withTotals: true),
        ]);
    }

    public function show(Request $request, PosSession $session)
    {
        $session->load(['openedBy:id,name', 'closedBy:id,name']);

        return response()->json(['data' => $this->serialize($session, withTotals: true)]);
    }

    public function zReport(Request $request)
    {
        $date = $request->date('date') ?? now()->startOfDay();
        $from = $date->copy()->startOfDay();
        $to = $date->copy()->endOfDay();

        $base = PosSale::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to]);

        $perMethod = (clone $base)
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('payment_method')
            ->get();

        $perCashier = (clone $base)
            ->select('cashier_id', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('cashier_id')
            ->with('cashier:id,name')
            ->get()
            ->map(fn ($r) => [
                'cashier_id' => $r->cashier_id,
                'cashier_name' => $r->cashier?->name ?? '—',
                'count' => (int) $r->count,
                'total' => (float) $r->total,
            ]);

        $totalSales = (clone $base)->count();
        $totalRevenue = (float) (clone $base)->sum('total');
        $totalItems = (int) DB::table('pos_sale_items')
            ->join('pos_sales', 'pos_sale_items.sale_id', '=', 'pos_sales.id')
            ->where('pos_sales.status', 'completed')
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->sum('pos_sale_items.quantity');
        $voids = PosSale::query()
            ->where('status', 'voided')
            ->whereBetween('voided_at', [$from, $to])
            ->count();

        return response()->json([
            'data' => [
                'date' => $date->toDateString(),
                'total_sales' => $totalSales,
                'total_revenue' => $totalRevenue,
                'total_items' => $totalItems,
                'voids' => $voids,
                'by_payment_method' => $perMethod->map(fn ($r) => [
                    'method' => $r->payment_method,
                    'count' => (int) $r->count,
                    'total' => (float) $r->total,
                ])->values(),
                'by_cashier' => $perCashier->values(),
            ],
        ]);
    }

    private function serialize(PosSession $s, bool $withTotals = false): array
    {
        $payload = [
            'id' => $s->id,
            'register' => $s->register,
            'status' => $s->status,
            'opening_cash' => (float) $s->opening_cash,
            'closing_cash_expected' => $s->closing_cash_expected === null ? null : (float) $s->closing_cash_expected,
            'closing_cash_counted' => $s->closing_cash_counted === null ? null : (float) $s->closing_cash_counted,
            'variance' => $s->variance === null ? null : (float) $s->variance,
            'opened_by' => $s->openedBy ? ['id' => $s->openedBy->id, 'name' => $s->openedBy->name] : null,
            'closed_by' => $s->closedBy ? ['id' => $s->closedBy->id, 'name' => $s->closedBy->name] : null,
            'opened_at' => $s->opened_at?->toIso8601String(),
            'closed_at' => $s->closed_at?->toIso8601String(),
            'notes' => $s->notes,
        ];
        if ($withTotals) {
            $payload['sales_count'] = (int) $s->sales()->where('status', 'completed')->count();
            $payload['sales_total'] = (float) $s->sales()->where('status', 'completed')->sum('total');
            $payload['expected_cash'] = $s->status === 'open' ? $s->expectedCash() : (float) ($s->closing_cash_expected ?? 0);
        }

        return $payload;
    }
}
