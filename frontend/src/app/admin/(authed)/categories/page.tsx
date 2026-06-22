'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  uploadCategoryImage,
  deleteCategoryImage,
  type AdminCategory,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import Drawer from '@/components/admin/Drawer';
import { Pencil, Trash2, GripVertical, Tag, Trash2 as TrashIcon, ImageIcon } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminCategory | null }>({
    open: false,
    editing: null,
  });
  const [draggingId, setDraggingId] = useState<number | null>(null);

  async function refresh() {
    const r = await listCategories();
    setItems(r.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  function onDragStart(id: number) {
    setDraggingId(id);
  }
  function onDragOver(e: React.DragEvent, overId: number) {
    e.preventDefault();
    if (draggingId === null || draggingId === overId) return;
    const fromIdx = items.findIndex((i) => i.id === draggingId);
    const toIdx = items.findIndex((i) => i.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = items.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setItems(next);
  }
  async function onDragEnd() {
    setDraggingId(null);
    await reorderCategories(items.map((i) => i.id));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة الأقسام"
        subtitle={`${fmtNumber(items.length)} قسم`}
        actionLabel="إضافة قسم"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-500">
          اسحب وأفلت لإعادة الترتيب
        </div>
        <div className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد أقسام</div>
          ) : (
            items.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => onDragStart(c.id)}
                onDragOver={(e) => onDragOver(e, c.id)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-move ${
                  draggingId === c.id ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="w-4 h-4 text-slate-400" />
                <div className="w-10 h-10 rounded-lg bg-[#FBEFE2] grid place-items-center">
                  <Tag className="w-4 h-4 text-[#0E5C3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{c.name.ar}</div>
                  <div className="text-[11px] text-slate-500">{c.name.en}</div>
                </div>
                <span className="text-xs text-slate-500">
                  {fmtNumber(c.products_count ?? 0)} منتج
                </span>
                {c.is_active ? (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    نشط
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    غير نشط
                  </span>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => setDrawer({ open: true, editing: c })}
                    className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0E5C3A] rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`حذف القسم "${c.name.ar}"؟`)) {
                        try {
                          await deleteCategory(c.id);
                          refresh();
                        } catch (err) {
                          alert(
                            err instanceof AdminApiError ? err.message : 'تعذر حذف القسم',
                          );
                        }
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل قسم' : 'إضافة قسم جديد'}
      >
        <CategoryForm
          editing={drawer.editing}
          onDone={() => {
            setDrawer({ open: false, editing: null });
            refresh();
          }}
        />
      </Drawer>
    </div>
  );
}

function CategoryForm({
  editing,
  onDone,
}: {
  editing: AdminCategory | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name_ar: editing?.name.ar ?? '',
    name_en: editing?.name.en ?? '',
    is_active: editing?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(editing?.image ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  const imageUrl = image
    ? image.startsWith('http') ? image : `${API_BASE}/storage/${image}`
    : null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const res = await uploadCategoryImage(editing.id, file);
      setImage(res.data.image);
    } catch {
      setError('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    if (!editing) return;
    setUploading(true);
    try {
      await deleteCategoryImage(editing.id);
      setImage(null);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateCategory(editing.id, form);
      else await createCategory(form);
      onDone();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(Object.values(err.errors ?? {}).flat()[0] ?? err.message);
      } else {
        setError('حدث خطأ');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">الاسم (عربي)</span>
          <input
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">الاسم (إنجليزي)</span>
          <input
            value={form.name_en}
            onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            required
            dir="ltr"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">صورة القسم (اختياري)</label>
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={imageUrl} alt="" className="w-full h-40 object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={uploading}
              className="absolute top-2 left-2 bg-rose-600 text-white p-2 rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-[#0E5C3A] transition"
          >
            <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <div className="text-sm text-slate-500">انقر لرفع الصورة</div>
            <div className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP — حد أقصى 2MB</div>
          </div>
        )}
        {!editing && (
          <p className="text-xs text-amber-600 mt-1">احفظ القسم أولاً ثم يمكنك رفع صورة</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        {uploading && <div className="text-xs text-slate-500 mt-1">جاري الرفع...</div>}
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="w-4 h-4 accent-[#0E5C3A]"
        />
        <span className="text-sm">نشط</span>
      </label>

      {error && <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة القسم'}
      </button>
    </form>
  );
}
