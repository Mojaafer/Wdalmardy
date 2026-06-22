'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import Drawer from '@/components/admin/Drawer';
import {
  cancelStockTransfer,
  createStockTransfer,
  dispatchStockTransfer,
  listBranches,
  listProducts,
  listStockTransfers,
  receiveStockTransfer,
  type AdminBranch,
  type AdminProduct,
  type StockTransfer,
  type StockTransferStatus,
} from '@/lib/admin/api';

const STATUS_META: Record<StockTransferStatus, { label: string; cls: string }> = {
  pending: { label: 'بانتظار', cls: 'bg-slate-100 text-slate-600' },
  in_transit: { label: 'قيد الشحن', cls: 'bg-amber-100 text-amber-700' },
  received: { label: 'تم الاستلام', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ملغي', cls: 'bg-rose-100 text-rose-700' },
};

type LineItem = { product_id: number; name_ar: string; quantity: number };

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | ''>('');
  const [drawer, setDrawer] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listStockTransfers(statusFilter ? { status: statusFilter } : {});
      setTransfers(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function act(fn: () => Promise<{ data: StockTransfer }>, id: number) {
    setBusyId(id);
    try {
      await fn();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="تحويلات المخزون"
        subtitle="نقل البضاعة بين الفروع"
        actionLabel="تحويل جديد"
        onAction={() => setDrawer(true)}
      />

      <div className="flex gap-2 flex-wrap">
        {(['', 'pending', 'in_transit', 'received', 'cancelled'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              statusFilter === s ? 'bg-[#0E5C3A] text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {s === '' ? 'الكل' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-40" />
            لا توجد تحويلات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">من / إلى</th>
                  <th className="px-4 py-3 text-right font-medium">المنتجات</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => {
                  const meta = STATUS_META[t.status];
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {t.from_branch?.name_ar ?? '—'}
                          <span className="text-slate-400 mx-1">←</span>
                          {t.to_branch?.name_ar ?? '—'}
                        </div>
                        {t.notes && <div className="text-xs text-slate-500 mt-0.5">{t.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.items_count} صنف</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {t.status === 'pending' && (
                            <button
                              disabled={busyId === t.id}
                              onClick={() => act(() => dispatchStockTransfer(t.id), t.id)}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              title="شحن"
                            >
                              {busyId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            </button>
                          )}
                          {t.status === 'in_transit' && (
                            <button
                              disabled={busyId === t.id}
                              onClick={() => act(() => receiveStockTransfer(t.id), t.id)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              title="استلام"
                            >
                              {busyId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {(t.status === 'pending' || t.status === 'in_transit') && (
                            <button
                              disabled={busyId === t.id}
                              onClick={() => {
                                if (confirm('إلغاء هذا التحويل؟')) act(() => cancelStockTransfer(t.id), t.id);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              title="إلغاء"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="تحويل مخزون جديد">
        <TransferForm
          onDone={() => {
            setDrawer(false);
            load();
          }}
        />
      </Drawer>
    </div>
  );
}

function TransferForm({ onDone }: { onDone: () => void }) {
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [fromId, setFromId] = useState<number | ''>('');
  const [toId, setToId] = useState<number | ''>('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches().then((res) => setBranches(res.data));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      listProducts({ q: search.trim(), per_page: 10 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function addProduct(p: AdminProduct) {
    if (lines.some((l) => l.product_id === p.id)) return;
    setLines([...lines, { product_id: p.id, name_ar: p.name.ar, quantity: 1 }]);
    setSearch('');
    setResults([]);
  }

  function removeLine(id: number) {
    setLines(lines.filter((l) => l.product_id !== id));
  }

  function setQty(id: number, qty: number) {
    setLines(lines.map((l) => (l.product_id === id ? { ...l, quantity: Math.max(1, qty) } : l)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fromId || !toId) {
      setError('اختر الفرع المُصدّر والمستلم.');
      return;
    }
    if (fromId === toId) {
      setError('يجب اختيار فرعين مختلفين.');
      return;
    }
    if (lines.length === 0) {
      setError('أضف منتجاً واحداً على الأقل.');
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({
        from_branch_id: Number(fromId),
        to_branch_id: Number(toId),
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        notes: notes || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء التحويل.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700">الفرع المُصدّر</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">الفرع المستلم</label>
          <select
            value={toId}
            onChange={(e) => setToId(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product picker */}
      <div className="relative">
        <label className="text-xs font-bold text-slate-700">إضافة منتج</label>
        <div className="relative mt-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم..."
            className="w-full border border-slate-200 rounded-lg pr-9 pl-3 py-2"
          />
        </div>
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-slate-50"
              >
                <Package className="w-4 h-4 text-slate-400" />
                <span className="flex-1 truncate">{p.name.ar}</span>
                <Plus className="w-3.5 h-3.5 text-[#0E5C3A]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Line items */}
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.product_id} className="flex items-center gap-2 border border-slate-200 rounded-lg p-2">
              <span className="flex-1 truncate text-xs font-medium">{l.name_ar}</span>
              <input
                type="number"
                min={1}
                value={l.quantity}
                onChange={(e) => setQty(l.product_id, Number(e.target.value))}
                className="w-16 border border-slate-200 rounded px-2 py-1 text-center text-xs"
              />
              <button type="button" onClick={() => removeLine(l.product_id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-700">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      {error && <div className="text-rose-600 text-xs bg-rose-50 rounded-lg p-2">{error}</div>}

      <button
        disabled={saving}
        className="w-full h-11 rounded-lg bg-[#0E5C3A] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
        {saving ? 'جار الإنشاء...' : 'إنشاء التحويل'}
      </button>
    </form>
  );
}
