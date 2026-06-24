'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listStockMovements,
  listLowStock,
  listProducts,
  adjustStock,
  type StockMovement,
  type LowStockProduct,
  type InventoryStats,
  type AdminProduct,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import { useBranchContext } from '@/lib/admin/branchContext';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Package,
  AlertTriangle,
  XCircle,
  Boxes,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
  Search,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  in: 'إضافة',
  out: 'سحب',
  adjustment: 'تسوية',
};
const TYPE_COLORS: Record<string, string> = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-rose-100 text-rose-700',
  adjustment: 'bg-amber-100 text-amber-700',
};
const REASON_LABELS: Record<string, string> = {
  sale: 'بيع',
  return: 'إرجاع',
  restock: 'تعبئة',
  damage: 'تلف',
  manual: 'يدوي',
};

export default function AdminInventoryPage() {
  const { currentBranchId } = useBranchContext();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ total_products: 0, low_stock: 0, out_of_stock: 0, total_stock_units: 0 });
  const [filters, setFilters] = useState({ q: '', type: '' });
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function refresh() {
    const params: Record<string, string | number> = { q: filters.q, type: filters.type };
    if (currentBranchId) params.branch_id = currentBranchId;
    const [m, l] = await Promise.all([
      listStockMovements(params),
      listLowStock(10, currentBranchId ?? undefined),
    ]);
    setMovements(m.data);
    setStats(m.stats);
    setLowStock(l.data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.type, currentBranchId]);

  async function openAdjust() {
    if (products.length === 0) {
      const r = await listProducts({ per_page: 200 });
      setProducts(r.data);
    }
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة المخزون"
        subtitle={`${fmtNumber(stats.total_products)} منتج · ${fmtNumber(stats.total_stock_units)} قطعة${activeBranch ? ' · ' + activeBranch.name_ar : ''}`}
        actionLabel="تعديل مخزون"
        onAction={openAdjust}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي المنتجات" value={fmtNumber(stats.total_products)} icon={Package} accent="text-[#0E5C3A]" />
        <StatCard label="إجمالي القطع" value={fmtNumber(stats.total_stock_units)} icon={Boxes} accent="text-emerald-600" />
        <StatCard label="مخزون منخفض" value={fmtNumber(stats.low_stock)} icon={AlertTriangle} accent="text-amber-600" />
        <StatCard label="نفد المخزون" value={fmtNumber(stats.out_of_stock)} icon={XCircle} accent="text-rose-600" />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900">تنبيهات المخزون المنخفض</h3>
            <span className="text-xs text-slate-500">(الكمية ≤ 10)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-2 font-medium">المنتج</th>
                  <th className="text-right px-4 py-2 font-medium">المخزون</th>
                  <th className="text-right px-4 py-2 font-medium">الوحدة</th>
                  <th className="text-right px-4 py-2 font-medium">السعر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/50">
                    <td className="px-4 py-2 font-medium">{p.name_ar}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${p.stock <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {fmtNumber(p.stock)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{p.unit_ar ?? '-'}</td>
                    <td className="px-4 py-2 font-mono">{fmtSDG(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالمنتج..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">كل الأنواع</option>
            <option value="in">إضافة</option>
            <option value="out">سحب</option>
            <option value="adjustment">تسوية</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">المنتج</th>
                <th className="text-right px-4 py-3 font-medium">النوع</th>
                <th className="text-right px-4 py-3 font-medium">السبب</th>
                <th className="text-right px-4 py-3 font-medium">الكمية</th>
                <th className="text-right px-4 py-3 font-medium">المخزون بعد</th>
                <th className="text-right px-4 py-3 font-medium">المرجع</th>
                <th className="text-right px-4 py-3 font-medium">المستخدم</th>
                <th className="text-right px-4 py-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">لا توجد حركات مخزون</td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{m.product?.name_ar ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[m.type]}`}>
                        {m.type === 'in' ? <ArrowUpCircle className="w-3 h-3" /> : m.type === 'out' ? <ArrowDownCircle className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{REASON_LABELS[m.reason]}</td>
                    <td className="px-4 py-3 font-mono font-bold" dir="ltr">
                      <span className={m.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.quantity >= 0 ? '+' : ''}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{fmtNumber(m.stock_after)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500" dir="ltr">
                      {m.reference_type === 'order' ? `#${m.reference_id}` : m.reference_type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.user?.name ?? 'النظام'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500" dir="ltr">
                      {new Date(m.created_at).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="تعديل المخزون">
        <AdjustForm products={products} onDone={() => { setDrawerOpen(false); refresh(); }} />
      </Drawer>
    </div>
  );
}

function AdjustForm({ products, branchId, onDone }: { products: AdminProduct[]; branchId: number | null; onDone: () => void }) {
  const [form, setForm] = useState({ product_id: '', type: 'in', reason: 'restock', quantity: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await adjustStock({
        product_id: Number(form.product_id),
        type: form.type as 'in' | 'out' | 'adjustment',
        reason: form.reason,
        quantity: Number(form.quantity),
        branch_id: branchId ?? undefined,
        notes: form.notes || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="المنتج">
        <select
          required
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">اختر منتجاً</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name.ar} (المخزون: {p.stock})</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="النوع">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="in">إضافة</option>
            <option value="out">سحب</option>
            <option value="adjustment">تسوية</option>
          </select>
        </Field>
        <Field label="السبب">
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="restock">تعبئة</option>
            <option value="return">إرجاع</option>
            <option value="damage">تلف</option>
            <option value="manual">يدوي</option>
          </select>
        </Field>
      </div>
      <Field label="الكمية">
        <input
          type="number"
          required
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          placeholder="مثال: 50"
        />
        <p className="text-xs text-slate-500 mt-1">للسحب أدخل قيمة موجبة. للتسوية يمكن استخدام قيم سالبة (-).</p>
      </Field>
      <Field label="ملاحظات (اختياري)">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#0E5C3A] text-white py-2.5 rounded-lg font-medium hover:bg-[#0a4a2e] disabled:opacity-60"
      >
        {saving ? '...جاري الحفظ' : 'حفظ الحركة'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
