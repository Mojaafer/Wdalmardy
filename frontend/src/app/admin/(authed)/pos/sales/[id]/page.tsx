'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, XCircle, CheckCircle2, Trash } from 'lucide-react';
import { getPosSale, voidPosSale, type PosSale } from '@/lib/admin/api';
import { fmtSDG, fmtDate } from '@/lib/admin/format';

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  mobile_money: 'محفظة إلكترونية',
  card: 'بطاقة',
};

export default function PosSaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<PosSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPosSale(Number(id))
      .then((r) => setSale(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر التحميل'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVoid() {
    if (!sale) return;
    if (!confirm('هل أنت متأكد من إلغاء هذه العملية؟ سيتم إرجاع المخزون.')) return;
    setVoiding(true);
    try {
      const r = await voidPosSale(sale.id);
      setSale(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الإلغاء');
    } finally {
      setVoiding(false);
    }
  }

  if (loading) return <div className="p-6 text-slate-400">جاري التحميل…</div>;
  if (error || !sale)
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error ?? 'غير موجود'}
        </div>
      </div>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <header className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold">إيصال بيع {sale.sale_number}</h1>
          <p className="text-sm text-slate-500">
            {sale.created_at ? fmtDate(sale.created_at) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          {sale.status === 'completed' && (
            <button
              type="button"
              onClick={handleVoid}
              disabled={voiding}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 inline-flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash className="w-4 h-4" />
              إلغاء العملية
            </button>
          )}
          <Link
            href="/admin/pos"
            className="text-sm inline-flex items-center gap-1.5 text-[#0E5C3A] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            رجوع
          </Link>
        </div>
      </header>

      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none print:border-0">
        <div className="text-center mb-4 pb-4 border-b border-dashed border-slate-300">
          <h2 className="text-xl font-extrabold text-[#0E5C3A]">ود المرضي ماركت</h2>
          <p className="text-xs text-slate-500">إيصال بيع نقطة البيع</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-slate-500">رقم العملية:</span>{' '}
            <span className="font-bold">{sale.sale_number}</span>
          </div>
          <div>
            <span className="text-slate-500">التاريخ:</span>{' '}
            <span className="font-bold">
              {sale.created_at ? fmtDate(sale.created_at) : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-500">الكاشير:</span>{' '}
            <span className="font-bold">{sale.cashier?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-500">جلسة:</span>{' '}
            <span className="font-bold">#{sale.session_id}</span>
          </div>
          {sale.customer && (
            <div className="col-span-2">
              <span className="text-slate-500">العميل:</span>{' '}
              <span className="font-bold">
                {sale.customer.name} — {sale.customer.phone}
              </span>
            </div>
          )}
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الكمية</th>
              <th className="p-2 text-right">السعر</th>
              <th className="p-2 text-right">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-2">{i.product_name}</td>
                <td className="p-2">{i.quantity}</td>
                <td className="p-2">{fmtSDG(i.unit_price)}</td>
                <td className="p-2 font-bold">{fmtSDG(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">المجموع الفرعي</span>
            <span>{fmtSDG(sale.subtotal)}</span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>الخصم</span>
              <span>−{fmtSDG(sale.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-lg pt-2 border-t border-slate-300">
            <span>الإجمالي</span>
            <span className="text-[#0E5C3A]">{fmtSDG(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              وسيلة الدفع: {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
            </span>
            <span>{fmtSDG(sale.amount_paid)}</span>
          </div>
          {sale.change_given > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>المرتجع للعميل</span>
              <span>{fmtSDG(sale.change_given)}</span>
            </div>
          )}
          {sale.points_earned > 0 && (
            <div className="flex justify-between text-violet-700">
              <span>نقاط الولاء المكتسبة</span>
              <span>+{sale.points_earned}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
          {sale.status === 'voided' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">
              <XCircle className="w-4 h-4" /> مُلغاة{' '}
              {sale.voided_at ? `— ${fmtDate(sale.voided_at)}` : ''}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
              <CheckCircle2 className="w-4 h-4" /> مدفوعة
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">شكراً لتسوقكم معنا — ود المرضي ماركت</p>
        </div>
      </article>
    </div>
  );
}
