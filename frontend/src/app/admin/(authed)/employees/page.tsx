'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type AdminEmployee,
  type EmployeeStats,
  type EmployeeActivity,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtDate, ROLE_LABELS } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Users,
  CheckCircle2,
  Ban,
  ShieldCheck,
  LogIn,
  Pencil,
  Trash2,
  Search,
  Activity,
} from 'lucide-react';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    total: 0,
    active: 0,
    inactive: 0,
    roles: 0,
    logins_today: 0,
  });
  const [filters, setFilters] = useState({ q: '', role: '' });
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminEmployee | null }>({
    open: false,
    editing: null,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    employee: AdminEmployee;
    permissions: string[];
    activity: EmployeeActivity[];
  } | null>(null);

  async function refresh() {
    const r = await listEmployees({ q: filters.q, role: filters.role });
    setEmployees(r.data);
    setStats(r.stats);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.role]);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getEmployee(selectedId).then((r) => {
      if (!cancelled) setDetail({ employee: r.data, permissions: r.permissions, activity: r.activity });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة الموظفين"
        subtitle={`${fmtNumber(stats.total)} موظف`}
        actionLabel="إضافة موظف جديد"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="إجمالي الموظفين" value={fmtNumber(stats.total)} icon={Users} accent="text-[#0E5C3A]" />
        <StatCard label="موظفون نشطون" value={fmtNumber(stats.active)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="موظفون موقوفون" value={fmtNumber(stats.inactive)} icon={Ban} accent="text-rose-600" />
        <StatCard label="عدد الأدوار" value={fmtNumber(stats.roles)} icon={ShieldCheck} accent="text-[#F26B2B]" />
        <StatCard label="تسجيلات اليوم" value={fmtNumber(stats.logins_today)} icon={LogIn} accent="text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد..."
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
              className="border border-slate-200 rounded-lg text-sm px-3 py-2"
            >
              <option value="">كل الأدوار</option>
              <option value="admin">مدير</option>
              <option value="accountant">محاسب</option>
              <option value="driver">مندوب توصيل</option>
              <option value="branch_staff">موظف فرع</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">الموظف</th>
                  <th className="text-right px-4 py-3 font-medium">الدور</th>
                  <th className="text-right px-4 py-3 font-medium">الهاتف</th>
                  <th className="text-right px-4 py-3 font-medium">آخر دخول</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">لا يوجد موظفون</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedId(emp.id)}
                      className={`hover:bg-slate-50 cursor-pointer ${selectedId === emp.id ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-bold">
                            {emp.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold">{emp.name}</div>
                            <div className="text-[11px] text-slate-500" dir="ltr">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.role && (
                          <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
                            {ROLE_LABELS[emp.role] ?? emp.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">{emp.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {emp.last_login_at ? fmtDate(emp.last_login_at) : 'لم يسجل دخول بعد'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-md ${
                            emp.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {emp.is_active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDrawer({ open: true, editing: emp })}
                            title="تعديل"
                            className="p-1.5 rounded text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`حذف الموظف "${emp.name}"؟`)) return;
                              await deleteEmployee(emp.id);
                              if (selectedId === emp.id) setSelectedId(null);
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
          {detail ? (
            <EmployeeDetail data={detail} />
          ) : (
            <div className="text-center text-slate-400 py-12 text-sm">
              اختر موظف لعرض التفاصيل وسجل النشاط
            </div>
          )}
        </aside>
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
      >
        <EmployeeForm
          editing={drawer.editing}
          onDone={() => {
            setDrawer({ open: false, editing: null });
            refresh();
            if (selectedId) {
              getEmployee(selectedId).then((r) =>
                setDetail({ employee: r.data, permissions: r.permissions, activity: r.activity }),
              );
            }
          }}
        />
      </Drawer>
    </div>
  );
}

function EmployeeDetail({
  data,
}: {
  data: { employee: AdminEmployee; permissions: string[]; activity: EmployeeActivity[] };
}) {
  const { employee, permissions, activity } = data;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-extrabold text-lg">
          {employee.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{employee.name}</div>
          <div className="text-xs text-slate-500 truncate" dir="ltr">{employee.email}</div>
          {employee.role && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              {ROLE_LABELS[employee.role] ?? employee.role}
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> الصلاحيات ({permissions.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {permissions.map((p) => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700" dir="ltr">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" /> سجل النشاط
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {activity.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-4">لا يوجد نشاط مسجل</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="bg-slate-50 rounded-lg p-2 text-xs">
                <div className="text-slate-700">{a.description}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                  <span>{fmtDate(a.occurred_at)}</span>
                  {a.ip_address && <span dir="ltr">{a.ip_address}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeForm({
  editing,
  onDone,
}: {
  editing: AdminEmployee | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    password: '',
    role: editing?.role ?? 'branch_staff',
    is_active: editing?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: form.role,
      is_active: form.is_active,
    };
    if (form.password) payload.password = form.password;
    try {
      if (editing) await updateEmployee(editing.id, payload);
      else {
        if (!form.password) {
          throw new Error('كلمة المرور مطلوبة عند إنشاء حساب جديد');
        }
        await createEmployee(payload);
      }
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof AdminApiError ? e.message : e instanceof Error ? e.message : 'خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      {err && <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs">{err}</div>}

      <div>
        <label className="text-xs font-bold text-slate-700">الاسم *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">البريد *</label>
        <input
          required
          type="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">الهاتف</label>
        <input
          dir="ltr"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">
          كلمة المرور {editing ? '(اتركها فارغة لإبقائها)' : '*'}
        </label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700">الدور *</label>
        <select
          required
          value={form.role ?? 'branch_staff'}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        >
          <option value="admin">مدير</option>
          <option value="accountant">محاسب</option>
          <option value="driver">مندوب توصيل</option>
          <option value="branch_staff">موظف فرع</option>
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">الحساب مفعّل</span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#0E5C3A] text-white rounded-lg py-2.5 font-bold disabled:opacity-60"
      >
        {submitting ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الموظف'}
      </button>
    </form>
  );
}
