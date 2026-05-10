'use client';

import { useEffect, useState } from 'react';
import { Award, Coins, Crown, History, Plus, Minus } from 'lucide-react';
import {
  getLoyaltySummary,
  adjustCustomerPoints,
  type LoyaltySummary,
  type LoyaltyMovement,
} from '@/lib/admin/api';

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  earn: { label: 'كسب', cls: 'bg-emerald-100 text-emerald-700' },
  redeem: { label: 'استبدال', cls: 'bg-amber-100 text-amber-700' },
  adjust: { label: 'تعديل يدوي', cls: 'bg-sky-100 text-sky-700' },
  refund: { label: 'استرداد', cls: 'bg-violet-100 text-violet-700' },
};

export default function LoyaltyPage() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState<{ id: number; name: string } | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('100');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSign, setAdjustSign] = useState<'+' | '-'>('+');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLoyaltySummary();
      setSummary(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }

  async function submitAdjust() {
    if (!adjustOpen) return;
    const n = parseInt(adjustPoints, 10);
    if (!Number.isFinite(n) || n <= 0 || !adjustReason.trim()) {
      setError('أدخل عدد نقاط صحيح وسبب التعديل');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adjustCustomerPoints(adjustOpen.id, {
        points: adjustSign === '+' ? n : -n,
        reason: adjustReason.trim(),
      });
      setAdjustOpen(null);
      setAdjustPoints('100');
      setAdjustReason('');
      setAdjustSign('+');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-400" dir="rtl">جاري التحميل...</div>;
  }

  if (!summary) {
    return (
      <div className="text-center py-16 text-rose-500" dir="rtl">
        {error ?? 'فشل التحميل'}
      </div>
    );
  }

  const rules = summary.totals.rules;

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#0E5C3A]" />
            برنامج الولاء
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            القاعدة الحالية: 1 نقطة لكل {rules.earn_rate.toLocaleString()} ج.س
            {' · '}قيمة النقطة عند الاستبدال {rules.redeem_value} ج.س
            {' · '}الحد الأقصى للاستبدال {Math.round(rules.redeem_cap_pct * 100)}٪ من قيمة الطلب.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.tiers.map((t) => (
          <div key={t.key} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div
              className="inline-flex items-center gap-2 text-[11px] font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: `${t.color}20`, color: t.color }}
            >
              <Crown className="w-3 h-3" />
              {t.label}
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{t.count}</div>
            <div className="text-[11px] text-slate-400 mt-1">من {t.min.toLocaleString()} نقطة فأكثر</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="إجمالي العملاء" value={summary.totals.customers} />
        <KpiCard label="إجمالي النقاط الممنوحة" value={summary.totals.total_lifetime_points} icon={Coins} />
        <KpiCard label="رصيد قابل للاستبدال" value={summary.totals.outstanding_balance} icon={Coins} />
      </div>

      {/* Leaderboard */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            أعلى العملاء بالنقاط
          </h3>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">العميل</th>
                <th className="px-4 py-3 text-right">المستوى</th>
                <th className="px-4 py-3 text-right">إجمالي النقاط</th>
                <th className="px-4 py-3 text-right">الرصيد المتبقي</th>
                <th className="px-4 py-3 text-right">الطلبات</th>
                <th className="px-4 py-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.leaderboard.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-12">
                    لا يوجد عملاء بعد
                  </td>
                </tr>
              )}
              {summary.leaderboard.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-500" dir="ltr">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.tier && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${c.tier.color}20`, color: c.tier.color }}
                      >
                        {c.tier.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {c.lifetime_points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-emerald-700 font-bold">
                    {c.loyalty_points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.total_orders}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustOpen({ id: c.id, name: c.name })}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
                    >
                      تعديل النقاط
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent movements */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <header className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-800">آخر حركات النقاط</h3>
        </header>
        <ul className="divide-y divide-slate-100">
          {summary.recent_movements.length === 0 && (
            <li className="py-12 text-center text-slate-400 text-sm">لا توجد حركات بعد</li>
          )}
          {summary.recent_movements.map((m: LoyaltyMovement) => {
            const meta = TYPE_LABELS[m.type] ?? { label: m.type, cls: 'bg-slate-100 text-slate-700' };
            return (
              <li key={m.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">
                    {m.customer?.name ?? '—'}{' '}
                    <span className={`mx-2 inline-block text-[10px] px-1.5 py-0.5 rounded ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{m.reason ?? '—'}</div>
                </div>
                <div className={`font-bold ${m.points > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {m.points > 0 ? '+' : ''}
                  {m.points.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 hidden md:block">
                  {new Date(m.created_at).toLocaleDateString('ar-EG')}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {adjustOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setAdjustOpen(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <h3 className="font-bold text-slate-800 text-lg">
              تعديل نقاط — {adjustOpen.name}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdjustSign('+')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${
                  adjustSign === '+' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Plus className="w-4 h-4" /> إضافة
              </button>
              <button
                onClick={() => setAdjustSign('-')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${
                  adjustSign === '-' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Minus className="w-4 h-4" /> خصم
              </button>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              عدد النقاط
              <input
                type="number"
                min={1}
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0E5C3A]/20 focus:border-[#0E5C3A]"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              السبب
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="مثال: تعويض عن طلب متضرر"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0E5C3A]/20 focus:border-[#0E5C3A]"
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustOpen(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                onClick={submitAdjust}
                disabled={submitting}
                className="bg-[#0E5C3A] hover:bg-[#0a4a2e] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#0E5C3A]" />}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
