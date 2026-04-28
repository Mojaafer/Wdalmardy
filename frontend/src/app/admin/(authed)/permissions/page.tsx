'use client';

import { useEffect, useState } from 'react';
import {
  listRoles,
  updateRolePermissions,
  type AdminRole,
  AdminApiError,
} from '@/lib/admin/api';
import PageHeader from '@/components/admin/PageHeader';
import { ShieldCheck, Save } from 'lucide-react';

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
  users: 'إدارة المستخدمين',
};

const PERM_LABELS: Record<string, string> = {
  view: 'عرض',
  manage: 'إدارة',
};

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [activeRole, setActiveRole] = useState<string>('admin');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const r = await listRoles();
    setRoles(r.data);
    setGroups(r.permissions);
    const sel: Record<string, Set<string>> = {};
    for (const role of r.data) {
      sel[role.name] = new Set(role.permissions);
    }
    setSelected(sel);
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(groups).map(([group, perms]) => (
                <div key={group} className="border border-slate-200 rounded-lg p-3">
                  <div className="text-sm font-bold text-slate-800 mb-2">
                    {PERM_GROUP_LABELS[group] ?? group}
                  </div>
                  <div className="space-y-1.5">
                    {perms.map((perm) => {
                      const action = perm.split('.')[1];
                      return (
                        <label key={perm} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected[active.name]?.has(perm) ?? false}
                            onChange={() => toggle(active.name, perm)}
                            disabled={active.name === 'admin'}
                            className="rounded"
                          />
                          <span className="text-slate-700">{PERM_LABELS[action] ?? action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
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
    </div>
  );
}
