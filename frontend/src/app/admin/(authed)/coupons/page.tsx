'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type AdminCoupon,
  type CouponStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import { Ticket, CheckCircle2, AlertTriangle, Pencil, Trash2, Search, Copy, Target } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  scheduled: 'مجدول',
  expired: 'منتهي',
  paused: 'موقوف',
  exhausted: 'مستنفد',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-amber-100 text-amber-700',
  expired: 'bg-rose-100 text-rose-700',
  paused: 'bg-slate-200 text-slate-700',
  exhausted: 'bg-orange-100 text-orange-700',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [stats, setStats] = useState<CouponStats>({ total: 0, active: 0, expired: 0, exhausted: 0, targeted: 0 });
  const [filters, setFilters] = useState({ q: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminCoupon | null }>({
    open: false,
    editing: null,
  });

  async function refresh() {
    const r = await listCoupons({ q: filters.q });
    setCoupons(r.data);
    setStats(r.stats);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="كوبونات الخصم"
        subtitle={`${fmtNumber(stats.total)} كوبون`}
        actionLabel="إضافة كوبون جديد"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الكوبونات" value={fmtNumber(stats.total)} icon={Ticket} accent="text-[#0E5C3A]" />
        <StatCard label="كوبونات نشطة" value={fmtNumber(stats.active)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="كوبونات مستهدفة" value={fmtNumber(stats.targeted ?? 0)} icon={Target} accent="text-sky-600" />
        <StatCard label="منتهية/مستنفدة" value={fmtNumber(stats.expired + stats.exhausted)} icon={AlertTriangle} accent="text-orange-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بكود الكوبون..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">الكود</th>
                <th className="text-right px-4 py-3 font-medium">الخصم</th>
                <th className="text-right px-4 py-3 font-medium">الحد الأدنى</th>
                <th className="text-right px-4 py-3 font-medium">الاستخدام</th>
                <th className="text-right px-4 py-3 font-medium">الاستهداف</th>
                <th className="text-right px-4 py-3 font-medium">صلاحية</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">لا توجد كوبونات</td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0E5C3A]" dir="ltr">{c.code}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(c.code)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="نسخ"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#F26B2B] font-bold">
                      {c.type === 'percent'
                        ? `${c.value}%`
                        : c.type === 'free_shipping'
                          ? 'شحن مجاني'
                          : fmtSDG(c.value)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.min_order_amount > 0 ? fmtSDG(c.min_order_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.used_count}/{c.max_uses ?? '∞'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <TargetSummary coupon={c} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.ends_at ? new Date(c.ends_at).toLocaleDateString('ar-SD') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDrawer({ open: true, editing: c })}
                          title="تعديل"
                          className="p-1.5 rounded text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`حذف الكوبون "${c.code}"؟`)) return;
                            await deleteCoupon(c.id);
                            refresh();
                          }}
                          title="حذف"
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل كوبون' : 'إضافة كوبون جديد'}
      >
        <CouponForm
          editing={drawer.editing}
          onDone={() => {
            setDrawer({ open: false, editing: null });
            refresh();
          }}
        />
      </Drawer>

      {(stats.top_coupons?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="font-bold text-slate-800 mb-3">أفضل الكوبونات استخداماً</div>
          <div className="grid md:grid-cols-5 gap-2">
            {stats.top_coupons!.map((coupon) => (
              <div key={coupon.code} className="border border-slate-100 rounded-lg p-3">
                <div className="font-mono font-bold text-[#0E5C3A]" dir="ltr">{coupon.code}</div>
                <div className="text-xs text-slate-500 mt-1">{fmtNumber(coupon.used_count)} استخدام</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetSummary({ coupon }: { coupon: AdminCoupon }) {
  const parts = [
    coupon.customer_segment && coupon.customer_segment !== 'all' ? coupon.customer_segment : null,
    coupon.vip_only ? 'VIP' : null,
    coupon.geo_regions.length ? `${coupon.geo_regions.length} مناطق` : null,
    coupon.product_ids.length ? `${coupon.product_ids.length} منتجات` : null,
    coupon.seasonal_tag,
  ].filter(Boolean);

  if (parts.length === 0) return <span className="text-slate-400">كل العملاء</span>;
  return <span className="text-xs px-2 py-1 rounded-md bg-sky-50 text-sky-700">{parts.join(' · ')}</span>;
}

function CouponForm({
  editing,
  onDone,
}: {
  editing: AdminCoupon | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    code: editing?.code ?? '',
    type: editing?.type ?? 'percent',
    value: editing?.value ?? 0,
    max_discount: editing?.max_discount ?? '',
    min_order_amount: editing?.min_order_amount ?? 0,
    max_uses: editing?.max_uses ?? '',
    max_uses_per_customer: editing?.max_uses_per_customer ?? '',
    applies_to: editing?.applies_to ?? 'all',
    customer_segment: editing?.customer_segment ?? 'all',
    geo_regions: editing?.geo_regions?.join(', ') ?? '',
    product_ids: editing?.product_ids?.join(', ') ?? '',
    seasonal_tag: editing?.seasonal_tag ?? '',
    vip_only: editing?.vip_only ?? false,
    starts_at: editing?.starts_at?.slice(0, 16) ?? '',
    ends_at: editing?.ends_at?.slice(0, 16) ?? '',
    is_active: editing?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload: Record<string, unknown> = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      min_order_amount: Number(form.min_order_amount || 0),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_customer: form.max_uses_per_customer ? Number(form.max_uses_per_customer) : null,
      customer_segment: form.customer_segment,
      geo_regions: form.geo_regions.split(',').map((v) => v.trim()).filter(Boolean),
      product_ids: form.product_ids.split(',').map((v) => Number(v.trim())).filter(Boolean),
      seasonal_tag: form.seasonal_tag || null,
      vip_only: form.vip_only,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    try {
      if (editing) await updateCoupon(editing.id, payload);
      else await createCoupon(payload);
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof AdminApiError ? e.message : 'خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      {err && <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs">{err}</div>}

      <div>
        <label className="text-xs font-bold text-slate-700">كود الكوبون *</label>
        <input
          required
          dir="ltr"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="WELCOME10"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">نوع الخصم *</label>
          <select
            required
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AdminCoupon['type'] })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="percent">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
            <option value="free_shipping">شحن مجاني</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">القيمة *</label>
          <input
            type="number"
            min={0}
            required
            value={form.value}
            onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      <div className="border border-slate-100 rounded-lg p-3 space-y-3">
        <div className="font-bold text-slate-800">الاستهداف الذكي</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-slate-700">نوع العميل</label>
            <select
              value={form.customer_segment}
              onChange={(e) => setForm({ ...form, customer_segment: e.target.value as AdminCoupon['customer_segment'] })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            >
              <option value="all">كل العملاء</option>
              <option value="first_order">أول طلب</option>
              <option value="returning">عملاء عائدون</option>
              <option value="region">حسب المنطقة</option>
              <option value="seasonal">موسمي</option>
              <option value="product">منتجات محددة</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">وسم موسمي</label>
            <input
              value={form.seasonal_tag}
              onChange={(e) => setForm({ ...form, seasonal_tag: e.target.value })}
              placeholder="ramadan, eid, winter"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">المناطق المستهدفة</label>
          <input
            value={form.geo_regions}
            onChange={(e) => setForm({ ...form, geo_regions: e.target.value })}
            placeholder="الخرطوم, بحري, أم درمان"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">أرقام المنتجات</label>
          <input
            dir="ltr"
            value={form.product_ids}
            onChange={(e) => setForm({ ...form, product_ids: e.target.value })}
            placeholder="12, 18, 42"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.vip_only}
            onChange={(e) => setForm({ ...form, vip_only: e.target.checked })}
            className="rounded"
          />
          <span>VIP فقط</span>
        </label>
        <div className="text-xs text-slate-500 leading-6">
          متغيرات متاحة في الرسائل: {'{code}'}، {'{value}'}، {'{min_order}'}، {'{ends_at}'}.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">حد أقصى للخصم</label>
          <input
            type="number"
            min={0}
            value={form.max_discount}
            onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">حد أدنى للطلب</label>
          <input
            type="number"
            min={0}
            value={form.min_order_amount}
            onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">عدد الاستخدامات</label>
          <input
            type="number"
            min={1}
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">لمن؟</label>
          <select
            value={form.applies_to}
            onChange={(e) => setForm({ ...form, applies_to: e.target.value as AdminCoupon['applies_to'] })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="all">جميع العملاء</option>
            <option value="new_customers">عملاء جدد فقط</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">تاريخ البداية</label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">تاريخ النهاية</label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">الكوبون مفعّل</span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#0E5C3A] text-white rounded-lg py-2.5 font-bold disabled:opacity-60"
      >
        {submitting ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الكوبون'}
      </button>
    </form>
  );
}
