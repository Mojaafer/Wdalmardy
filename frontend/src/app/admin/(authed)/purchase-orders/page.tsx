'use client';

import { useEffect, useState } from 'react';
import {
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  listSuppliers,
  listProducts,
  type PurchaseOrder,
  type PurchaseOrderMeta,
  type AdminSupplier,
  type AdminProduct,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import { ShoppingBag, Plus, Search, Eye, Trash2, Loader2, Send, CheckCircle2, XCircle, Package } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  sent: 'مرسل',
  confirmed: 'مؤكد',
  received: 'مستلم',
  cancelled: 'ملغي',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-amber-100 text-amber-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const STATUS_ACTIONS: { status: string; label: string; icon: typeof Send; from: string[] }[] = [
  { status: 'sent', label: 'إرسال', icon: Send, from: ['draft'] },
  { status: 'confirmed', label: 'تأكيد', icon: CheckCircle2, from: ['sent'] },
  { status: 'received', label: 'استلام', icon: Package, from: ['confirmed'] },
  { status: 'cancelled', label: 'إلغاء', icon: XCircle, from: ['draft', 'sent', 'confirmed'] },
];

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [meta, setMeta] = useState<PurchaseOrderMeta>({ total: 0, current_page: 1, last_page: 1, total_pending: 0, total_received: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; create?: boolean; view?: PurchaseOrder }>({ open: false });
  const [form, setForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '1', unit_price: '' }] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await listPurchaseOrders(filters);
    setOrders(r.data);
    setMeta(r.meta);
  }

  useEffect(() => { refresh() }, [filters.q, filters.status]);

  async function openCreate() {
    const [s, p] = await Promise.all([listSuppliers({ per_page: 200 }), listProducts({ per_page: 200 })]);
    setSuppliers(s.data);
    setProducts(p.data);
    setForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '1', unit_price: '' }] });
    setDrawer({ open: true, create: true });
    setError(null);
  }

  function openView(po: PurchaseOrder) {
    setDrawer({ open: true, view: po, create: false });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { product_id: '', quantity: '1', unit_price: '' }] }));
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }

  function updateItem(i: number, field: string, value: string) {
    setForm((f) => {
      const items = f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item);
      return { ...f, items };
    });
  }

  function onProductSelect(i: number, productId: string) {
    const p = products.find((x) => x.id === parseInt(productId));
    updateItem(i, 'product_id', productId);
    if (p) updateItem(i, 'unit_price', String(p.price));
  }

  const subtotal = form.items.reduce((s, i) => s + (parseInt(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

  async function save() {
    setBusy(true); setError(null);
    try {
      const items = form.items.map((i) => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) }));
      await createPurchaseOrder({ supplier_id: parseInt(form.supplier_id), notes: form.notes || null, items });
      setDrawer({ open: false }); refresh();
    } catch (e) { setError(e instanceof AdminApiError ? e.message : 'فشل الحفظ'); }
    finally { setBusy(false); }
  }

  async function changeStatus(po: PurchaseOrder, status: string) {
    if (status === 'cancelled' && !confirm('إلغاء أمر الشراء هذا؟')) return;
    setBusy(true);
    try { await updatePurchaseOrderStatus(po.id, status); refresh(); setDrawer({ open: false }); }
    catch (e) { alert(e instanceof AdminApiError ? e.message : 'فشل التحديث'); }
    finally { setBusy(false); }
  }

  async function remove(po: PurchaseOrder) {
    if (!confirm('حذف أمر الشراء هذا؟')) return;
    try { await deletePurchaseOrder(po.id); refresh(); }
    catch (e) { alert(e instanceof AdminApiError ? e.message : 'فشل الحذف'); }
  }

  const canAction = (po: PurchaseOrder, from: string[]) => from.includes(po.status);

  return (
    <div className="space-y-4">
      <PageHeader title="أوامر الشراء" subtitle={`معلق ${fmtSDG(meta.total_pending)} · مستلم ${fmtSDG(meta.total_received)}`} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="إجمالي الطلبات" value={fmtNumber(meta.total)} icon={ShoppingBag} />
        <StatCard label="قيمة المعلقة" value={fmtSDG(meta.total_pending)} icon={ShoppingBag} accent="text-amber-600" />
        <StatCard label="قيمة المستلمة" value={fmtSDG(meta.total_received)} icon={Package} accent="text-emerald-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="بحث..." value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button onClick={openCreate} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> أمر شراء جديد
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">رقم الأمر</th>
                <th className="py-2 font-semibold">المورد</th>
                <th className="py-2 font-semibold">الإجمالي</th>
                <th className="py-2 font-semibold">الحالة</th>
                <th className="py-2 font-semibold">التاريخ</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-mono text-xs text-slate-500 cursor-pointer" dir="ltr" onClick={() => openView(po)}>{po.po_number}</td>
                  <td className="py-3 cursor-pointer" onClick={() => openView(po)}>{po.supplier?.name ?? '—'}</td>
                  <td className="py-3 font-bold cursor-pointer" onClick={() => openView(po)}>{fmtSDG(po.total)}</td>
                  <td className="py-3 cursor-pointer" onClick={() => openView(po)}><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[po.status] ?? ''}`}>{STATUS_LABELS[po.status] ?? po.status}</span></td>
                  <td className="py-3 text-slate-500 text-xs cursor-pointer" onClick={() => openView(po)}>{new Date(po.created_at).toLocaleDateString('ar-SA')}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openView(po)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button onClick={() => remove(po)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">لا توجد أوامر شراء</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawer.open && !!drawer.create} onClose={() => setDrawer({ open: false })} title="أمر شراء جديد" width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">المورد</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">اختر المورد</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-right text-slate-500">
                  <th className="p-2 font-semibold">المنتج</th>
                  <th className="p-2 font-semibold">الكمية</th>
                  <th className="p-2 font-semibold">سعر الوحدة</th>
                  <th className="p-2 font-semibold">الإجمالي</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => {
                  const lineTotal = (parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-1">
                        <select className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs" value={item.product_id} onChange={(e) => onProductSelect(i, e.target.value)}>
                          <option value="">اختر</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name.ar}</option>)}
                        </select>
                      </td>
                      <td className="p-1"><input type="number" min="1" className="w-16 px-2 py-1.5 rounded border border-slate-200 text-xs" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} /></td>
                      <td className="p-1"><input type="number" min="0" className="w-24 px-2 py-1.5 rounded border border-slate-200 text-xs" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} /></td>
                      <td className="p-1 font-bold text-xs">{fmtSDG(lineTotal)}</td>
                      <td className="p-1">{form.items.length > 1 && <button onClick={() => removeItem(i)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={addItem} className="text-sm text-[#0E5C3A] font-medium hover:underline">+ إضافة منتج</button>

          <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-3">
            <span>الإجمالي</span>
            <span>{fmtSDG(subtotal)}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">ملاحظات</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
          <button onClick={save} disabled={busy || !form.supplier_id || form.items.some((i) => !i.product_id || !i.quantity || !i.unit_price)} className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            إنشاء أمر الشراء
          </button>
        </div>
      </Drawer>

      <Drawer open={drawer.open && !!drawer.view && !drawer.create} onClose={() => setDrawer({ open: false })} title="تفاصيل أمر الشراء" width="max-w-2xl">
        {drawer.view && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-extrabold text-[#0E5C3A]" dir="ltr">{drawer.view.po_number}</div>
                <div className="text-slate-600 mt-1">{drawer.view.supplier?.name}</div>
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full ${STATUS_COLORS[drawer.view.status] ?? ''}`}>{STATUS_LABELS[drawer.view.status] ?? drawer.view.status}</span>
            </div>

            {drawer.view.notes && <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded">{drawer.view.notes}</div>}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-right text-slate-500">
                    <th className="p-2 font-semibold">المنتج</th>
                    <th className="p-2 font-semibold">الكمية</th>
                    <th className="p-2 font-semibold">المستلم</th>
                    <th className="p-2 font-semibold">سعر الوحدة</th>
                    <th className="p-2 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawer.view.items ?? []).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="p-2">{item.product?.name_ar ?? '—'}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.received_quantity}</td>
                      <td className="p-2">{fmtSDG(item.unit_price)}</td>
                      <td className="p-2 font-bold">{fmtSDG(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-3">
              <span>الإجمالي</span>
              <span>{fmtSDG(drawer.view.total)}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              {STATUS_ACTIONS.filter((a) => canAction(drawer.view!, a.from)).map((action) => (
                <button key={action.status} onClick={() => changeStatus(drawer.view!, action.status)} disabled={busy} className="px-4 py-2 rounded-lg text-sm border font-bold inline-flex items-center gap-1.5 disabled:opacity-50 border-[#0E5C3A] text-[#0E5C3A] hover:bg-slate-50">
                  <action.icon className="w-4 h-4" /> {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
