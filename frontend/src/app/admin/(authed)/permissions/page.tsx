'use client';

import { useEffect, useState } from 'react';
import {
  listRoles,
  updateRolePermissions,
  listRecentEmployeeActivity,
  type AdminRole,
  type EmployeeActivity,
  AdminApiError,
} from '@/lib/admin/api';
import EmployeeAvatar from '@/components/admin/EmployeeAvatar';
import PageHeader from '@/components/admin/PageHeader';
import { fmtDate } from '@/lib/admin/format';
import { ShieldCheck, Save, Activity } from 'lucide-react';

const PERM_GROUP_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  products: 'المنتجات',
  categories: 'الأقسام',
  orders: 'الطلبات',
  customers: 'العملاء',
  offers: 'العروض',
  coupons: 'الكوبونات',
  suppliers: 'الموردين',
  employees: 'الموظفين',
  reports: 'التقارير',
  settings: 'الإعدادات',
  branches: 'الفروع',
  users: 'إدارة المستخدمين',
  audit_logs: 'سجل التدقيق',
  pos: 'نقطة البيع',
  delivery: 'التوصيل',
  pages: 'الصفحات',
  messages: 'الرسائل',
  invoices: 'الفواتير',
  inventory: 'المخزون',
};

const PERM_LABELS: Record<string, string> = {
  view: 'عرض',
  manage: 'إدارة',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  export: 'تصدير',
  print: 'طباعة',
  operate: 'تشغيل',
};

const ACTIONS = ['view', 'add', 'edit', 'delete', 'export', 'print'] as const;

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [activeRole, setActiveRole] = useState<string>('admin');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activity, setActivity] = useState<EmployeeActivity[]>([]);

  async function refresh() {
    const [r, a] = await Promise.all([listRoles(), listRecentEmployeeActivity(40)]);
    setRoles(r.data);
    setGroups(r.permissions);
    const sel: Record<string, Set<string>> = {};
    for (const role of r.data) {
      sel[role.name] = new Set(role.permissions);
    }
    setSelected(sel);
    setActivity(a.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggle(role: string, perm: string) {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[role] ?? []);
      if (set.has(perm)) set.delete(perm);
      else set.add(perm);
      next[role] = set;
      return next;
    });
  }

  async function save(role: string) {
    setSaving(true);
    setMsg(null);
    try {
      await updateRolePermissions(role, Array.from(selected[role] ?? []));
      setMsg(`تم حفظ صلاحيات ${roles.find((r) => r.name === role)?.label ?? role}`);
      refresh();
    } catch (e: unknown) {
      setMsg(e instanceof AdminApiError ? e.message : 'خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  const active = roles.find((r) => r.name === activeRole);

  return (
    <div className="space-y-4">
      <PageHeader title="صلاحيات الأدوار" subtitle="تحكم بما يستطيع كل دور الوصول إليه" />

      {msg && <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded text-sm">{msg}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.name}
              onClick={() => setActiveRole(r.name)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                activeRole === r.name
                  ? 'bg-[#0E5C3A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {r.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                activeRole === r.name ? 'bg-white/20' : 'bg-white text-slate-600'
              }`}>
                {r.users_count}
              </span>
            </button>
          ))}
        </div>

        {active && (
          <div className="p-4 space-y-4">
            <div className="text-sm text-slate-600">
              صلاحيات دور <strong>{active.label}</strong> ({selected[active.name]?.size ?? 0} صلاحية)
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium min-w-44">الوحدة</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="text-center px-3 py-3 font-medium">
                        {PERM_LABELS[action]}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium">إدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groups).map(([group, perms]) => (
                    <tr key={group} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {PERM_GROUP_LABELS[group] ?? group}
                      </td>
                      {ACTIONS.map((action) => {
                        const perm = `${group}.${action}`;
                        const exists = perms.includes(perm);
                        return (
                          <td key={perm} className="px-3 py-3 text-center">
                            {exists ? (
                              <input
                                type="checkbox"
                                title={`${PERM_GROUP_LABELS[group] ?? group} - ${PERM_LABELS[action]}`}
                                checked={selected[active.name]?.has(perm) ?? false}
                                onChange={() => toggle(active.name, perm)}
                                disabled={active.name === 'admin'}
                                className="rounded"
                              />
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center">
                        {perms.includes(`${group}.manage`) || perms.includes(`${group}.operate`) ? (
                          <label className="inline-flex items-center gap-1">
                            {['manage', 'operate'].map((action) => {
                              const perm = `${group}.${action}`;
                              if (!perms.includes(perm)) return null;
                              return (
                                <input
                                  key={perm}
                                  type="checkbox"
                                  title={PERM_LABELS[action]}
                                  checked={selected[active.name]?.has(perm) ?? false}
                                  onChange={() => toggle(active.name, perm)}
                                  disabled={active.name === 'admin'}
                                  className="rounded"
                                />
                              );
                            })}
                          </label>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => save(active.name)}
                disabled={saving || active.name === 'admin'}
                className="bg-[#0E5C3A] text-white rounded-lg px-5 py-2 font-bold flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>

            {active.name === 'admin' && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                دور المدير يحتفظ تلقائياً بجميع الصلاحيات ولا يمكن تعديله.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Activity className="w-4 h-4 text-[#0E5C3A]" /> آخر نشاط الموظفين
        </div>
        <div className="divide-y divide-slate-100">
          {activity.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">لا يوجد نشاط بعد</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <EmployeeAvatar
                  name={a.user?.name ?? 'غير معروف'}
                  url={a.user?.avatar_url ?? null}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate">
                    <span className="font-bold">{a.user?.name ?? '—'}</span>
                    <span className="text-slate-500"> · </span>
                    <span>{a.description}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{fmtDate(a.occurred_at)}</span>
                    {a.ip_address && <span dir="ltr" className="text-slate-400">{a.ip_address}</span>}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700" dir="ltr">
                  {a.action}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
