'use client';

import { useEffect, useState } from 'react';
import {
  listJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
  listChartOfAccounts,
  type JournalEntry,
  type ChartOfAccount,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import Drawer from '@/components/admin/Drawer';
import { Plus, Search, Trash2, Loader2, Eye } from 'lucide-react';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState<{ open: boolean; view?: JournalEntry; create?: boolean }>({ open: false });
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [form, setForm] = useState<{ description: string; date: string; notes: string; lines: { account_id: string; type: 'debit' | 'credit'; amount: string; description: string }[] }>({ description: '', date: new Date().toISOString().split('T')[0], notes: '', lines: [{ account_id: '', type: 'debit', amount: '', description: '' }] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await listJournalEntries({ q, per_page: 50 });
    setEntries(r.data);
    setMeta(r.meta);
  }

  useEffect(() => { load() }, [q]);

  async function openCreate() {
    const r = await listChartOfAccounts();
    setAccounts(r.data);
    setForm({ description: '', date: new Date().toISOString().split('T')[0], notes: '', lines: [{ account_id: '', type: 'debit', amount: '', description: '' }] });
    setDrawer({ open: true, create: true });
    setError(null);
  }

  function openView(e: JournalEntry) {
    setDrawer({ open: true, view: e, create: false });
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, { account_id: '', type: 'debit' as const, amount: '', description: '' }] }));
  }

  function removeLine(i: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  }

  function updateLine(i: number, field: string, value: string) {
    setForm((f) => ({ ...f, lines: f.lines.map((line, idx) => idx === i ? { ...line, [field]: value } : line) }));
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const lines = form.lines.map((l) => ({
        account_id: parseInt(l.account_id),
        type: l.type,
        amount: parseFloat(l.amount),
        description: l.description || null,
      }));
      await createJournalEntry({ description: form.description, date: form.date, notes: form.notes || null, lines });
      setDrawer({ open: false }); load();
    } catch (e) { setError(e instanceof AdminApiError ? e.message : 'فشل الحفظ'); }
    finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!confirm('حذف قيد اليومية هذا؟')) return;
    await deleteJournalEntry(id);
    load();
  }

  const totalDebit = form.lines.filter((l) => l.type === 'debit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalCredit = form.lines.filter((l) => l.type === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-4">
      <PageHeader title="قيود اليومية" subtitle={`${fmtNumber(meta.total)} قيد`} />

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button onClick={openCreate} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة قيد
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">الرقم</th>
                <th className="py-2 font-semibold">البيان</th>
                <th className="py-2 font-semibold">التاريخ</th>
                <th className="py-2 font-semibold">بواسطة</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openView(entry)}>
                  <td className="py-3 font-mono text-xs text-slate-500" dir="ltr">{entry.entry_number}</td>
                  <td className="py-3 text-slate-900">{entry.description}</td>
                  <td className="py-3 text-slate-600">{new Date(entry.date).toLocaleDateString('ar-SA')}</td>
                  <td className="py-3 text-slate-500 text-xs">{entry.creator?.name ?? ''}</td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => openView(entry)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => remove(entry.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">لا توجد قيود</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawer.open && !!drawer.create} onClose={() => setDrawer({ open: false })} title="إضافة قيد يومية جديد" width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">البيان</label>
            <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">التاريخ</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ملاحظات</label>
              <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-right text-slate-500">
                  <th className="p-2 font-semibold">الحساب</th>
                  <th className="p-2 font-semibold">النوع</th>
                  <th className="p-2 font-semibold">المبلغ</th>
                  <th className="p-2 font-semibold">بيان</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-1">
                      <select className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs" value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)}>
                        <option value="">اختر</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name_ar}</option>)}
                      </select>
                    </td>
                    <td className="p-1">
                      <select className="px-2 py-1.5 rounded border border-slate-200 text-xs" value={line.type} onChange={(e) => updateLine(i, 'type', e.target.value)}>
                        <option value="debit">مدين</option>
                        <option value="credit">دائن</option>
                      </select>
                    </td>
                    <td className="p-1">
                      <input type="number" min="0" className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs" placeholder="0.00" value={line.amount} onChange={(e) => updateLine(i, 'amount', e.target.value)} />
                    </td>
                    <td className="p-1">
                      <input className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs" placeholder="اختياري" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                    </td>
                    <td className="p-1">
                      {form.lines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={addLine} className="text-sm text-[#0E5C3A] font-medium hover:underline">+ إضافة سطر</button>
            {form.lines.length >= 2 && (
              <div className={`text-xs font-bold ${balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                المدين: {fmtSDG(totalDebit)} | الدائن: {fmtSDG(totalCredit)} {balanced ? '✓ متوازن' : '✗ غير متوازن'}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
          <button onClick={save} disabled={busy || !form.description || form.lines.length < 2 || !balanced} className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            إضافة القيد
          </button>
        </div>
      </Drawer>

      <Drawer open={drawer.open && !!drawer.view && !drawer.create} onClose={() => setDrawer({ open: false })} title="تفاصيل القيد" width="max-w-2xl">
        {drawer.view && (
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-extrabold text-[#0E5C3A]" dir="ltr">{drawer.view.entry_number}</div>
              <div className="text-slate-600 mt-1">{drawer.view.description}</div>
              <div className="text-xs text-slate-500 mt-1">{new Date(drawer.view.date).toLocaleDateString('ar-SA')}</div>
            </div>
            {drawer.view.notes && <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded">{drawer.view.notes}</div>}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-right text-slate-500">
                    <th className="p-2 font-semibold">الحساب</th>
                    <th className="p-2 font-semibold">نوع</th>
                    <th className="p-2 font-semibold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawer.view.lines ?? []).map((line) => (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="p-2">{line.account?.code} - {line.account?.name_ar}</td>
                      <td className="p-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${line.type === 'debit' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{line.type === 'debit' ? 'مدين' : 'دائن'}</span></td>
                      <td className="p-2 font-bold">{fmtSDG(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
