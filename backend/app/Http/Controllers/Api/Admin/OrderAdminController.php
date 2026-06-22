<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Controller;
use App\Models\BranchProductStock;
use App\Models\EmployeeActivity;
use App\Models\Order;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Validation\ValidationException;
use Mpdf\Mpdf;

class OrderAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::query()->with(['items', 'driver:id,name']);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('order_number', 'like', "%$q%")
                    ->orWhere('customer_name', 'like', "%$q%")
                    ->orWhere('customer_phone', 'like', "%$q%");
            });
        }

        if ($from = $request->date('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('created_at', '<=', $to->endOfDay());
        }

        $perPage = (int) $request->integer('per_page', 15);

        $paginator = $query->latest()->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Order $order)
    {
        return response()->json(['data' => $order->load(['items', 'customer', 'driver:id,name'])]);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:'.implode(',', Order::STATUSES),
            'assigned_driver_id' => 'nullable|integer|exists:users,id',
        ]);

        // Cancellation is a terminal state — the loyalty refund has already
        // been issued and the order's totals/movement-ledger reflect the
        // cancellation. Re-activating to a non-cancelled status would create
        // ambiguous loyalty state (re-award vs keep refund) and stale totals,
        // so it's disallowed. Admins should clone the order instead.
        if ($order->status === 'cancelled' && $validated['status'] !== 'cancelled') {
            return response()->json([
                'message' => 'لا يمكن إعادة تفعيل طلب ملغى. يرجى إنشاء طلب جديد.',
            ], 422);
        }

        DB::transaction(function () use ($order, $validated) {
            $order->update($validated);
        });

        return response()->json(['data' => $order->fresh(['items', 'driver:id,name'])]);
    }

    /**
     * Reassign an order's fulfilment to a different branch.
     *
     * Moves the stock reservation: each line item is returned to the old
     * branch and re-sold at the new branch, guarding that the destination
     * branch holds sufficient stock. Cancelled orders are excluded (their
     * stock was already reversed). The order itself is not re-decremented
     * — only the per-branch ledger is rebalanced.
     */
    public function assignBranch(Request $request, Order $order)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        $newBranchId = (int) $validated['branch_id'];
        $oldBranchId = (int) $order->branch_id;

        if ($order->status === 'cancelled') {
            throw ValidationException::withMessages([
                'order' => 'لا يمكن تغيير فرع طلب ملغى.',
            ]);
        }

        if ($newBranchId === $oldBranchId) {
            return response()->json(['data' => $order->fresh(['items', 'driver:id,name'])]);
        }

        DB::transaction(function () use ($order, $newBranchId, $oldBranchId, $request) {
            // Verify the destination branch can cover every line before
            // touching any stock, locking the rows to avoid races.
            $productIds = $order->items->pluck('product_id')->unique()->all();
            $destStocks = BranchProductStock::query()
                ->where('branch_id', $newBranchId)
                ->whereIn('product_id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('product_id');

            foreach ($order->items as $item) {
                $available = (int) ($destStocks[$item->product_id]->stock ?? 0);
                if ($available < (int) $item->quantity) {
                    throw ValidationException::withMessages([
                        'branch_id' => 'الفرع المختار لا يملك مخزوناً كافياً من "'.($item->name_ar ?? '').'" (المتاح: '.$available.').',
                    ]);
                }
            }

            // Rebalance: return to the old branch, then sell at the new branch.
            foreach ($order->items as $item) {
                if (! $item->product) {
                    continue;
                }
                if ($oldBranchId) {
                    StockMovement::record(
                        product: $item->product,
                        type: 'in',
                        reason: 'return',
                        quantity: (int) $item->quantity,
                        userId: (int) $request->user()->id,
                        referenceType: 'order_branch_reassign',
                        referenceId: $order->id,
                        notes: 'إعادة توجيه طلب '.$order->order_number,
                        branchId: $oldBranchId,
                    );
                }
                StockMovement::record(
                    product: $item->product,
                    type: 'out',
                    reason: 'sale',
                    quantity: (int) $item->quantity,
                    userId: (int) $request->user()->id,
                    referenceType: 'order_branch_reassign',
                    referenceId: $order->id,
                    notes: 'إعادة توجيه طلب '.$order->order_number,
                    branchId: $newBranchId,
                );
            }

            $order->update(['branch_id' => $newBranchId]);

            EmployeeActivity::log(
                (int) $request->user()->id,
                'order.branch_reassigned',
                'أعاد توجيه الطلب '.$order->order_number,
                ['old_branch_id' => $oldBranchId, 'new_branch_id' => $newBranchId],
            );
        });

        return response()->json(['data' => $order->fresh(['items', 'driver:id,name'])]);
    }

    public function whatsappResend(Order $order)
    {
        $url = (new OrderController)
            ->buildWhatsappUrlPublic($order->load('items'));

        return response()->json(['data' => ['whatsapp_url' => $url]]);
    }

    public function invoicePdf(Order $order)
    {
        $order->load(['items', 'customer']);

        $html = View::make('invoices.order', ['order' => $order])->render();

        $tmp = storage_path('app/mpdf-tmp');
        if (! is_dir($tmp)) {
            @mkdir($tmp, 0775, true);
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'directionality' => 'rtl',
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'tempDir' => $tmp,
            'default_font' => 'dejavusans',
        ]);

        $mpdf->SetTitle('فاتورة '.$order->order_number);
        $mpdf->WriteHTML($html);

        $filename = 'invoice-'.$order->order_number.'.pdf';

        return response($mpdf->Output($filename, 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
