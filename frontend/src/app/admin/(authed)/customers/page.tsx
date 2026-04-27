'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  blockCustomer,
  type AdminCustomer,
  type CustomerStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtSDG, fmtNumber, fmtDate } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import Drawer from '@/components/admin/Drawer';
import { Search, Pencil, Ban, ShieldCheck, ShoppingBag, Users } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total_customers: 0,
    active: 0,
    blocked: 0,
    total_orders: 0,
    total_sales: 0,
  });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminCustomer | null }>({
    open: false,
    editing: null,
  });

  async function refresh() {
    const r = await listCustomers({ q: filters.q, status: filters.status });
    setCustomers(r.data);
    setStats(r.meta);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة العملاء"
        subtitle={`${fmtNumber(stats.total_customers)} عميل`}
        actionLabel="إضافة عميل"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي العملاء" value={fmtNumber(stats.total_customers)} icon={Users} accent="text-[#0E5C3A]" />
        <StatCard label="عملاء نشطون" value={fmtNumber(stats.active)} icon={ShieldCheck} accent="text-emerald-600" />
        <StatCard label="عملاء محظورون" value={fmtNumber(stats.blocked)} icon={Ban} accent="text-rose-600" />
        <StatCard label="إجمالي الطلبات" value={fmtNumber(stats.total_orders)} icon={ShoppingBag} accent="text-[#F26B2B]" />
      </div>

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
            <option value="">كل العملاء</option>
            <option value="active">نشط</option>
            <option value="inactive">لم يطلب بعد</option>
            <option value="blocked">محظور</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">العميل</th>
                <th className="text-right px-4 py-3 font-medium">الهاتف</th>
                <th className="text-right px-4 py-3 font-medium">المدينة</th>
                <th className="text-right px-4 py-3 font-medium">الطلبات</th>
                <th className="text-right px-4 py-3 font-medium">إجمالي المشتريات</th>
                <th className="text-right px-4 py-3 font-medium">انضم</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    لا يوجد عملاء
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-bold">
                          {c.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold">{c.name}</div>
                          {c.email && <div className="text-[11px] text-slate-500" dir="ltr">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{c.city ?? '—'}</td>
                    <td className="px-4 py-3 font-bold">{fmtNumber(c.total_orders)}</td>
                    <td className="px-4 py-3 font-bold">{fmtSDG(c.total_spent)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      {c.is_blocked ? (
                        <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded">
                          محظور
                        </span>
                      ) : c.total_orders > 0 ? (
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          جديد
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDrawer({ open: true, editing: c })}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0E5C3A] rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const action = c.is_blocked ? 'فك حظر' : 'حظر';
                            if (confirm(`${action} العميل "${c.name}"؟`)) {
                              await blockCustomer(c.id);
                              refresh();
                            }
                          }}
                          className={`p-1.5 rounded ${
                            c.is_blocked
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-500 hover:bg-rose-50'
                          }`}
                          title={c.is_blocked ? 'فك الحظر' : 'حظر'}
                        >
                          {c.is_blocked ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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
        title={drawer.editing ? 'تعديل عميل' : 'إضافة عميل جديد'}
      >
        <CustomerForm
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-slate-50 grid place-items-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-xl font-extrabold ${accent}`}>{value}</div>
      </div>
    </div>
  );
}

function CustomerForm({
  editing,
  onDone,
}: {
  editing: AdminCustomer | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    city: editing?.city ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = { ...form };
    if (!payload.email) delete payload.email;
    if (!payload.city) delete payload.city;
    try {
      if (editing) await updateCustomer(editing.id, payload);
      else await createCustomer(payload);
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
      <Field label="الاسم">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>
      <Field label="رقم الهاتف">
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          required
          dir="ltr"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>
      <Field label="البريد الإلكتروني (اختياري)">
        <input
          type="email"
          value={form.email ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          dir="ltr"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>
      <Field label="المدينة (اختياري)">
        <input
          value={form.city ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </Field>

      {error && <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة العميل'}
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
