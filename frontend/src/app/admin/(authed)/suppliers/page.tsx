'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplier,
  deleteSupplier,
  uploadSupplierLogo,
  deleteSupplierLogo,
  type AdminSupplier,
  type SupplierStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Building2,
  CheckCircle2,
  Pause,
  Wallet,
  Pencil,
  Trash2,
  Search,
  Power,
  Star,
  Trash2 as TrashIcon,
  ImageIcon,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  paused: 'موقوف',
  archived: 'مؤرشف',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-200 text-slate-700',
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [stats, setStats] = useState<SupplierStats>({
    total: 0,
    active: 0,
    paused: 0,
    open_orders: 0,
    total_purchases: 0,
  });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminSupplier | null }>({
    open: false,
    editing: null,
  });
  const [selected, setSelected] = useState<AdminSupplier | null>(null);

  async function refresh() {
    const r = await listSuppliers({ q: filters.q, status: filters.status });
    setSuppliers(r.data);
    setStats(r.stats);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة الموردين"
        subtitle={`${fmtNumber(stats.total)} مورد`}
        actionLabel="إضافة مورد جديد"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الموردين" value={fmtNumber(stats.total)} icon={Building2} accent="text-[#0E5C3A]" />
        <StatCard label="موردون نشطون" value={fmtNumber(stats.active)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="موردون موقوفون" value={fmtNumber(stats.paused)} icon={Pause} accent="text-amber-600" />
        <StatCard label="إجمالي المشتريات" value={fmtSDG(stats.total_purchases)} icon={Wallet} accent="text-[#F26B2B]" />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="border border-slate-200 rounded-lg text-sm px-3 py-2"
            >
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="paused">موقوف</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">المورد</th>
                  <th className="text-right px-4 py-3 font-medium">الهاتف</th>
                  <th className="text-right px-4 py-3 font-medium">المشتريات</th>
                  <th className="text-right px-4 py-3 font-medium">التقييم</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      لا يوجد موردون
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`hover:bg-slate-50 cursor-pointer ${
                        selected?.id === s.id ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.logo ? (
                            <img src={s.logo} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-bold">
                              {s.name.slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold">{s.name}</div>
                            {s.business_type && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">{s.business_type}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">
                        {s.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#0E5C3A] font-bold">
                        {fmtSDG(s.total_purchases)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-xs font-bold">{s.performance_rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[s.status]}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await toggleSupplier(s.id);
                              refresh();
                            }}
                            title={s.status === 'active' ? 'إيقاف' : 'تفعيل'}
                            className={`p-1.5 rounded ${
                              s.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDrawer({ open: true, editing: s })}
                            title="تعديل"
                            className="p-1.5 rounded text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`حذف المورد "${s.name}"؟`)) return;
                              await deleteSupplier(s.id);
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

        <aside className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 h-fit">
          {selected ? (
            <SupplierDetail supplier={selected} />
          ) : (
            <div className="text-center text-slate-400 py-12 text-sm">
              اختر مورد لعرض التفاصيل
            </div>
          )}
        </aside>
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
      >
        <SupplierForm
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

function SupplierDetail({ supplier }: { supplier: AdminSupplier }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-extrabold text-lg">
          {supplier.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{supplier.name}</div>
          <div className="text-xs text-slate-500 truncate">{supplier.business_type}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="الهاتف" value={supplier.phone} dir="ltr" />
        <Field label="البريد" value={supplier.email} dir="ltr" />
        <Field label="العنوان" value={supplier.address} />
        <Field label="مسجل منذ" value={supplier.registered_at} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Box label="الطلبات" value={fmtNumber(supplier.orders_count)} />
        <Box label="المشتريات" value={fmtSDG(supplier.total_purchases)} />
        <Box label="الرصيد" value={fmtSDG(supplier.current_balance)} />
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-1">التقييم</div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(supplier.performance_rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
            />
          ))}
          <span className="text-sm font-bold ms-2">{supplier.performance_rating.toFixed(1)}</span>
        </div>
      </div>

      {supplier.notes && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
          <div className="text-xs text-slate-500 mb-1">ملاحظات</div>
          <p className="whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: string | null; dir?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-xs font-bold text-slate-800 truncate" dir={dir}>{value ?? '—'}</div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-emerald-50 rounded-lg p-2 text-center">
      <div className="text-[10px] text-emerald-700">{label}</div>
      <div className="text-sm font-extrabold text-[#0E5C3A]">{value}</div>
    </div>
  );
}

function SupplierForm({
  editing,
  onDone,
}: {
  editing: AdminSupplier | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    contact_person: editing?.contact_person ?? '',
    business_type: editing?.business_type ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    tax_number: editing?.tax_number ?? '',
    registered_at: editing?.registered_at ?? '',
    status: editing?.status ?? 'active',
    performance_rating: editing?.performance_rating ?? 0,
    notes: editing?.notes ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(editing?.logo ?? null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  const logoUrl = logo
    ? logo.startsWith('http') ? logo : `${API_BASE}/storage/${logo}`
    : null;

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const res = await uploadSupplierLogo(editing.id, file);
      setLogo(res.data.logo);
    } catch {
      setErr('فشل رفع الشعار');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!editing) return;
    setUploading(true);
    try {
      await deleteSupplierLogo(editing.id);
      setLogo(null);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload: Record<string, unknown> = {
      ...form,
      performance_rating: Number(form.performance_rating),
      registered_at: form.registered_at || null,
      contact_person: form.contact_person || null,
      business_type: form.business_type || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      tax_number: form.tax_number || null,
      notes: form.notes || null,
    };
    try {
      if (editing) await updateSupplier(editing.id, payload);
      else await createSupplier(payload);
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof AdminApiError ? e.message : 'خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      {err && <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs">{err}</div>}

      <div>
        <label className="text-xs font-bold text-slate-700">اسم المورد *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">نوع النشاط</label>
        <input
          value={form.business_type}
          onChange={(e) => setForm({ ...form, business_type: e.target.value })}
          placeholder="تجارة عامة - مواد غذائية"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">الهاتف</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">البريد</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            dir="ltr"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">العنوان</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-bold text-slate-700">تاريخ التسجيل</label>
          <input
            type="date"
            value={form.registered_at}
            onChange={(e) => setForm({ ...form, registered_at: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">الحالة</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as AdminSupplier['status'] })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          >
            <option value="active">نشط</option>
            <option value="paused">موقوف</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">التقييم</label>
          <input
            type="number"
            min={0}
            max={5}
            step="0.1"
            value={form.performance_rating}
            onChange={(e) => setForm({ ...form, performance_rating: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">الشعار</label>
        {logoUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mt-1">
            <img src={logoUrl} alt="" className="w-full h-32 object-contain" />
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={uploading}
              className="absolute top-2 left-2 bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => logoInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#0E5C3A] transition mt-1"
          >
            <ImageIcon className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <div className="text-xs text-slate-500">انقر لرفع الشعار</div>
          </div>
        )}
        {!editing && (
          <p className="text-xs text-amber-600 mt-1">احفظ المورد أولاً ثم يمكنك رفع الشعار</p>
        )}
        <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFile} />
        {uploading && <div className="text-xs text-slate-500 mt-1">جاري الرفع...</div>}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">ملاحظات</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#0E5C3A] text-white rounded-lg py-2.5 font-bold disabled:opacity-60"
      >
        {submitting ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المورد'}
      </button>
    </form>
  );
}
