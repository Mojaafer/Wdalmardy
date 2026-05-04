'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import {
  listPages,
  createPage,
  updatePage,
  deletePage,
  type AdminPage,
  type PageStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  FileText,
  CheckCircle2,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  Bold,
  Italic,
  List as ListIcon,
  ListOrdered,
  Heading1,
  Heading2,
  Quote as QuoteIcon,
  Undo2,
  Redo2,
  Eye,
} from 'lucide-react';

const SLUG_OPTIONS = [
  { value: 'about', label: 'من نحن' },
  { value: 'privacy', label: 'سياسة الخصوصية' },
  { value: 'terms', label: 'الشروط والأحكام' },
  { value: 'faq', label: 'الأسئلة الشائعة' },
  { value: 'shipping', label: 'سياسة التوصيل' },
  { value: 'returns', label: 'سياسة الإرجاع' },
];

type FormState = {
  id?: number;
  slug: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  meta_description: string;
  is_published: boolean;
};

const EMPTY: FormState = {
  slug: '',
  title_ar: '',
  title_en: '',
  body_ar: '',
  meta_description: '',
  is_published: true,
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [stats, setStats] = useState<PageStats>({ total: 0, published: 0, draft: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function refresh() {
    const r = await listPages(filters);
    setPages(r.data);
    setStats(r.meta);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status]);

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(p: AdminPage) {
    setForm({
      id: p.id,
      slug: p.slug,
      title_ar: p.title_ar,
      title_en: p.title_en ?? '',
      body_ar: p.body_ar ?? '',
      meta_description: p.meta_description ?? '',
      is_published: p.is_published,
    });
    setError(null);
    setDrawerOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        slug: form.slug,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        body_ar: form.body_ar,
        meta_description: form.meta_description || null,
        is_published: form.is_published,
      };
      if (form.id) await updatePage(form.id, body);
      else await createPage(body);
      setDrawerOpen(false);
      await refresh();
    } catch (e) {
      if (e instanceof AdminApiError) setError(e.message);
      else setError('حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm('حذف الصفحة؟')) return;
    await deletePage(id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="الصفحات"
        subtitle={`${fmtNumber(stats.total)} صفحة (${fmtNumber(stats.published)} منشورة)`}
        actionLabel="إضافة صفحة"
        onAction={openCreate}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="إجمالي الصفحات" value={fmtNumber(stats.total)} icon={FileText} />
        <StatCard label="منشورة" value={fmtNumber(stats.published)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="مسودة" value={fmtNumber(stats.draft)} icon={FileText} accent="text-amber-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm"
              placeholder="بحث في الصفحات..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">كل الحالات</option>
            <option value="published">منشورة</option>
            <option value="draft">مسودة</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">العنوان</th>
                <th className="py-2 font-semibold">الرابط</th>
                <th className="py-2 font-semibold">الحالة</th>
                <th className="py-2 font-semibold">آخر تحديث</th>
                <th className="py-2 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-900">{p.title_ar}</td>
                  <td className="py-3 text-slate-500" dir="ltr">/{p.slug}</td>
                  <td className="py-3">
                    {p.is_published ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">منشورة</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">مسودة</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-500 text-xs">{new Date(p.updated_at).toLocaleString('ar-SD')}</td>
                  <td className="py-3 flex items-center gap-1">
                    <a
                      href={`/ar/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                      title="عرض على المتجر"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا توجد صفحات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={form.id ? 'تعديل صفحة' : 'صفحة جديدة'}
        width="max-w-3xl"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{error}</div>}

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="الرابط (slug)" required>
              <select
                required
                className="input"
                value={SLUG_OPTIONS.find((o) => o.value === form.slug) ? form.slug : '__custom__'}
                onChange={(e) => {
                  if (e.target.value === '__custom__') setForm((f) => ({ ...f, slug: '' }));
                  else setForm((f) => ({ ...f, slug: e.target.value }));
                }}
              >
                <option value="">اختر…</option>
                {SLUG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} (/{o.value})
                  </option>
                ))}
                <option value="__custom__">رابط مخصص…</option>
              </select>
              {!SLUG_OPTIONS.find((o) => o.value === form.slug) && (
                <input
                  className="input mt-2"
                  value={form.slug}
                  placeholder="مثال: shipping-policy"
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              )}
            </Field>
            <Field label="الحالة">
              <label className="inline-flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                />
                <span className="text-sm">منشورة</span>
              </label>
            </Field>
          </div>

          <Field label="العنوان (عربي)" required>
            <input required className="input" value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
          </Field>
          <Field label="العنوان (إنجليزي)">
            <input className="input" value={form.title_en} dir="ltr" onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
          </Field>
          <Field label="وصف Meta للسيو">
            <input className="input" value={form.meta_description} onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">المحتوى (عربي) *</label>
              <button
                type="button"
                className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-900"
                onClick={() => setPreviewOpen((p) => !p)}
              >
                <Eye className="w-3.5 h-3.5" />
                {previewOpen ? 'إخفاء المعاينة' : 'معاينة'}
              </button>
            </div>
            <RichTextEditor value={form.body_ar} onChange={(v) => setForm((f) => ({ ...f, body_ar: v }))} />
            {previewOpen && (
              <div
                className="mt-3 p-4 rounded-lg border border-slate-200 bg-slate-50 prose prose-sm max-w-none [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: form.body_ar || '<em class="text-slate-400">لا يوجد محتوى</em>' }}
              />
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <button type="submit" disabled={saving} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? 'جارٍ الحفظ…' : form.id ? 'حفظ التعديلات' : 'إنشاء الصفحة'}
            </button>
            <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-slate-200">
              إلغاء
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Lightweight contentEditable WYSIWYG. Avoids pulling in TipTap/Prosemirror —
 * uses execCommand to keep bundle size small. Outputs plain HTML stored as-is.
 */
function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Only sync `value` -> DOM when it diverges (e.g. when editing a different page).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const buttons = [
    { icon: Bold, cmd: () => exec('bold'), title: 'عريض' },
    { icon: Italic, cmd: () => exec('italic'), title: 'مائل' },
    { icon: Heading1, cmd: () => exec('formatBlock', 'h2'), title: 'عنوان' },
    { icon: Heading2, cmd: () => exec('formatBlock', 'h3'), title: 'عنوان فرعي' },
    { icon: ListIcon, cmd: () => exec('insertUnorderedList'), title: 'قائمة نقطية' },
    { icon: ListOrdered, cmd: () => exec('insertOrderedList'), title: 'قائمة مرقمة' },
    { icon: QuoteIcon, cmd: () => exec('formatBlock', 'blockquote'), title: 'اقتباس' },
    { icon: Undo2, cmd: () => exec('undo'), title: 'تراجع' },
    { icon: Redo2, cmd: () => exec('redo'), title: 'إعادة' },
  ];

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 p-1">
        {buttons.map((b, i) => {
          const Icon = b.icon;
          return (
            <button
              key={i}
              type="button"
              title={b.title}
              onMouseDown={(e) => {
                e.preventDefault();
                b.cmd();
              }}
              className="p-1.5 hover:bg-slate-200 rounded text-slate-700"
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="rtl"
        className="min-h-[260px] p-4 outline-none text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:my-2 [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5 [&_blockquote]:border-r-4 [&_blockquote]:border-slate-200 [&_blockquote]:pr-3 [&_blockquote]:text-slate-600"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
