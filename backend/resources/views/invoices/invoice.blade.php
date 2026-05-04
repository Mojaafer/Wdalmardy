<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>فاتورة {{ $invoice->invoice_number }}</title>
<style>
  body { font-family: dejavusans, sans-serif; direction: rtl; color: #1a2a23; font-size: 12px; }
  h1 { color: #0E5C3A; margin: 0; font-size: 20px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0E5C3A; padding-bottom: 10px; margin-bottom: 20px; }
  .meta { background: #FBEFE2; padding: 10px; border-radius: 6px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: right; }
  th { background: #FBEFE2; color: #0E5C3A; }
  .totals { margin-top: 16px; width: 50%; float: left; }
  .totals tr td { border: none; padding: 4px 8px; }
  .total-row td { font-weight: bold; color: #F26B2B; font-size: 14px; border-top: 2px solid #0E5C3A; padding-top: 8px; }
  .footer { clear: both; margin-top: 30px; text-align: center; color: #666; font-size: 10px; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 99px; background: #0E5C3A; color: #fff; font-size: 10px; }
  .pill.paid { background: #0E5C3A; }
  .pill.issued { background: #F26B2B; }
  .pill.cancelled { background: #999; }
  .pill.refunded { background: #c2410c; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>ود المرضي ماركت</h1>
      <div>كل ما تحتاجه في مكان واحد</div>
      <div style="margin-top:4px; color:#666;">الخرطوم، السودان · +249 12 345 6789</div>
    </div>
    <div style="text-align: left;">
      <strong>فاتورة ضريبية</strong><br>
      رقم: {{ $invoice->invoice_number }}<br>
      @if($invoice->order)
        طلب: {{ $invoice->order->order_number }}<br>
      @endif
      التاريخ: {{ optional($invoice->issued_at ?? $invoice->created_at)->format('Y-m-d') }}<br>
      @php($statuses = ['draft' => 'مسودة', 'issued' => 'مصدرة', 'paid' => 'مدفوعة', 'cancelled' => 'ملغية', 'refunded' => 'مرتجعة'])
      <span class="pill {{ $invoice->status }}">{{ $statuses[$invoice->status] ?? $invoice->status }}</span>
    </div>
  </div>

  <div class="meta">
    <strong>بيانات العميل:</strong>
    {{ $invoice->customer_name }} — {{ $invoice->customer_phone }}<br>
    @if($invoice->customer_address)
      <strong>العنوان:</strong> {{ $invoice->customer_address }}
    @endif
  </div>

  <table>
    <thead>
      <tr>
        <th>المنتج</th>
        <th>الكمية</th>
        <th>السعر</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      @foreach($invoice->items as $item)
      <tr>
        <td>{{ $item->product_name }} @if($item->product_unit) <small style="color:#666;">({{ $item->product_unit }})</small>@endif</td>
        <td>{{ $item->quantity }}</td>
        <td>{{ number_format((float) $item->unit_price) }} ج.س</td>
        <td>{{ number_format((float) $item->line_total) }} ج.س</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>المجموع الفرعي</td>
      <td>{{ number_format((float) $invoice->subtotal) }} ج.س</td>
    </tr>
    @if((float) $invoice->discount_amount > 0)
    <tr>
      <td>الخصم</td>
      <td>- {{ number_format((float) $invoice->discount_amount) }} ج.س</td>
    </tr>
    @endif
    <tr>
      <td>رسوم التوصيل</td>
      <td>{{ number_format((float) $invoice->delivery_fee) }} ج.س</td>
    </tr>
    <tr class="total-row">
      <td>الإجمالي الكلي</td>
      <td>{{ number_format((float) $invoice->total) }} ج.س</td>
    </tr>
  </table>

  <div class="footer">
    @if($invoice->notes)
      <p>{{ $invoice->notes }}</p>
    @endif
    شكراً لتسوقكم من ود المرضي ماركت — الخرطوم، السودان
  </div>
</body>
</html>
