'use client';

import { useEffect, useState } from 'react';
import {
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  type ChartOfAccount,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import { Plus, Search, Pencil, Trash2, Loader2, FolderTree } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  income: 'إيرادات',
  expense: 'مصروفات',
};
const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-emerald-100 text-emerald-700',
  liability: 'bg-amber-100 text-amber-700',
  equity: 'bg-blue-100 text-blue-700',
  income: 'bg-green-100 text-green-700',
  expense: 'bg-rose-100 text-rose-700',
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [filtered, setFiltered] = useState<ChartOfAccount[]>([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [drawer, setDrawer] = useState<{ open: boolean; edit?: ChartOfAccount }>({ open: false });
  const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', type: 'expense', parent_id: '', is_active: true, description: '', sort_order: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await listChartOfAccounts();
    setAccounts(r.data);
  }

  useEffect(() => { refresh() }, []);

  useEffect(() => {
    let f = accounts;
    if (q) { const lq = q.toLowerCase(); f = f.filter((a) => a.name_ar.includes(lq) || a.name_en?.toLowerCase().includes(lq) || a.code.includes(lq)); }
    if (typeFilter) f = f.filter((a) => a.type === typeFilter);
    setFiltered(f);
  }, [accounts, q, typeFilter]);

  function openCreate() {
    setForm({ code: '', name_ar: '', name_en: '', type: 'expense', parent_id: '', is_active: true, description: '', sort_order: '0' });
    setDrawer({ open: true });
    setError(null);
  }

  function openEdit(a: ChartOfAccount) {
    setForm({ code: a.code, name_ar: a.name_ar, name_en: a.name_en ?? '', type: a.type, parent_id: a.parent_id ? String(a.parent_id) : '', is_active: a.is_active, description: a.description ?? '', sort_order: String(a.sort_order) });
    setDrawer({ open: true, edit: a });
    setError(null);
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const body = { code: form.code, name_ar: form.name_ar, name_en: form.name_en || null, type: form.type, parent_id: form.parent_id ? parseInt(form.parent_id) : null, is_active: form.is_active, description: form.description || null, sort_order: parseInt(form.sort_order) || 0 };
      if (drawer.edit) { await updateChartOfAccount(drawer.edit.id, body); }
      else { await createChartOfAccount(body); }
      setDrawer({ open: false }); refresh();
    } catch (e) { setError(e instanceof AdminApiError ? e.message : 'فشل الحفظ'); }
    finally { setBusy(false); }
  }

  async function remove(a: ChartOfAccount) {
    if (!confirm(`حذف حساب ${a.name_ar}؟`)) return;
    try { await deleteChartOfAccount(a.id); refresh(); }
    catch (e) { alert(e instanceof AdminApiError ? e.message : 'فشل الحذف'); }
  }

  const stats = { total: accounts.length, byType: Object.fromEntries(Object.keys(TYPE_LABELS).map((t) => [t, accounts.filter((a) => a.type === t).length])) };

  function renderTree(accounts: ChartOfAccount[], parentId: number | null = null, depth = 0): ChartOfAccount[] {
    return accounts.filter((a) => a.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order).flatMap((a) => {
      const children = renderTree(accounts, a.id, depth + 1);
      return [{ ...a, _depth: depth }, ...children];
    }) as (ChartOfAccount & { _depth: number })[];
  }

  const tree = renderTree(filtered);

  return (
    <div className="space-y-4">
      <PageHeader title="دليل الحسابات" subtitle={`${fmtNumber(stats.total)} حساب`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <StatCard key={key} label={label} value={fmtNumber(stats.byType[key] ?? 0)} icon={FolderTree} accent={TYPE_COLORS[key].split(' ')[1]} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button onClick={openCreate} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة حساب
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">الكود</th>
                <th className="py-2 font-semibold">الاسم</th>
                <th className="py-2 font-semibold">النوع</th>
                <th className="py-2 font-semibold">الحالة</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(tree as (ChartOfAccount & { _depth: number })[]).map((acc) => (
                <tr key={acc.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 text-slate-500 font-mono text-xs" dir="ltr">{acc.code}</td>
                  <td className="py-2.5" style={{ paddingRight: `${12 + (acc._depth ?? 0) * 20}px` }}>
                    <div className="font-medium text-slate-900">{acc.name_ar}</div>
                    {acc.name_en && <div className="text-xs text-slate-400">{acc.name_en}</div>}
                  </td>
                  <td className="py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full ${TYPE_COLORS[acc.type] ?? ''}`}>{TYPE_LABELS[acc.type] ?? acc.type}</span></td>
                  <td className="py-2.5">{acc.is_active ? <span className="text-xs text-emerald-600">نشط</span> : <span className="text-xs text-slate-400">غير نشط</span>}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(acc)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => remove(acc)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tree.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">لا توجد حسابات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawer.open} onClose={() => setDrawer({ open: false })} title={drawer.edit ? 'تعديل حساب' : 'إضافة حساب جديد'} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">الكود</label>
              <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">النوع</label>
              <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">الاسم (عربي)</label>
            <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">الاسم (إنجليزي)</label>
            <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">الحساب الأب</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
              <option value="">— بدون —</option>
              {accounts.filter((a) => a.id !== drawer.edit?.id).map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">الوصف</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ترتيب</label>
              <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm">نشط</span>
              </label>
            </div>
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
          <button onClick={save} disabled={busy || !form.code || !form.name_ar} className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {drawer.edit ? 'تحديث' : 'إضافة'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
