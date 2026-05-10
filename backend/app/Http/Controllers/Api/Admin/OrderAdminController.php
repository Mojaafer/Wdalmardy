<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
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

        DB::transaction(function () use ($order, $validated) {
            $order->update($validated);
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
