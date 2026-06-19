'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type AdminBranch,
  type BranchInventoryRow,
  type BranchStats,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import {
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  DollarSign,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

const STATUS_LABELS: Record<AdminBranch['status'], string> = {
  active: 'نشط',
  paused: 'متوقف مؤقتاً',
  closed: 'مغلق',
};

const COLORS = ['#159447', '#2F80ED', '#F27A2E', '#7B61FF', '#12A6A6', '#94A3B8'];

export default function BranchesPage() {
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [stats, setStats] = useState<BranchStats>({
    total_branches: 0,
    active_branches: 0,
    total_sales: 0,
    total_products: 0,
    total_stock_units: 0,
    stock_value: 0,
  });
  const [inventory, setInventory] = useState<BranchInventoryRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: AdminBranch | null }>({ open: false, editing: null });

  async function refresh() {
    const res = await listBranches();
    setBranches(res.data);
    setStats(res.stats);
    setInventory(res.inventory);
    setActiveId((current) => current ?? res.data[0]?.id ?? null);
  }

  useEffect(() => {
    refresh();
  }, []);

  const active = branches.find((branch) => branch.id === activeId) ?? branches[0];
  const maxSales = Math.max(1, ...branches.map((branch) => branch.sales_total));
  const totalSales = Math.max(1, branches.reduce((sum, branch) => sum + branch.sales_total, 0));

  const donut = useMemo(() => {
    let start = 0;
    const segments = branches.map((branch, index) => {
      const pct = (branch.sales_total / totalSales) * 100;
      const segment = `${COLORS[index % COLORS.length]} ${start}% ${start + pct}%`;
      start += pct;
      return segment;
    });
    return segments.length ? `conic-gradient(${segments.join(', ')})` : '#e2e8f0';
  }, [branches, totalSales]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة الفروع"
        subtitle="المبيعات والمخزون والتحكم التشغيلي لكل فرع"
        actionLabel="إضافة فرع جديد"
        onAction={() => setDrawer({ open: true, editing: null })}
      />

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <aside className="space-y-3">
          <div className="bg-white border border-slate-100 rounded-xl p-3">
            <div className="font-bold text-slate-800 mb-3">الفروع</div>
            <div className="space-y-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setActiveId(branch.id)}
                  className={[
                    'w-full rounded-lg border p-3 text-right transition-colors',
                    active?.id === branch.id ? 'border-[#0E5C3A] bg-emerald-50' : 'border-slate-100 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    <Building2 className="w-5 h-5 text-[#0E5C3A] mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 truncate">{branch.name_ar}</div>
                      <div className="text-xs text-slate-500 truncate">{branch.address ?? branch.city ?? '—'}</div>
                      <div className="text-[11px] text-slate-500 mt-1" dir="ltr">{branch.phone ?? branch.code}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={branch.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}>
                      {STATUS_LABELS[branch.status]}
                    </span>
                    {branch.is_main && <span className="px-2 py-0.5 rounded bg-white text-[#0E5C3A] font-bold">رئيسي</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4 text-sm text-slate-600">
            <div className="font-bold text-slate-800 mb-1">نصيحة</div>
            خصص مديراً لكل فرع، ثم اربط جلسات نقطة البيع والمخزون الفرعي بالفرع المناسب.
          </div>
        </aside>

        <section className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard label="إجمالي الفروع" value={fmtNumber(stats.total_branches)} icon={Building2} accent="text-[#0E5C3A]" />
            <StatCard label="الفروع النشطة" value={fmtNumber(stats.active_branches)} icon={CheckCircle2} accent="text-emerald-600" />
            <StatCard label="إجمالي المبيعات" value={fmtSDG(stats.total_sales)} icon={DollarSign} accent="text-[#0E5C3A]" />
            <StatCard label="إجمالي المنتجات" value={fmtNumber(stats.total_products)} icon={Package} accent="text-orange-600" />
            <StatCard label="قيمة المخزون" value={fmtSDG(stats.stock_value)} icon={Boxes} accent="text-violet-600" />
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <div className="font-bold text-slate-800 mb-4 inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0E5C3A]" />
                مقارنة المبيعات بين الفروع
              </div>
              <div className="space-y-3">
                {branches.map((branch, index) => (
                  <div key={branch.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold text-slate-700">{branch.name_ar}</span>
                      <span className="text-slate-500">{fmtSDG(branch.sales_total)}</span>
                    </div>
                    <div className="h-8 bg-slate-100 rounded">
                      <div
                        className="h-8 rounded"
                        style={{
                          width: `${Math.max(4, (branch.sales_total / maxSales) * 100)}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <div className="font-bold text-slate-800 mb-4">نظرة عامة على الفروع</div>
              <div className="grid md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="relative w-52 h-52 mx-auto rounded-full" style={{ background: donut }}>
                  <div className="absolute inset-12 rounded-full bg-white grid place-items-center text-center">
                    <div>
                      <div className="text-xs text-slate-500">إجمالي المبيعات</div>
                      <div className="font-extrabold text-slate-800">{fmtSDG(stats.total_sales)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {branches.map((branch, index) => (
                    <div key={branch.id} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {branch.name_ar}
                      </span>
                      <span className="text-slate-500">{Math.round((branch.sales_total / totalSales) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1fr_280px] gap-4">
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-800">المخزون في الفروع</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">الفرع</th>
                      <th className="px-4 py-3 text-right font-medium">إجمالي المنتجات</th>
                      <th className="px-4 py-3 text-right font-medium">إجمالي الكمية</th>
                      <th className="px-4 py-3 text-right font-medium">قيمة المخزون</th>
                      <th className="px-4 py-3 text-right font-medium">منخفضة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((row) => (
                      <tr key={row.branch_id}>
                        <td className="px-4 py-3 font-bold text-slate-800">{row.branch_name}</td>
                        <td className="px-4 py-3">{fmtNumber(row.products_count)}</td>
                        <td className="px-4 py-3">{fmtNumber(row.stock_units)}</td>
                        <td className="px-4 py-3">{fmtSDG(row.stock_value)}</td>
                        <td className="px-4 py-3 text-rose-600">{fmtNumber(row.low_stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <div className="font-bold text-slate-800 mb-3">التقارير المفضلة للفروع</div>
              {['تقرير المبيعات', 'تقرير المخزون', 'تقرير الأرباح', 'تقرير العملاء', 'تقرير الطلبات'].map((label) => (
                <button key={label} className="w-full h-10 border-b border-slate-100 text-right text-sm text-slate-700 hover:text-[#0E5C3A]">
                  {label}
                </button>
              ))}
              <button className="w-full mt-3 h-10 border border-[#0E5C3A] text-[#0E5C3A] rounded-lg text-sm font-bold">
                إنشاء تقرير مخصص
              </button>
            </div>
          </div>

          {active && (
            <div className="bg-white border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800">{active.name_ar}</div>
                <div className="text-sm text-slate-500 inline-flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {active.address ?? active.city ?? 'لا يوجد عنوان'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDrawer({ open: true, editing: active })}
                  className="h-10 px-4 rounded-lg bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  تعديل
                </button>
                {!active.is_main && (
                  <button
                    onClick={async () => {
                      if (!confirm(`حذف ${active.name_ar}؟`)) return;
                      await deleteBranch(active.id);
                      refresh();
                    }}
                    className="h-10 px-4 rounded-lg bg-rose-50 text-rose-700 font-bold inline-flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        title={drawer.editing ? 'تعديل فرع' : 'إضافة فرع'}
      >
        <BranchForm
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

function BranchForm({ editing, onDone }: { editing: AdminBranch | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name_ar: editing?.name_ar ?? '',
    name_en: editing?.name_en ?? '',
    code: editing?.code ?? '',
    manager_name: editing?.manager_name ?? '',
    phone: editing?.phone ?? '',
    city: editing?.city ?? '',
    address: editing?.address ?? '',
    status: editing?.status ?? 'active',
    is_main: editing?.is_main ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, code: form.code.trim() };
      if (editing) await updateBranch(editing.id, payload);
      else await createBranch(payload);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <Field label="اسم الفرع بالعربية" value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} required />
      <Field label="اسم الفرع بالإنجليزية" value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
      <Field label="كود الفرع" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required dir="ltr" />
      <Field label="مدير الفرع" value={form.manager_name} onChange={(v) => setForm({ ...form, manager_name: v })} />
      <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} dir="ltr" />
      <Field label="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
      <Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <div>
        <label className="text-xs font-bold text-slate-700">الحالة</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as AdminBranch['status'] })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
        >
          <option value="active">نشط</option>
          <option value="paused">متوقف مؤقتاً</option>
          <option value="closed">مغلق</option>
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_main}
          onChange={(e) => setForm({ ...form, is_main: e.target.checked })}
          className="rounded"
        />
        <span>تعيين كفرع رئيسي</span>
      </label>
      <button disabled={saving} className="w-full h-11 rounded-lg bg-[#0E5C3A] text-white font-bold inline-flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />
        {saving ? 'جار الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الفرع'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-700">{label}</label>
      <input
        required={required}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
      />
    </div>
  );
}
