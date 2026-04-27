<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>فاتورة {{ $order->order_number }}</title>
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
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>ود المرضي ماركت</h1>
      <div>كل ما تحتاجه في مكان واحد</div>
    </div>
    <div style="text-align: left;">
      <strong>فاتورة</strong><br>
      رقم: {{ $order->order_number }}<br>
      التاريخ: {{ $order->created_at->format('Y-m-d') }}
    </div>
  </div>

  <div class="meta">
    <strong>بيانات العميل:</strong>
    {{ $order->customer_name }} — {{ $order->customer_phone }}<br>
    @if($order->delivery_method === 'delivery')
      <strong>العنوان:</strong>
      {{ $order->address_state }} / {{ $order->address_district }} — {{ $order->address_details }}
    @else
      <strong>الاستلام:</strong> من المتجر
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
      @foreach($order->items as $item)
      <tr>
        <td>{{ $item->name_ar }}</td>
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
      <td>{{ number_format((float) $order->subtotal) }} ج.س</td>
    </tr>
    <tr>
      <td>رسوم التوصيل</td>
      <td>{{ number_format((float) $order->delivery_fee) }} ج.س</td>
    </tr>
    <tr class="total-row">
      <td>الإجمالي الكلي</td>
      <td>{{ number_format((float) $order->total) }} ج.س</td>
    </tr>
  </table>

  <div class="footer">
    شكراً لتسوقكم من ود المرضي ماركت — الخرطوم، السودان
  </div>
</body>
</html>
