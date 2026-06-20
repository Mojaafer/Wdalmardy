'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import {
  closeInventoryAuditSession,
  createInventoryAuditSession,
  getInventoryAuditSession,
  listBranches,
  listInventoryAuditSessions,
  updateInventoryAuditItem,
  type AdminBranch,
  type InventoryAuditItem,
  type InventoryAuditSession,
  type InventoryAuditTemplate,
} from '@/lib/admin/api';
import { fmtDate, fmtNumber } from '@/lib/admin/format';
import { BarChart3, Boxes, CheckCircle2, ClipboardList, Play, Save, TriangleAlert } from 'lucide-react';

const CADENCE_LABELS: Record<string, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
};

export default function InventoryAuditSessionsPage() {
  const [sessions, setSessions] = useState<InventoryAuditSession[]>([]);
  const [templates, setTemplates] = useState<InventoryAuditTemplate[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [stats, setStats] = useState({ open: 0, closed: 0, avg_accuracy: 0, variance_items: 0 });
  const [active, setActive] = useState<InventoryAuditSession | null>(null);
  const [form, setForm] = useState({ cadence: 'weekly', scope: 'all', branch_id: '' });
  const [savingItem, setSavingItem] = useState<number | null>(null);

  async function refresh() {
    const [auditRes, branchRes] = await Promise.all([listInventoryAuditSessions(), listBranches()]);
    setSessions(auditRes.data);
    setTemplates(auditRes.templates);
    setStats(auditRes.stats);
    setBranches(branchRes.data);
    setForm((prev) => ({ ...prev, branch_id: prev.branch_id || String(branchRes.data[0]?.id ?? '') }));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createSession() {
    const template = templates.find((item) => item.cadence === form.cadence && item.scope === form.scope);
    const res = await createInventoryAuditSession({
      cadence: form.cadence,
      scope: form.scope,
      branch_id: form.branch_id ? Number(form.branch_id) : undefined,
      name: template?.name,
    });
    const full = await getInventoryAuditSession(res.data.id);
    setActive(full.data);
    await refresh();
  }

  async function openSession(id: number) {
    const res = await getInventoryAuditSession(id);
    setActive(res.data);
  }

  async function saveCount(item: InventoryAuditItem, value: string) {
    const counted = Number(value);
    if (!Number.isFinite(counted) || counted < 0 || !active) return;
    setSavingItem(item.id);
    try {
      const res = await updateInventoryAuditItem(active.id, item.id, { counted_qty: counted });
      setActive({
        ...active,
        items: active.items?.map((row) => (row.id === item.id ? res.data : row)),
      });
    } finally {
      setSavingItem(null);
    }
  }

  async function closeSession(applyAdjustments: boolean) {
    if (!active) return;
    if (!confirm(applyAdjustments ? 'إغلاق الجلسة وتطبيق فروقات المخزون؟' : 'إغلاق الجلسة دون تسوية المخزون؟')) return;
    const res = await closeInventoryAuditSession(active.id, applyAdjustments);
    setActive(res.data);
    await refresh();
  }

  const activeItems = useMemo(() => active?.items ?? [], [active?.items]);
  const counted = activeItems.filter((item) => item.counted_qty !== null).length;
  const varianceItems = activeItems.filter((item) => item.variance !== 0).length;
  const accuracy = useMemo(() => {
    if (!activeItems.length || counted === 0) return active?.accuracy_rate ?? 0;
    return Math.round(((counted - varianceItems) / counted) * 1000) / 10;
  }, [activeItems, active?.accuracy_rate, counted, varianceItems]);

  return (
    <div className="space-y-4">
      <PageHeader title="جلسات الجرد السريع" subtitle="قوالب جرد، عد فعلي، فروقات، ونسبة دقة" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="جلسات مفتوحة" value={fmtNumber(stats.open)} icon={ClipboardList} accent="text-[#0E5C3A]" />
        <StatCard label="جلسات مغلقة" value={fmtNumber(stats.closed)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="متوسط الدقة" value={`${fmtNumber(stats.avg_accuracy)}%`} icon={BarChart3} accent="text-sky-600" />
        <StatCard label="بنود بها فروقات" value={fmtNumber(stats.variance_items)} icon={TriangleAlert} accent="text-rose-600" />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 grid lg:grid-cols-[1fr_160px_160px_160px] gap-3">
        <select
          value={form.branch_id}
          onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
        >
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
        </select>
        <select
          value={form.cadence}
          onChange={(e) => setForm({ ...form, cadence: e.target.value })}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
        >
          <option value="daily">يومي</option>
          <option value="weekly">أسبوعي</option>
          <option value="monthly">شهري</option>
        </select>
        <select
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
        >
          <option value="all">كل المنتجات</option>
          <option value="low_stock">المخزون المنخفض</option>
        </select>
        <button onClick={createSession} className="h-11 rounded-lg bg-[#0E5C3A] text-white font-bold inline-flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          بدء جرد
        </button>
      </div>

      <div className="grid xl:grid-cols-[320px_1fr] gap-4">
        <aside className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold">الجلسات</div>
          <div className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">لا توجد جلسات بعد</div>
            ) : sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => openSession(session.id)}
                className={`w-full p-3 text-right hover:bg-slate-50 ${active?.id === session.id ? 'bg-emerald-50' : ''}`}
              >
                <div className="font-bold text-slate-800">{session.name}</div>
                <div className="text-xs text-slate-500 mt-1">{session.branch?.name_ar ?? '—'} · {CADENCE_LABELS[session.cadence]}</div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className={session.status === 'open' ? 'text-emerald-700' : 'text-slate-500'}>
                    {session.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                  </span>
                  <span>{fmtDate(session.started_at ?? '')}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {!active ? (
            <div className="min-h-96 grid place-items-center text-slate-400">
              اختر جلسة أو ابدأ جرداً جديداً
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-slate-900">{active.name}</div>
                  <div className="text-sm text-slate-500">{active.branch?.name_ar ?? '—'} · {CADENCE_LABELS[active.cadence]}</div>
                </div>
                <div className="flex items-center gap-2">
                  <AuditPill label="البنود" value={fmtNumber(activeItems.length)} />
                  <AuditPill label="تم العد" value={fmtNumber(counted)} />
                  <AuditPill label="الدقة" value={`${accuracy}%`} />
                  {active.status === 'open' && (
                    <>
                      <button onClick={() => closeSession(false)} className="h-10 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        إغلاق
                      </button>
                      <button onClick={() => closeSession(true)} className="h-10 px-3 rounded-lg bg-[#0E5C3A] text-white font-bold">
                        إغلاق وتسوية
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-[220px_1fr] gap-4 p-4 border-b border-slate-100">
                <div className="h-40 rounded-xl bg-slate-50 grid place-items-center">
                  <div className="relative w-32 h-32 rounded-full" style={{ background: `conic-gradient(#159447 0 ${accuracy}%, #e2e8f0 ${accuracy}% 100%)` }}>
                    <div className="absolute inset-7 bg-white rounded-full grid place-items-center text-center">
                      <div>
                        <div className="font-extrabold text-xl">{accuracy}%</div>
                        <div className="text-xs text-slate-500">الدقة</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniMetric label="مطابق" value={fmtNumber(activeItems.filter((item) => item.status === 'matched').length)} />
                  <MiniMetric label="فروقات" value={fmtNumber(varianceItems)} />
                  <MiniMetric label="إجمالي الفرق" value={fmtNumber(activeItems.reduce((sum, item) => sum + item.variance, 0))} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">المنتج</th>
                      <th className="px-4 py-3 text-right font-medium">المتوقع</th>
                      <th className="px-4 py-3 text-right font-medium">العد الفعلي</th>
                      <th className="px-4 py-3 text-right font-medium">الفارق</th>
                      <th className="px-4 py-3 text-right font-medium">حفظ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeItems.map((item) => (
                      <CountRow
                        key={item.id}
                        item={item}
                        disabled={active.status !== 'open'}
                        saving={savingItem === item.id}
                        onSave={(value) => saveCount(item, value)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function CountRow({ item, disabled, saving, onSave }: { item: InventoryAuditItem; disabled: boolean; saving: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(item.counted_qty?.toString() ?? '');

  useEffect(() => {
    setValue(item.counted_qty?.toString() ?? '');
  }, [item.counted_qty]);

  const variance = value === '' ? item.variance : Number(value) - item.expected_qty;

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-bold text-slate-800">{item.product?.name_ar ?? `#${item.product_id}`}</div>
        <div className="text-xs text-slate-400" dir="ltr">{item.product?.barcode ?? ''}</div>
      </td>
      <td className="px-4 py-3">{fmtNumber(item.expected_qty)}</td>
      <td className="px-4 py-3">
        <input
          disabled={disabled}
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-50"
        />
      </td>
      <td className={`px-4 py-3 font-bold ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-sky-600' : 'text-rose-600'}`}>
        {fmtNumber(variance)}
      </td>
      <td className="px-4 py-3">
        <button disabled={disabled || saving || value === ''} onClick={() => onSave(value)} className="h-9 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold disabled:opacity-50 inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? '...' : 'حفظ'}
        </button>
      </td>
    </tr>
  );
}

function AuditPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
      {label}: {value}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <Boxes className="w-5 h-5 text-[#0E5C3A] mb-2" />
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-extrabold text-slate-800 mt-1">{value}</div>
    </div>
  );
}
