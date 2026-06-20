'use client';

import { useEffect, useState } from 'react';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type AdminExpense,
  type ExpenseMeta,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import { Wallet, Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'salaries', label: 'رواتب' },
  { value: 'utilities', label: 'مرافق (كهرباء/مياه)' },
  { value: 'transportation', label: 'نقل وتوصيل' },
  { value: 'marketing', label: 'تسويق وإعلانات' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'supplies', label: 'لوازم وأدوات' },
  { value: 'taxes', label: 'ضرائب' },
  { value: 'other', label: 'أخرى' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [meta, setMeta] = useState<ExpenseMeta>({ total: 0, current_page: 1, last_page: 1, per_page: 25, total_amount: 0, by_category: {} });
  const [filters, setFilters] = useState({ q: '', category: '', from: '', to: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; edit?: AdminExpense }>({ open: false });
  const [form, setForm] = useState({ category: 'other', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await listExpenses(filters);
    setExpenses(r.data);
    setMeta(r.meta);
  }

  useEffect(() => { refresh() }, [filters.q, filters.category, filters.from, filters.to]);

  function openCreate() {
    setForm({ category: 'other', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setDrawer({ open: true });
    setError(null);
  }

  function openEdit(e: AdminExpense) {
    setForm({ category: e.category, amount: String(e.amount), description: e.description ?? '', date: e.date.split('T')[0] });
    setDrawer({ open: true, edit: e });
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { category: form.category, amount: parseFloat(form.amount), description: form.description || null, date: form.date };
      if (drawer.edit) {
        await updateExpense(drawer.edit.id, body);
      } else {
        await createExpense(body);
      }
      setDrawer({ open: false });
      refresh();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'فشل الحفظ');
    } finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!confirm('حذف هذا المصروف؟')) return;
    await deleteExpense(id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="المصروفات" subtitle={`إجمالي ${fmtSDG(meta.total_amount)} · ${fmtNumber(meta.total)} مصروف`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي المصروفات" value={fmtSDG(meta.total_amount)} icon={Wallet} />
        {Object.entries(meta.by_category).slice(0, 3).map(([cat, amount]) => (
          <StatCard key={cat} label={CATEGORY_LABEL[cat] ?? cat} value={fmtSDG(amount)} icon={Wallet} accent="text-amber-600" />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="بحث..." value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">كل التصنيفات</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input type="date" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <input type="date" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          <button onClick={openCreate} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة مصروف
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">التاريخ</th>
                <th className="py-2 font-semibold">التصنيف</th>
                <th className="py-2 font-semibold">البيان</th>
                <th className="py-2 font-semibold">المبلغ</th>
                <th className="py-2 font-semibold">بواسطة</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 text-slate-600">{new Date(exp.date).toLocaleDateString('ar-SA')}</td>
                  <td className="py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{CATEGORY_LABEL[exp.category] ?? exp.category}</span></td>
                  <td className="py-3 text-slate-900">{exp.description || '—'}</td>
                  <td className="py-3 font-bold text-rose-600">{fmtSDG(exp.amount)}</td>
                  <td className="py-3 text-slate-500 text-xs">{exp.creator?.name ?? ''}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(exp)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => remove(exp.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">لا توجد مصروفات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawer.open} onClose={() => setDrawer({ open: false })} title={drawer.edit ? 'تعديل مصروف' : 'إضافة مصروف جديد'} width="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">التصنيف</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">المبلغ</label>
            <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">البيان</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">التاريخ</label>
            <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
          <button onClick={save} disabled={busy || !form.amount} className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {drawer.edit ? 'تحديث' : 'إضافة'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
