<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Mpdf\Mpdf;

class InvoiceAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::query()->with(['order:id,order_number', 'customer:id,name', 'items']);

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('invoice_number', 'like', "%$q%")
                    ->orWhere('customer_name', 'like', "%$q%")
                    ->orWhere('customer_phone', 'like', "%$q%");
            });
        }

        if (($status = $request->string('status')->toString()) !== '') {
            $query->where('status', $status);
        }

        if ($from = $request->date('from')) {
            $query->where('issued_at', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('issued_at', '<=', $to->endOfDay());
        }

        $perPage = (int) $request->integer('per_page', 25);
        $paginator = $query->latest('issued_at')->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'count' => Invoice::count(),
                'issued' => Invoice::where('status', 'issued')->count(),
                'paid' => Invoice::where('status', 'paid')->count(),
                'cancelled' => Invoice::where('status', 'cancelled')->count(),
                'total_value' => (float) Invoice::whereIn('status', ['issued', 'paid'])->sum('total'),
                'paid_value' => (float) Invoice::where('status', 'paid')->sum('total'),
            ],
        ]);
    }

    public function show(Invoice $invoice)
    {
        return response()->json([
            'data' => $invoice->load(['order:id,order_number,status', 'customer:id,name,phone', 'items', 'creator:id,name']),
        ]);
    }

    /**
     * Generate (or fetch existing) invoice for an order.
     */
    public function generate(Request $request, Order $order)
    {
        $existing = Invoice::where('order_id', $order->id)->latest()->first();

        if ($existing && ! $request->boolean('force')) {
            return response()->json(['data' => $existing->load('items'), 'created' => false]);
        }

        $invoice = Invoice::fromOrder($order, $request->user()?->id, $request->string('payment_method')->toString() ?: null);

        return response()->json(['data' => $invoice->load('items'), 'created' => true], 201);
    }

    public function updateStatus(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', Invoice::STATUSES),
            'notes' => 'nullable|string|max:1000',
        ]);

        $invoice->status = $data['status'];
        if (array_key_exists('notes', $data)) {
            $invoice->notes = $data['notes'];
        }
        if ($data['status'] === 'paid' && ! $invoice->paid_at) {
            $invoice->paid_at = now();
        }
        if ($data['status'] === 'issued' && ! $invoice->issued_at) {
            $invoice->issued_at = now();
        }
        $invoice->save();

        return response()->json(['data' => $invoice->fresh('items')]);
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->load(['items', 'order:id,order_number']);

        $html = View::make('invoices.invoice', ['invoice' => $invoice])->render();

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

        $mpdf->SetTitle('فاتورة '.$invoice->invoice_number);
        $mpdf->WriteHTML($html);

        $filename = $invoice->invoice_number.'.pdf';

        return response($mpdf->Output($filename, 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function whatsappLink(Invoice $invoice)
    {
        $phone = preg_replace('/\D+/', '', (string) $invoice->customer_phone);
        if ($phone === '') {
            return response()->json(['data' => ['whatsapp_url' => null]]);
        }

        $lines = [];
        $lines[] = 'فاتورة '.$invoice->invoice_number.' من ود المرضي ماركت';
        if ($invoice->order) {
            $lines[] = 'رقم الطلب: '.$invoice->order->order_number;
        }
        $lines[] = 'مرحباً '.$invoice->customer_name;
        if ((float) $invoice->discount_amount > 0) {
            $lines[] = 'الخصم: '.number_format((float) $invoice->discount_amount).' ج.س';
        }
        $lines[] = 'المجموع: '.number_format((float) $invoice->subtotal).' ج.س';
        if ((float) $invoice->delivery_fee > 0) {
            $lines[] = 'التوصيل: '.number_format((float) $invoice->delivery_fee).' ج.س';
        }
        $lines[] = 'الإجمالي الكلي: '.number_format((float) $invoice->total).' ج.س';

        $message = implode("\n", $lines);
        $url = 'https://wa.me/'.$phone.'?text='.rawurlencode($message);

        return response()->json(['data' => ['whatsapp_url' => $url]]);
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
