'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ListChecks,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  Boxes,
  XCircle,
  Printer,
} from 'lucide-react';
import { getPosZReport, type PosZReport } from '@/lib/admin/api';
import { fmtSDG } from '@/lib/admin/format';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');

const METHOD_LABELS: Record<string, { label: string; cls: string }> = {
  cash: { label: 'نقدي', cls: 'text-emerald-700' },
  mobile_money: { label: 'محفظة إلكترونية', cls: 'text-sky-700' },
  card: { label: 'بطاقة', cls: 'text-violet-700' },
};

function methodIcon(m: string) {
  if (m === 'cash') return <Banknote className="w-4 h-4" />;
  if (m === 'mobile_money') return <Smartphone className="w-4 h-4" />;
  return <CreditCard className="w-4 h-4" />;
}

export default function PosZReportPage() {
  const [report, setReport] = useState<PosZReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((res) => {
        const url = res.data?.store_logo as string | undefined;
        if (url) {
          setLogoUrl(url.startsWith('http') ? url : `${API_BASE}/storage/${url}`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPosZReport(date)
      .then((r) => setReport(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر التحميل'))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="p-6" dir="rtl">
      <header className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-[#0E5C3A]" />
          <h1 className="text-2xl font-extrabold">تقرير Z اليومي</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          <Link
            href="/admin/pos"
            className="text-sm inline-flex items-center gap-1.5 text-[#0E5C3A] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            الواجهة
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {loading || !report ? (
        <div className="text-slate-400">جاري التحميل…</div>
      ) : (
        <div className="space-y-6">
          <div className="text-center print:block hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="ود المرضي ماركت" className="h-12 w-auto object-contain mx-auto mb-2" />
            ) : (
              <h2 className="text-xl font-extrabold">ود المرضي ماركت — تقرير Z</h2>
            )}
            <p className="text-sm text-slate-600">{report.date}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              icon={<Receipt className="w-5 h-5" />}
              label="عدد العمليات"
              value={report.total_sales.toLocaleString('ar-SD')}
              cls="bg-emerald-50 text-emerald-700"
            />
            <Stat
              icon={<Banknote className="w-5 h-5" />}
              label="إجمالي المبيعات"
              value={fmtSDG(report.total_revenue)}
              cls="bg-sky-50 text-sky-700"
            />
            <Stat
              icon={<Boxes className="w-5 h-5" />}
              label="عدد الأصناف المباعة"
              value={report.total_items.toLocaleString('ar-SD')}
              cls="bg-violet-50 text-violet-700"
            />
            <Stat
              icon={<XCircle className="w-5 h-5" />}
              label="عمليات مُلغاة"
              value={report.voids.toLocaleString('ar-SD')}
              cls="bg-amber-50 text-amber-700"
            />
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <header className="p-4 border-b border-slate-100 font-bold">
              المبيعات حسب وسيلة الدفع
            </header>
            {report.by_payment_method.length === 0 ? (
              <div className="p-8 text-center text-slate-400">لا توجد عمليات</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-right font-semibold">الوسيلة</th>
                    <th className="p-3 text-right font-semibold">عدد العمليات</th>
                    <th className="p-3 text-right font-semibold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_payment_method.map((r) => {
                    const m = METHOD_LABELS[r.method] ?? { label: r.method, cls: '' };
                    return (
                      <tr key={r.method} className="border-t border-slate-100">
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-2 font-semibold ${m.cls}`}>
                            {methodIcon(r.method)}
                            {m.label}
                          </span>
                        </td>
                        <td className="p-3">{r.count}</td>
                        <td className="p-3 font-bold">{fmtSDG(r.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <header className="p-4 border-b border-slate-100 font-bold">
              المبيعات حسب الكاشير
            </header>
            {report.by_cashier.length === 0 ? (
              <div className="p-8 text-center text-slate-400">لا توجد عمليات</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-right font-semibold">الموظف</th>
                    <th className="p-3 text-right font-semibold">عدد العمليات</th>
                    <th className="p-3 text-right font-semibold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_cashier.map((r) => (
                    <tr key={r.cashier_id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">{r.cashier_name}</td>
                      <td className="p-3">{r.count}</td>
                      <td className="p-3 font-bold">{fmtSDG(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  cls,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${cls}`}>{icon}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
