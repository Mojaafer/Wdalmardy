'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Receipt,
  UserPlus,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { getDashboard, type DashboardData } from '@/lib/admin/api';
import { fmtSDG, fmtNumber, fmtDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/admin/format';
import KpiCard from '@/components/admin/KpiCard';
import SalesChart from '@/components/admin/SalesChart';

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="p-4 bg-rose-50 text-rose-700 rounded-lg">{error}</div>;
  }

  if (!data) {
    return <div className="text-slate-400">جاري التحميل...</div>;
  }

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">لوحة التحكم</h1>
        <p className="text-sm text-slate-500">نظرة عامة على أداء المتجر اليوم</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="مبيعات اليوم"
          value={fmtSDG(k.sales.today)}
          today={k.sales.today}
          yesterday={k.sales.yesterday}
          icon={DollarSign}
          accent="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          label="الأرباح اليوم"
          value={fmtSDG(k.profit.today)}
          today={k.profit.today}
          yesterday={k.profit.yesterday}
          icon={TrendingUp}
          accent="bg-amber-50 text-amber-700"
        />
        <KpiCard
          label="عدد الطلبات"
          value={fmtNumber(k.orders.today)}
          today={k.orders.today}
          yesterday={k.orders.yesterday}
          icon={ShoppingBag}
          accent="bg-indigo-50 text-indigo-700"
        />
        <KpiCard
          label="متوسط الطلب"
          value={fmtSDG(k.avg_order.today)}
          today={k.avg_order.today}
          yesterday={k.avg_order.yesterday}
          icon={Receipt}
          accent="bg-sky-50 text-sky-700"
        />
        <KpiCard
          label="عملاء جدد"
          value={fmtNumber(k.new_customers.today)}
          today={k.new_customers.today}
          yesterday={k.new_customers.yesterday}
          icon={UserPlus}
          accent="bg-rose-50 text-rose-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={data.sales_series} />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">إحصائيات العملاء</h3>
          <div className="space-y-3">
            <Stat label="إجمالي العملاء" value={data.customer_stats.total} color="bg-[#0E5C3A]" />
            <Stat label="عملاء جدد (30 يوم)" value={data.customer_stats.new} color="bg-[#F26B2B]" />
            <Stat label="عملاء نشطون" value={data.customer_stats.active} color="bg-emerald-500" />
            <Stat label="عملاء عائدون" value={data.customer_stats.returning} color="bg-indigo-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">أحدث الطلبات</h3>
            <Link
              href="/admin/orders"
              className="text-xs text-[#0E5C3A] font-bold flex items-center gap-1 hover:underline"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_orders.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">لا توجد طلبات بعد</div>
            ) : (
              data.recent_orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders?focus=${o.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{o.customer_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {o.order_number} · {fmtDate(o.created_at)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-sm">{fmtSDG(o.total)}</div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        STATUS_COLORS[o.status] ?? ''
                      }`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">منتجات تحتاج إعادة تخزين</h3>
            <Link
              href="/admin/products?status=low_stock"
              className="text-xs text-[#0E5C3A] font-bold flex items-center gap-1 hover:underline"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.low_stock.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">المخزون مستقر</div>
            ) : (
              data.low_stock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FBEFE2] grid place-items-center">
                    <Package className="w-4 h-4 text-[#0E5C3A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.name_ar}</div>
                    <div className="text-[11px] text-slate-500">{p.name_en}</div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      p.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.stock === 0 ? 'نفذ' : `متبقي ${p.stock}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      <span className="font-extrabold text-slate-900">{fmtNumber(value)}</span>
    </div>
  );
}
