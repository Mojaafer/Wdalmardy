'use client';

import { useEffect, useState } from 'react';
import {
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
  downloadInvoicePdf,
  getInvoiceWhatsappUrl,
  type AdminInvoice,
  type InvoiceStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  MessageCircle,
  Banknote,
  RefreshCw,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  issued: 'مصدرة',
  paid: 'مدفوعة',
  cancelled: 'ملغية',
  refunded: 'مرتجعة',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  refunded: 'bg-orange-100 text-orange-700',
};
const PAYMENT_LABELS: Record<string, string> = {
  cod: 'الدفع عند الاستلام',
  whatsapp: 'واتساب',
  cash: 'نقدي',
  transfer: 'تحويل بنكي',
  other: 'أخرى',
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({ count: 0, issued: 0, paid: 0, cancelled: 0, total_value: 0, paid_value: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [selected, setSelected] = useState<AdminInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await listInvoices(filters);
    setInvoices(r.data);
    setStats({
      count: r.meta.count,
      issued: r.meta.issued,
      paid: r.meta.paid,
      cancelled: r.meta.cancelled,
      total_value: r.meta.total_value,
      paid_value: r.meta.paid_value,
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status]);

  async function open(inv: AdminInvoice) {
    const r = await getInvoice(inv.id);
    setSelected(r.data);
    setError(null);
  }

  async function changeStatus(status: AdminInvoice['status']) {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await updateInvoiceStatus(selected.id, status);
      setSelected(r.data);
      refresh();
    } catch (e) {
      if (e instanceof AdminApiError) setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!selected) return;
    await downloadInvoicePdf(selected.id, `${selected.invoice_number}.pdf`);
  }

  async function whatsapp() {
    if (!selected) return;
    const r = await getInvoiceWhatsappUrl(selected.id);
    if (r.data.whatsapp_url) window.open(r.data.whatsapp_url, '_blank');
    else alert('لا يوجد رقم هاتف للعميل');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="الفواتير"
        subtitle={`${fmtNumber(stats.count)} فاتورة · إجمالي مدفوع ${fmtSDG(stats.paid_value)}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الفواتير" value={fmtNumber(stats.count)} icon={Receipt} />
        <StatCard label="مدفوعة" value={fmtNumber(stats.paid)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="مصدرة (لم تدفع)" value={fmtNumber(stats.issued)} icon={Receipt} accent="text-amber-600" />
        <StatCard label="ملغية" value={fmtNumber(stats.cancelled)} icon={XCircle} accent="text-rose-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">إجمالي قيمة الفواتير المصدرة + المدفوعة</div>
          <div className="text-2xl font-extrabold text-[#0E5C3A]">{fmtSDG(stats.total_value)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">إجمالي المحصّل</div>
          <div className="text-2xl font-extrabold text-emerald-600">{fmtSDG(stats.paid_value)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm"
              placeholder="بحث برقم الفاتورة، اسم العميل، رقم الهاتف..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="issued">مصدرة</option>
            <option value="paid">مدفوعة</option>
            <option value="cancelled">ملغية</option>
            <option value="refunded">مرتجعة</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">رقم الفاتورة</th>
                <th className="py-2 font-semibold">الطلب</th>
                <th className="py-2 font-semibold">العميل</th>
                <th className="py-2 font-semibold">الإجمالي</th>
                <th className="py-2 font-semibold">الحالة</th>
                <th className="py-2 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} onClick={() => open(inv)} className="border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-900" dir="ltr">{inv.invoice_number}</td>
                  <td className="py-3 text-slate-500" dir="ltr">{inv.order?.order_number ?? '—'}</td>
                  <td className="py-3">
                    <div>{inv.customer_name}</div>
                    <div className="text-xs text-slate-500" dir="ltr">{inv.customer_phone ?? ''}</div>
                  </td>
                  <td className="py-3 font-bold text-slate-900">{fmtSDG(Number(inv.total))}</td>
                  <td className="py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] ?? ''}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 text-xs">{inv.issued_at ? new Date(inv.issued_at).toLocaleString('ar-SD') : '—'}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لم يتم إنشاء أي فاتورة بعد. يمكنك إنشاء فاتورة من تفاصيل الطلب في صفحة الطلبات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="تفاصيل الفاتورة" width="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-extrabold text-[#0E5C3A]" dir="ltr">{selected.invoice_number}</div>
                {selected.order && (
                  <div className="text-xs text-slate-500 mt-1" dir="ltr">طلب: {selected.order.order_number}</div>
                )}
                <div className="text-xs text-slate-500">طريقة الدفع: {PAYMENT_LABELS[selected.payment_method] ?? selected.payment_method}</div>
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full ${STATUS_COLORS[selected.status] ?? ''}`}>
                {STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <div className="font-bold text-slate-900">{selected.customer_name}</div>
              <div className="text-slate-600 text-xs" dir="ltr">{selected.customer_phone ?? ''} {selected.customer_email ? `· ${selected.customer_email}` : ''}</div>
              {selected.customer_address && <div className="text-slate-700 mt-1">{selected.customer_address}</div>}
            </div>

            <div className="rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-right text-slate-500">
                    <th className="p-2 font-semibold">المنتج</th>
                    <th className="p-2 font-semibold">الكمية</th>
                    <th className="p-2 font-semibold">السعر</th>
                    <th className="p-2 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items ?? []).map((it) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="p-2">{it.product_name}</td>
                      <td className="p-2">{it.quantity}</td>
                      <td className="p-2">{fmtSDG(Number(it.unit_price))}</td>
                      <td className="p-2 font-bold">{fmtSDG(Number(it.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">المجموع الفرعي</span>
                <span>{fmtSDG(Number(selected.subtotal))}</span>
              </div>
              {Number(selected.discount_amount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم</span>
                  <span>- {fmtSDG(Number(selected.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">رسوم التوصيل</span>
                <span>{fmtSDG(Number(selected.delivery_fee))}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base pt-2 border-t border-slate-200 text-[#0E5C3A]">
                <span>الإجمالي الكلي</span>
                <span>{fmtSDG(Number(selected.total))}</span>
              </div>
            </div>

            {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{error}</div>}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <button onClick={downloadPdf} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> تنزيل PDF
              </button>
              <button onClick={whatsapp} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> إرسال عبر واتساب
              </button>
              {selected.status !== 'paid' && (
                <button onClick={() => changeStatus('paid')} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-emerald-200 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Banknote className="w-4 h-4" /> تعليم كمدفوعة
                </button>
              )}
              {selected.status !== 'cancelled' && selected.status !== 'paid' && (
                <button onClick={() => changeStatus('cancelled')} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5 disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> إلغاء
                </button>
              )}
              {selected.status === 'paid' && (
                <button onClick={() => changeStatus('refunded')} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-orange-200 text-orange-600 hover:bg-orange-50 inline-flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw className="w-4 h-4" /> إنشاء إشعار دائن
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
