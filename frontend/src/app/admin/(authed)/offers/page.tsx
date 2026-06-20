'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import {
  listOffers,
  createOffer,
  updateOffer,
  toggleOffer,
  deleteOffer,
  uploadOfferBanner,
  deleteOfferBanner,
  type AdminOffer,
  type OfferStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Megaphone,
  CheckCircle2,
  Calendar,
  XCircle,
  Pause,
  Pencil,
  Trash2,
  Search,
  Power,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  banner: 'بانر رئيسي',
  daily: 'عرض يومي',
  weekly: 'عرض أسبوعي',
  percentage: 'خصم نسبة',
  fixed: 'خصم مبلغ',
  free_shipping: 'شحن مجاني',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  scheduled: 'مجدول',
  expired: 'منتهي',
  paused: 'موقوف',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-amber-100 text-amber-700',
  expired: 'bg-rose-100 text-rose-700',
  paused: 'bg-slate-200 text-slate-700',
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [stats, setStats] = useState<OfferStats>({ total: 0, active: 0, scheduled: 0, expired: 0, paused: 0 });
  const [filters, setFilters] = useState({ q: '', type: '', status: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminOffer | null }>({
    open: false,
    editing: null,
  });

  async function refresh() {
    const r = await listOffers({ q: filters.q, type: filters.type, status: filters.status });
    setOffers(r.data);
    setStats(r.stats);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.type, filters.status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة العروض والخصومات"
        subtitle={`${fmtNumber(stats.total)} عرض`}
        actionLabel="إضافة عرض جديد"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="إجمالي العروض" value={fmtNumber(stats.total)} icon={Megaphone} accent="text-[#0E5C3A]" />
        <StatCard label="العروض النشطة" value={fmtNumber(stats.active)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="العروض المجدولة" value={fmtNumber(stats.scheduled)} icon={Calendar} accent="text-amber-600" />
        <StatCard label="العروض المنتهية" value={fmtNumber(stats.expired)} icon={XCircle} accent="text-rose-600" />
        <StatCard label="العروض الموقوفة" value={fmtNumber(stats.paused)} icon={Pause} accent="text-slate-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث عن عرض..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="border border-slate-200 rounded-lg text-sm px-3 py-2"
          >
            <option value="">كل أنواع العروض</option>
            <option value="banner">بانر رئيسي</option>
            <option value="daily">عرض يومي</option>
            <option value="weekly">عرض أسبوعي</option>
            <option value="percentage">خصم نسبة</option>
            <option value="fixed">خصم مبلغ</option>
            <option value="free_shipping">شحن مجاني</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="border border-slate-200 rounded-lg text-sm px-3 py-2"
          >
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="scheduled">مجدول</option>
            <option value="expired">منتهي</option>
            <option value="paused">موقوف</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">العنوان</th>
                <th className="text-right px-4 py-3 font-medium">النوع</th>
                <th className="text-right px-4 py-3 font-medium">الخصم</th>
                <th className="text-right px-4 py-3 font-medium">تاريخ النهاية</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    لا توجد عروض
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold">{o.title}</div>
                      {o.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">{o.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
                        {TYPE_LABELS[o.type] ?? o.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#F26B2B] font-bold">
                      {o.discount_unit === 'percent'
                        ? `${o.discount_value}%`
                        : o.discount_unit === 'free_shipping'
                          ? 'شحن مجاني'
                          : fmtSDG(o.discount_value)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.ends_at ? new Date(o.ends_at).toLocaleDateString('ar-SD') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[o.status]}`}
                      >
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            await toggleOffer(o.id);
                            refresh();
                          }}
                          title={o.is_active ? 'إيقاف' : 'تفعيل'}
                          className={`p-1.5 rounded ${o.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDrawer({ open: true, editing: o })}
                          title="تعديل"
                          className="p-1.5 rounded text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`حذف العرض "${o.title}"؟`)) return;
                            await deleteOffer(o.id);
                            refresh();
                          }}
                          title="حذف"
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
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
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل عرض' : 'إضافة عرض جديد'}
      >
        <OfferForm
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

function OfferForm({
  editing,
  onDone,
}: {
  editing: AdminOffer | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    type: editing?.type ?? 'percentage',
    title: editing?.title ?? '',
    title_en: editing?.title_en ?? '',
    description: editing?.description ?? '',
    description_en: editing?.description_en ?? '',
    discount_value: editing?.discount_value ?? 0,
    discount_unit: editing?.discount_unit ?? 'percent',
    max_discount: editing?.max_discount ?? '',
    scope: editing?.scope ?? 'all',
    banner_link: editing?.banner_link ?? '',
    starts_at: editing?.starts_at?.slice(0, 16) ?? '',
    ends_at: editing?.ends_at?.slice(0, 16) ?? '',
    is_active: editing?.is_active ?? true,
    priority: editing?.priority ?? 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(editing?.banner_image ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload: Record<string, unknown> = {
      ...form,
      discount_value: Number(form.discount_value),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      priority: Number(form.priority || 0),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      title_en: form.title_en || null,
      description: form.description || null,
      description_en: form.description_en || null,
      banner_link: form.banner_link || null,
    };
    try {
      let offerId = editing?.id;
      if (editing) {
        await updateOffer(editing.id, payload);
      } else {
        const created = await createOffer(payload);
        offerId = created.data.id;
      }
      if (selectedFile && offerId) {
        setUploadingBanner(true);
        await uploadOfferBanner(offerId, selectedFile);
      }
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof AdminApiError ? e.message : 'خطأ غير متوقع');
    } finally {
      setSubmitting(false);
      setUploadingBanner(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  async function handleRemoveBanner() {
    if (editing?.id) {
      setSubmitting(true);
      try {
        await deleteOfferBanner(editing.id);
        setSelectedFile(null);
        setBannerPreview(null);
      } catch (e: unknown) {
        setErr(e instanceof AdminApiError ? e.message : 'خطأ');
      } finally {
        setSubmitting(false);
      }
    } else {
      setSelectedFile(null);
      setBannerPreview(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      {err && <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs">{err}</div>}

      <div>
        <label className="text-xs font-bold text-slate-700">نوع العرض *</label>
        <select
          required
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as AdminOffer['type'] })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        >
          <option value="percentage">خصم نسبة</option>
          <option value="fixed">خصم مبلغ</option>
          <option value="banner">بانر رئيسي</option>
          <option value="daily">عرض يومي</option>
          <option value="weekly">عرض أسبوعي</option>
          <option value="free_shipping">شحن مجاني</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">عنوان العرض *</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">الوصف</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">قيمة الخصم *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">وحدة الخصم *</label>
          <select
            required
            value={form.discount_unit}
            onChange={(e) =>
              setForm({ ...form, discount_unit: e.target.value as AdminOffer['discount_unit'] })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="percent">نسبة %</option>
            <option value="amount">مبلغ ج.س</option>
            <option value="free_shipping">شحن مجاني</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">تاريخ البداية</label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">تاريخ النهاية</label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      {form.type === 'banner' && (
        <>
          <div>
            <label className="text-xs font-bold text-slate-700">صورة البانر</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {bannerPreview ? (
              <div className="relative inline-block mt-1">
                <img
                  src={bannerPreview}
                  alt="banner preview"
                  className="w-full h-32 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full text-xs grid place-items-center shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-[#0E5C3A] hover:text-[#0E5C3A] grid place-items-center text-sm transition-colors mt-1"
              >
                اختر صورة البانر
              </button>
            )}
            {selectedFile && (
              <p className="text-xs text-slate-500 mt-1">{selectedFile.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">رابط البانر عند الضغط</label>
            <input
              type="text"
              value={form.banner_link}
              onChange={(e) => setForm({ ...form, banner_link: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">العرض مفعّل</span>
      </label>

      <button
        type="submit"
        disabled={submitting || uploadingBanner}
        className="w-full bg-[#0E5C3A] text-white rounded-lg py-2.5 font-bold disabled:opacity-60"
      >
        {submitting || uploadingBanner ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة العرض'}
      </button>
    </form>
  );
}
