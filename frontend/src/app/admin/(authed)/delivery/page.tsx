'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  type DeliveryZone,
  type AdminDriver,
  type DriverStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber, fmtSDG } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Truck,
  MapPin,
  Users,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const AVAIL_LABELS: Record<string, string> = {
  available: 'متاح',
  on_delivery: 'في توصيل',
  off_duty: 'خارج الدوام',
};
const AVAIL_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  on_delivery: 'bg-amber-100 text-amber-700',
  off_duty: 'bg-slate-200 text-slate-600',
};

type Tab = 'drivers' | 'zones';

export default function AdminDeliveryPage() {
  const [tab, setTab] = useState<Tab>('drivers');
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [stats, setStats] = useState<DriverStats>({ total: 0, available: 0, on_delivery: 0, off_duty: 0, in_progress_orders: 0 });
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [drawer, setDrawer] = useState<{ kind: 'driver' | 'zone' | null; editing: AdminDriver | DeliveryZone | null }>({
    kind: null,
    editing: null,
  });

  async function refresh() {
    const [d, z] = await Promise.all([listDrivers(), listDeliveryZones()]);
    setDrivers(d.data);
    setStats(d.stats);
    setZones(z.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إدارة التوصيل"
        subtitle={`${fmtNumber(stats.total)} سائق · ${fmtNumber(zones.length)} منطقة`}
        actionLabel={tab === 'drivers' ? 'إضافة سائق' : 'إضافة منطقة'}
        onAction={() => setDrawer({ kind: tab === 'drivers' ? 'driver' : 'zone', editing: null })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي السائقين" value={fmtNumber(stats.total)} icon={Users} accent="text-[#0E5C3A]" />
        <StatCard label="متاح" value={fmtNumber(stats.available)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="في توصيل" value={fmtNumber(stats.on_delivery)} icon={Truck} accent="text-amber-600" />
        <StatCard label="طلبات نشطة" value={fmtNumber(stats.in_progress_orders)} icon={Clock} accent="text-orange-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 px-4 flex">
          <TabBtn label="السائقون" active={tab === 'drivers'} onClick={() => setTab('drivers')} />
          <TabBtn label="مناطق التوصيل" active={tab === 'zones'} onClick={() => setTab('zones')} />
        </div>

        {tab === 'drivers' ? (
          <DriversTable
            drivers={drivers}
            onEdit={(d) => setDrawer({ kind: 'driver', editing: d })}
            onDelete={async (d) => {
              if (!confirm(`حذف السائق "${d.name}"?`)) return;
              await deleteDriver(d.id);
              refresh();
            }}
          />
        ) : (
          <ZonesTable
            zones={zones}
            onEdit={(z) => setDrawer({ kind: 'zone', editing: z })}
            onDelete={async (z) => {
              if (z.orders_count > 0) {
                alert(`لا يمكن حذف منطقة لديها ${z.orders_count} طلب.`);
                return;
              }
              if (!confirm(`حذف منطقة "${z.name_ar}"?`)) return;
              await deleteDeliveryZone(z.id);
              refresh();
            }}
          />
        )}
      </div>

      <Drawer
        open={drawer.kind === 'driver'}
        onClose={() => setDrawer({ kind: null, editing: null })}
        title={drawer.editing ? 'تعديل السائق' : 'إضافة سائق'}
      >
        {drawer.kind === 'driver' && (
          <DriverForm
            driver={drawer.editing as AdminDriver | null}
            zones={zones}
            onDone={() => { setDrawer({ kind: null, editing: null }); refresh(); }}
          />
        )}
      </Drawer>

      <Drawer
        open={drawer.kind === 'zone'}
        onClose={() => setDrawer({ kind: null, editing: null })}
        title={drawer.editing ? 'تعديل المنطقة' : 'إضافة منطقة توصيل'}
      >
        {drawer.kind === 'zone' && (
          <ZoneForm
            zone={drawer.editing as DeliveryZone | null}
            onDone={() => { setDrawer({ kind: null, editing: null }); refresh(); }}
          />
        )}
      </Drawer>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[#0E5C3A] text-[#0E5C3A]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
    >
      {label}
    </button>
  );
}

function DriversTable({ drivers, onEdit, onDelete }: { drivers: AdminDriver[]; onEdit: (d: AdminDriver) => void; onDelete: (d: AdminDriver) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th className="text-right px-4 py-3 font-medium">الاسم</th>
            <th className="text-right px-4 py-3 font-medium">الهاتف</th>
            <th className="text-right px-4 py-3 font-medium">المركبة</th>
            <th className="text-right px-4 py-3 font-medium">المنطقة</th>
            <th className="text-right px-4 py-3 font-medium">الحالة</th>
            <th className="text-right px-4 py-3 font-medium">طلبات منجزة</th>
            <th className="text-right px-4 py-3 font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {drivers.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-10 text-slate-400">لا يوجد سائقون</td>
            </tr>
          ) : (
            drivers.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">{d.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.profile?.vehicle ?? '—'}
                  {d.profile?.vehicle_plate && <span className="text-xs text-slate-400 mr-1" dir="ltr">({d.profile.vehicle_plate})</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.profile?.zone?.name_ar ?? '—'}</td>
                <td className="px-4 py-3">
                  {d.profile?.availability ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${AVAIL_COLORS[d.profile.availability]}`}>
                      {AVAIL_LABELS[d.profile.availability]}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono">{fmtNumber(d.profile?.completed_orders ?? 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(d)} className="p-1.5 text-slate-500 hover:text-[#0E5C3A] hover:bg-slate-100 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(d)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded">
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
  );
}

function ZonesTable({ zones, onEdit, onDelete }: { zones: DeliveryZone[]; onEdit: (z: DeliveryZone) => void; onDelete: (z: DeliveryZone) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th className="text-right px-4 py-3 font-medium">المنطقة</th>
            <th className="text-right px-4 py-3 font-medium">رسوم التوصيل</th>
            <th className="text-right px-4 py-3 font-medium">الوقت المتوقع</th>
            <th className="text-right px-4 py-3 font-medium">عدد الطلبات</th>
            <th className="text-right px-4 py-3 font-medium">الحالة</th>
            <th className="text-right px-4 py-3 font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {zones.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-10 text-slate-400">لا توجد مناطق توصيل</td>
            </tr>
          ) : (
            zones.map((z) => (
              <tr key={z.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#F26B2B]" />
                    <div>
                      <div>{z.name_ar}</div>
                      {z.name_en && <div className="text-xs text-slate-400" dir="ltr">{z.name_en}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[#0E5C3A] font-bold">{fmtSDG(z.fee)}</td>
                <td className="px-4 py-3 text-slate-600">{fmtNumber(z.estimated_minutes)} دقيقة</td>
                <td className="px-4 py-3 font-mono">{fmtNumber(z.orders_count)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${z.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {z.is_active ? 'نشط' : 'موقوف'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(z)} className="p-1.5 text-slate-500 hover:text-[#0E5C3A] hover:bg-slate-100 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(z)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded">
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
  );
}

function DriverForm({ driver, zones, onDone }: { driver: AdminDriver | null; zones: DeliveryZone[]; onDone: () => void }) {
  const editing = driver !== null;
  const [form, setForm] = useState({
    name: driver?.name ?? '',
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    password: '',
    vehicle: driver?.profile?.vehicle ?? '',
    vehicle_plate: driver?.profile?.vehicle_plate ?? '',
    national_id: driver?.profile?.national_id ?? '',
    zone_id: driver?.profile?.zone?.id?.toString() ?? '',
    availability: driver?.profile?.availability ?? 'available',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        vehicle: form.vehicle || null,
        vehicle_plate: form.vehicle_plate || null,
        national_id: form.national_id || null,
        zone_id: form.zone_id ? Number(form.zone_id) : null,
        availability: form.availability,
      };
      if (form.password) body.password = form.password;
      if (editing && driver) {
        await updateDriver(driver.id, body);
      } else {
        if (!form.password) throw new Error('كلمة المرور مطلوبة');
        await createDriver(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : err instanceof Error ? err.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="الاسم">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
        <Field label="الهاتف">
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
      </div>
      <Field label="البريد (اختياري)">
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      <Field label={editing ? 'كلمة المرور (اتركها فارغة للإبقاء)' : 'كلمة المرور'}>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="نوع المركبة">
          <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="دراجة نارية / سيارة" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
        <Field label="رقم اللوحة">
          <input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
      </div>
      <Field label="الرقم الوطني (اختياري)">
        <input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="المنطقة">
          <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="">بدون منطقة</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name_ar}</option>)}
          </select>
        </Field>
        <Field label="الحالة">
          <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as 'available' | 'on_delivery' | 'off_duty' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="available">متاح</option>
            <option value="on_delivery">في توصيل</option>
            <option value="off_duty">خارج الدوام</option>
          </select>
        </Field>
      </div>
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
      <button type="submit" disabled={saving} className="w-full bg-[#0E5C3A] text-white py-2.5 rounded-lg font-medium hover:bg-[#0a4a2e] disabled:opacity-60">
        {saving ? '...جاري الحفظ' : 'حفظ'}
      </button>
    </form>
  );
}

function ZoneForm({ zone, onDone }: { zone: DeliveryZone | null; onDone: () => void }) {
  const editing = zone !== null;
  const [form, setForm] = useState({
    name_ar: zone?.name_ar ?? '',
    name_en: zone?.name_en ?? '',
    fee: zone?.fee?.toString() ?? '',
    estimated_minutes: zone?.estimated_minutes?.toString() ?? '60',
    is_active: zone?.is_active ?? true,
    sort_order: zone?.sort_order?.toString() ?? '0',
    notes: zone?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        name_ar: form.name_ar,
        name_en: form.name_en || null,
        fee: Number(form.fee),
        estimated_minutes: Number(form.estimated_minutes),
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
        notes: form.notes || null,
      };
      if (editing && zone) {
        await updateDeliveryZone(zone.id, body);
      } else {
        await createDeliveryZone(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="الاسم بالعربية">
        <input required value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      <Field label="الاسم بالإنجليزية (اختياري)">
        <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="رسوم التوصيل (ج.س)">
          <input type="number" required value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
        <Field label="الوقت المتوقع (دقيقة)">
          <input type="number" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ترتيب">
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </Field>
        <Field label="الحالة">
          <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span>نشطة</span>
          </label>
        </Field>
      </div>
      <Field label="ملاحظات (اختياري)">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </Field>
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
      <button type="submit" disabled={saving} className="w-full bg-[#0E5C3A] text-white py-2.5 rounded-lg font-medium hover:bg-[#0a4a2e] disabled:opacity-60">
        {saving ? '...جاري الحفظ' : 'حفظ'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
