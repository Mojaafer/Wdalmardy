'use client';

import { useEffect, useMemo, useState, useRef, FormEvent } from 'react';
import {
  listProducts,
  listCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  type AdminProduct,
  type AdminCategory,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtSDG, fmtNumber } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import Drawer from '@/components/admin/Drawer';
import { Pencil, Trash2, Search, Package } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [meta, setMeta] = useState<{ total: number; current_page: number; last_page: number }>({
    total: 0,
    current_page: 1,
    last_page: 1,
  });
  const [filters, setFilters] = useState({ q: '', category: '', status: '', page: 1 });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminProduct | null }>({
    open: false,
    editing: null,
  });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [pr, cats] = await Promise.all([
        listProducts({
          q: filters.q,
          category: filters.category,
          status: filters.status,
          page: filters.page,
        }),
        categories.length ? Promise.resolve({ data: categories }) : listCategories(),
      ]);
      setProducts(pr.data);
      setMeta(pr.meta);
      if (!categories.length) setCategories(cats.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.category, filters.status, filters.page]);

  const stats = useMemo(
    () => ({
      total: meta.total,
      active: products.filter((p) => p.is_active).length,
      lowStock: products.filter((p) => p.stock < 10 && p.stock > 0).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
    }),
    [products, meta],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة المنتجات"
        subtitle={`إجمالي ${fmtNumber(meta.total)} منتج`}
        actionLabel="إضافة منتج"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي المنتجات" value={fmtNumber(stats.total)} color="text-[#0E5C3A]" />
        <StatCard label="منتجات نشطة" value={fmtNumber(stats.active)} color="text-emerald-600" />
        <StatCard label="مخزون منخفض" value={fmtNumber(stats.lowStock)} color="text-amber-600" />
        <StatCard label="نفد المخزون" value={fmtNumber(stats.outOfStock)} color="text-rose-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الباركود..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E5C3A] focus:border-transparent outline-none"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
            className="border border-slate-200 rounded-lg text-sm px-3 py-2"
          >
            <option value="">كل الأقسام</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name.ar}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="border border-slate-200 rounded-lg text-sm px-3 py-2"
          >
            <option value="">كل الحالات</option>
            <option value="in_stock">متوفر</option>
            <option value="low_stock">مخزون منخفض</option>
            <option value="out_of_stock">نفد المخزون</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">المنتج</th>
                <th className="text-right px-4 py-3 font-medium">القسم</th>
                <th className="text-right px-4 py-3 font-medium">السعر</th>
                <th className="text-right px-4 py-3 font-medium">السعر قبل الخصم</th>
                <th className="text-right px-4 py-3 font-medium">المخزون</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    جاري التحميل...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FBEFE2] grid place-items-center shrink-0">
                          <Package className="w-4 h-4 text-[#0E5C3A]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{p.name.ar}</div>
                          <div className="text-[11px] text-slate-500 truncate">{p.unit.ar}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.category?.name.ar ?? '—'}</td>
                    <td className="px-4 py-3 font-bold">{fmtSDG(p.price)}</td>
                    <td className="px-4 py-3 text-slate-400 line-through">
                      {p.compare_at_price ? fmtSDG(p.compare_at_price) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.stock} />
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          غير نشط
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDrawer({ open: true, editing: p })}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0E5C3A] rounded"
                          aria-label="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`حذف المنتج "${p.name.ar}"؟`)) {
                              await deleteProduct(p.id);
                              refresh();
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          aria-label="حذف"
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

        {meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              صفحة {meta.current_page} من {meta.last_page}
            </span>
            <div className="flex gap-1">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
              >
                السابق
              </button>
              <button
                disabled={filters.page >= meta.last_page}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل منتج' : 'إضافة منتج جديد'}
      >
        <ProductForm
          editing={drawer.editing}
          categories={categories}
          onDone={() => {
            setDrawer({ open: false, editing: null });
            refresh();
          }}
        />
      </Drawer>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded">نفد ({stock})</span>;
  if (stock < 10)
    return <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">منخفض ({stock})</span>;
  return <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{stock}</span>;
}

