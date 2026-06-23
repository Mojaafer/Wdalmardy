import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

type ReceiptData = {
  shopName: string;
  shopLogo?: string | null;
  saleNumber: string;
  date: string;
  cashier: string;
  customer?: string | null;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  pointsEarned?: number;
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  mobile_money: 'محفظة',
  card: 'بطاقة',
};

export function generateReceipt(data: ReceiptData): Uint8Array {
  const encoder = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    width: 48,
  });

  encoder
    .initialize()
    .newline()
    .align('center')
    .style('double-height')
    .text(data.shopName)
    .style('normal')
    .newline()
    .newline()
    .text('إيصال بيع نقطة البيع')
    .newline()
    .text('='.repeat(32))
    .newline()
    .align('left')
    .text(`رقم العملية: ${data.saleNumber}`)
    .newline()
    .text(`التاريخ: ${data.date}`)
    .newline()
    .text(`الكاشير: ${data.cashier}`)
    .newline();

  if (data.customer) {
    encoder.text(`العميل: ${data.customer}`).newline();
  }

  encoder
    .text('-'.repeat(32))
    .newline()
    .align('center')
    .style('bold')
    .text('الصنف    الكمية    السعر    الإجمالي')
    .style('normal')
    .newline()
    .text('-'.repeat(32))
    .newline()
    .align('left');

  for (const item of data.items) {
    const line = `${item.name.slice(0, 14)}  ${item.qty}  ${formatNum(item.price)}  ${formatNum(item.total)}`;
    encoder.text(line).newline();
  }

  encoder
    .text('-'.repeat(32))
    .newline()
    .align('right')
    .text(`المجموع الفرعي:     ${formatNum(data.subtotal)}`)
    .newline();

  if (data.discount > 0) {
    encoder.text(`الخصم:              ${formatNum(data.discount)}`).newline();
  }

  encoder
    .style('bold')
    .text(`الإجمالي:           ${formatNum(data.total)}`)
    .style('normal')
    .newline()
    .text(`المدفوع:             ${formatNum(data.paid)}`)
    .newline();

  if (data.change > 0) {
    encoder.text(`الباقي:              ${formatNum(data.change)}`).newline();
  }

  encoder
    .text(`وسيلة الدفع:        ${METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}`)
    .newline();

  if (data.pointsEarned && data.pointsEarned > 0) {
    encoder.text(`نقاط الولاء:         +${data.pointsEarned}`).newline();
  }

  encoder
    .newline()
    .align('center')
    .text('='.repeat(32))
    .newline()
    .text('شكراً لتسوقكم معنا')
    .newline()
    .text('ود المرضي ماركت')
    .newline()
    .newline()
    .newline()
    .cut();

  return encoder.encode();
}

export async function printBluetooth(data: Uint8Array, deviceName?: string): Promise<void> {
  if (!navigator.bluetooth) {
    throw new Error('متصفحك لا يدعم تقنية Bluetooth');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
  });

  const server = await device.gatt!.connect();
  const services = await server.getPrimaryServices();

  let printerService = services.find((s) => s.uuid.includes('18f0'));
  if (!printerService && services.length > 0) {
    printerService = services[0];
  }
  if (!printerService) {
    throw new Error('لم يتم العثور على خدمة طباعة');
  }

  const characteristics = await printerService.getCharacteristics();
  if (characteristics.length === 0) {
    throw new Error('لم يتم العثور على خصائص الاتصال');
  }

  const char = characteristics[0];
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await char.writeValue(chunk);
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
