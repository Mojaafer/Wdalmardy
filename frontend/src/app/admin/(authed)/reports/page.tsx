'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, ShoppingCart, Users, Wallet, TrendingUp, Percent } from 'lucide-react';
import {
  getReportSummary,
  type ReportRange,
  type ReportSummary,
} from '@/lib/admin/api';

const RANGES: { value: ReportRange; label: string }[] = [
  { value: '7d', label: '٧ أيام' },
  { value: '30d', label: '٣٠ يوم' },
  { value: '90d', label: '٩٠ يوم' },
  { value: 'mtd', label: 'هذا الشهر' },
  { value: 'ytd', label: 'هذا العام' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  preparing: 'قيد التحضير',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const PIE_COLORS = ['#0E5C3A', '#F26B2B', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#6B7280'];

function formatNumber(v: number): string {
  return Number(v ?? 0).toLocaleString('ar-SD');
}
function formatCurrency(v: number): string {
  return `${formatNumber(v)} ج.س`;
}

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>('30d');
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReportSummary(range)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل التقرير');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const salesChartData = useMemo(() => {
    if (!data) return [];
    return data.sales_by_day.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('ar-SD', { day: 'numeric', month: 'short' }),
    }));
  }, [data]);

  const statusPie = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.orders_by_status).map(([status, cnt]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: cnt,
      key: status,
    }));
  }, [data]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0E5C3A]" />
            التقارير والتحليلات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مبيعات، أرباح، أفضل المنتجات والعملاء
            {data && ` — من ${data.from} إلى ${data.to}`}
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                range === r.value
                  ? 'bg-[#0E5C3A] text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi
              label="إجمالي المبيعات"
              value={formatCurrency(data.totals.sales)}
              icon={<Wallet className="w-5 h-5" />}
              tone="emerald"
            />
            <Kpi
              label="عدد الطلبات"
              value={formatNumber(data.totals.orders)}
              icon={<ShoppingCart className="w-5 h-5" />}
              tone="blue"
            />
            <Kpi
              label="متوسط الطلب"
              value={formatCurrency(data.totals.avg_order)}
              icon={<TrendingUp className="w-5 h-5" />}
              tone="indigo"
            />
            <Kpi
              label="عملاء جدد"
              value={formatNumber(data.totals.new_customers)}
              icon={<Users className="w-5 h-5" />}
              tone="amber"
            />
            <Kpi
              label="إجمالي الخصومات"
              value={formatCurrency(data.totals.discount)}
              icon={<Percent className="w-5 h-5" />}
              tone="rose"
            />
            <Kpi
              label="الأرباح المقدرة"
              value={formatCurrency(data.totals.estimated_profit)}
              icon={<TrendingUp className="w-5 h-5" />}
              tone="emerald"
              hint="15% من المبيعات"
            />
          </div>

          {/* Sales over time */}
          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3">المبيعات اليومية</h3>
            {salesChartData.length === 0 ? (
              <div className="text-center text-slate-400 py-12">لا توجد مبيعات في هذه الفترة</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="reportSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0E5C3A" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0E5C3A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} reversed />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      orientation="right"
                      tickFormatter={(v: unknown) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{ direction: 'rtl', borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), 'المبيعات']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#0E5C3A"
                      strokeWidth={2}
                      fill="url(#reportSalesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top products */}
            <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">أفضل المنتجات مبيعاً</h3>
              {data.top_products.length === 0 ? (
                <div className="text-center text-slate-400 py-12">لا توجد بيانات</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={data.top_products} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#475569', fontSize: 12 }}
                        width={140}
                        orientation="right"
                      />
                      <Tooltip
                        contentStyle={{ direction: 'rtl', borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
                      />
                      <Bar dataKey="revenue" fill="#0E5C3A" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Revenue by category */}
            <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">الإيرادات حسب القسم</h3>
              {data.revenue_by_category.length === 0 ? (
                <div className="text-center text-slate-400 py-12">لا توجد بيانات</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={data.revenue_by_category}
                        dataKey="revenue"
                        nameKey="name"
                        outerRadius={90}
                        label={(e: { name?: string }) => e.name ?? ''}
                      >
                        {data.revenue_by_category.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ direction: 'rtl', borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
                      />
                      <Legend wrapperStyle={{ direction: 'rtl' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top customers */}
            <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">أفضل العملاء</h3>
              {data.top_customers.length === 0 ? (
                <div className="text-center text-slate-400 py-12">لا توجد بيانات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-slate-500 border-b border-slate-100">
                        <th className="py-2">الاسم</th>
                        <th className="py-2">الطلبات</th>
                        <th className="py-2">الإيراد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_customers.map((c) => (
                        <tr key={c.customer_id} className="border-b border-slate-50">
                          <td className="py-2 font-semibold text-slate-800">{c.name}</td>
                          <td className="py-2 text-slate-600">{formatNumber(c.orders_count)}</td>
                          <td className="py-2 font-bold text-emerald-700">{formatCurrency(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Orders by status */}
            <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">الطلبات حسب الحالة</h3>
              {statusPie.length === 0 ? (
                <div className="text-center text-slate-400 py-12">لا توجد طلبات</div>
              ) : (
                <ul className="space-y-2">
                  {statusPie.map((s, i) => (
                    <li
                      key={s.key}
                      className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-slate-700">{s.name}</span>
                      </span>
                      <span className="font-bold text-slate-900">{formatNumber(s.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose';
  hint?: string;
}) {
  const TONES: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-slate-500">{label}</span>
        <span className={['p-1.5 rounded-md', TONES[tone]].join(' ')}>{icon}</span>
      </div>
      <div className="font-extrabold text-slate-900 text-lg">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
