<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

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

        $order->update($validated);

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

        $pdf = Pdf::loadView('invoices.order', ['order' => $order]);

        return $pdf->download('invoice-'.$order->order_number.'.pdf');
    }
}
