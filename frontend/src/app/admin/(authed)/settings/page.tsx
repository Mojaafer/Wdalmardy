'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings, Save, Download, Building2, CreditCard, Truck, Bell, Cog } from 'lucide-react';
import {
  getSettings,
  updateSettings,
  downloadBackup,
  type AdminSetting,
  type SettingsCatalogEntry,
  type SettingValue,
} from '@/lib/admin/api';

const GROUP_LABELS: Record<string, string> = {
  brand: 'بيانات المتجر',
  payment: 'وسائل الدفع',
  delivery: 'التوصيل والمخزون',
  notifications: 'الإشعارات',
  general: 'النظام',
};

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  brand: Building2,
  payment: CreditCard,
  delivery: Truck,
  notifications: Bell,
  general: Cog,
};

const GROUP_ORDER = ['brand', 'payment', 'delivery', 'notifications', 'general'];

export default function SettingsPage() {
  const [data, setData] = useState<Record<string, AdminSetting>>({});
  const [catalog, setCatalog] = useState<SettingsCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('brand');
  const [dirty, setDirty] = useState<Record<string, SettingValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await getSettings();
      setData(res.data);
      setCatalog(res.catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  function setLocal(key: string, value: SettingValue) {
    setDirty((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  }

  function getValue(key: string): SettingValue {
    if (key in dirty) return dirty[key];
    return data[key]?.value ?? defaultByCatalog(key);
  }

  function defaultByCatalog(key: string): SettingValue {
    const entry = catalog.find((c) => c.key === key);
    if (!entry) return '';
    return entry.type === 'boolean' ? false : entry.type === 'integer' ? 0 : '';
  }

  async function save() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = Object.entries(dirty).map(([key, value]) => {
        const entry = catalog.find((c) => c.key === key);
        return {
          key,
          value,
          type: entry?.type ?? 'string',
          group: entry?.group ?? 'general',
        };
      });
      const res = await updateSettings(payload);
      setData(res.data);
      setCatalog(res.catalog);
      setDirty({});
      setSuccess('تم الحفظ بنجاح');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function backup() {
    try {
      const filename = `wadalmardi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await downloadBackup(filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التنزيل');
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<string, SettingsCatalogEntry[]>();
    for (const e of catalog) {
      if (!m.has(e.group)) m.set(e.group, []);
      m.get(e.group)!.push(e);
    }
    return m;
  }, [catalog]);

  const dirtyCount = Object.keys(dirty).length;

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#0E5C3A]" />
            إعدادات النظام
          </h1>
          <p className="text-sm text-slate-500 mt-1">إدارة بيانات المتجر، الدفع، التوصيل، والإشعارات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={backup}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تنزيل نسخة احتياطية
          </button>
          <button
            onClick={save}
            disabled={dirtyCount === 0 || saving}
            className="bg-[#0E5C3A] hover:bg-[#0a4a2e] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : `حفظ (${dirtyCount})`}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          {/* tabs */}
          <nav className="bg-white border border-slate-200 rounded-xl p-2 h-fit">
            {GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => {
              const Icon = GROUP_ICONS[g] ?? Cog;
              const active = activeGroup === g;
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={[
                    'w-full text-right flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-1',
                    active
                      ? 'bg-[#0E5C3A] text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4" />
                  {GROUP_LABELS[g] ?? g}
                </button>
              );
            })}
          </nav>

          {/* group form */}
          <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 text-lg">
              {GROUP_LABELS[activeGroup] ?? activeGroup}
            </h3>
            <div className="space-y-4">
              {(grouped.get(activeGroup) ?? []).map((entry) => (
                <SettingField
                  key={entry.key}
                  entry={entry}
                  value={getValue(entry.key)}
                  onChange={(v) => setLocal(entry.key, v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SettingField({
  entry,
  value,
  onChange,
}: {
  entry: SettingsCatalogEntry;
  value: SettingValue;
  onChange: (v: SettingValue) => void;
}) {
  if (entry.type === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">{entry.label}</span>
        <button
          type="button"
          dir="ltr"
          onClick={() => onChange(!value)}
          aria-pressed={Boolean(value)}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            value ? 'bg-[#0E5C3A]' : 'bg-slate-300',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 rounded-full bg-white transition-transform',
              value ? 'translate-x-5' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </label>
    );
  }

  if (entry.type === 'text') {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{entry.label}</label>
        <textarea
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5C3A]/30"
        />
      </div>
    );
  }

  if (entry.type === 'integer') {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{entry.label}</label>
        <input
          type="number"
          value={value === null || value === undefined ? '' : Number(value)}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5C3A]/30"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{entry.label}</label>
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5C3A]/30"
      />
    </div>
  );
}