function ProductForm({
  editing,
  categories,
  onDone,
}: {
  editing: AdminProduct | null;
  categories: AdminCategory[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    category_id: editing?.category?.id ?? categories[0]?.id ?? 0,
    name_ar: editing?.name.ar ?? '',
    name_en: editing?.name.en ?? '',
    description_ar: editing?.description.ar ?? '',
    description_en: editing?.description.en ?? '',
    unit_ar: editing?.unit.ar ?? '',
    unit_en: editing?.unit.en ?? '',
    barcode: editing?.barcode ?? '',
    price: editing?.price ?? 0,
    compare_at_price: editing?.compare_at_price ?? '',
    stock: editing?.stock ?? 0,
    is_featured: editing?.is_featured ?? false,
    is_active: editing?.is_active ?? true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(editing?.image ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      barcode: form.barcode?.trim() ? form.barcode.trim() : null,
      compare_at_price:
        form.compare_at_price === '' || form.compare_at_price === null
          ? null
          : Number(form.compare_at_price),
      price: Number(form.price),
      stock: Number(form.stock),
    };
    try {
      let productId = editing?.id;
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        const created = await createProduct(payload);
        productId = created.data.id;
      }
      if (selectedFile && productId) {
        setUploadingImage(true);
        await uploadProductImage(productId, selectedFile);
      }
      onDone();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(Object.values(err.errors ?? {}).flat()[0] ?? err.message);
      } else {
        setError('حدث خطأ');
      }
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleRemoveImage() {
    if (editing?.id) {
      setSaving(true);
      try {
        await deleteProductImage(editing.id);
        setSelectedFile(null);
        setPreviewUrl(null);
      } catch (err) {
        if (err instanceof AdminApiError) {
          setError(Object.values(err.errors ?? {}).flat()[0] ?? err.message);
        }
      } finally {
        setSaving(false);
      }
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="القسم">
        <select
          value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) }))}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.ar}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الاسم بالعربية">
          <input
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
        <Field label="الاسم بالإنجليزية">
          <input
            value={form.name_en}
            onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            dir="ltr"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الوحدة (عربي)">
          <input
            value={form.unit_ar}
            onChange={(e) => setForm((f) => ({ ...f, unit_ar: e.target.value }))}
            placeholder="مثال: 1 كيلو"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
        <Field label="الوحدة (إنجليزي)">
          <input
            value={form.unit_en}
            onChange={(e) => setForm((f) => ({ ...f, unit_en: e.target.value }))}
            placeholder="e.g. 1 kg"
            dir="ltr"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
      </div>

      <Field label="الصورة">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="product preview"
              className="w-32 h-32 object-cover rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full text-xs grid place-items-center shadow"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-[#0E5C3A] hover:text-[#0E5C3A] grid place-items-center text-sm transition-colors"
          >
            اختر صورة
          </button>
        )}
        {selectedFile && (
          <p className="text-xs text-slate-500 mt-1">{selectedFile.name}</p>
        )}
      </Field>

      <Field label="رقم الباركود (اختياري)">
        <input
          value={form.barcode ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
          placeholder="EAN-13 — اتركه فارغاً للتوليد التلقائي من شاشة الباركود"
          dir="ltr"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="السعر (ج.س)">
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
        <Field label="السعر قبل الخصم">
          <input
            type="number"
            step="0.01"
            value={form.compare_at_price as string | number}
            onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
        <Field label="المخزون">
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </Field>
      </div>

      <Field label="الوصف بالعربية">
        <textarea
          value={form.description_ar ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>

      <Field label="الوصف بالإنجليزية">
        <textarea
          value={form.description_en ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
          rows={3}
          dir="ltr"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>

      <div className="flex gap-4">
        <Toggle
          label="نشط"
          checked={form.is_active}
          onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
        />
        <Toggle
          label="مميز"
          checked={form.is_featured}
          onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
        />
      </div>

      {error && <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3">{error}</div>}

      <button
        type="submit"
        disabled={saving || uploadingImage}
        className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg disabled:opacity-60"
      >
        {saving || uploadingImage ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#0E5C3A]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
