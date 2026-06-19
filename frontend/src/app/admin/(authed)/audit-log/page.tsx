'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import { fmtNumber, fmtDate } from '@/lib/admin/format';
import {
  listAuditLog,
  downloadAuditLog,
  type AuditLogItem,
  type AuditLogStats,
} from '@/lib/admin/api';
import { Activity, Download, FileClock, Search } from 'lucide-react';

const EVENT_LABELS: Record<string, string> = {
  created: 'إضافة',
  updated: 'تعديل',
  deleted: 'حذف',
};

const EVENT_COLORS: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-700',
  updated: 'bg-amber-100 text-amber-700',
  deleted: 'bg-rose-100 text-rose-700',
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditLogStats>({ total: 0, created: 0, updated: 0, deleted: 0 });
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ q: '', event: '', entity_type: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await listAuditLog(params);
    setRows(res.data);
    setStats(res.stats);
    setEntityTypes(res.entity_types);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.event, filters.entity_type, filters.from, filters.to]);

  async function exportCsv() {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    await downloadAuditLog(params, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل التدقيق"
        subtitle="تتبع تغييرات البيانات مع القيم قبل وبعد وعنوان IP"
        actionLabel="تصدير CSV"
        onAction={exportCsv}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="كل العمليات" value={fmtNumber(stats.total)} icon={FileClock} accent="text-[#0E5C3A]" />
        <StatCard label="إضافات" value={fmtNumber(stats.created)} icon={Activity} accent="text-emerald-600" />
        <StatCard label="تعديلات" value={fmtNumber(stats.updated)} icon={Activity} accent="text-amber-600" />
        <StatCard label="حذف" value={fmtNumber(stats.deleted)} icon={Activity} accent="text-rose-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 grid md:grid-cols-[1.4fr_repeat(4,minmax(120px,1fr))_auto] gap-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="بحث بالمستخدم، الكيان، IP..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={filters.event}
            onChange={(e) => setFilters((f) => ({ ...f, event: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل العمليات</option>
            <option value="created">إضافة</option>
            <option value="updated">تعديل</option>
            <option value="deleted">حذف</option>
          </select>
          <select
            value={filters.entity_type}
            onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الكيانات</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={exportCsv}
            title="تصدير"
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">الوقت</th>
                <th className="text-right px-4 py-3 font-medium">المستخدم</th>
                <th className="text-right px-4 py-3 font-medium">العملية</th>
                <th className="text-right px-4 py-3 font-medium">الكيان</th>
                <th className="text-right px-4 py-3 font-medium">قبل</th>
                <th className="text-right px-4 py-3 font-medium">بعد</th>
                <th className="text-right px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">جار التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">لا توجد سجلات</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{row.user?.name ?? 'النظام'}</div>
                    <div className="text-xs text-slate-400" dir="ltr">{row.user?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md ${EVENT_COLORS[row.event] ?? 'bg-slate-100 text-slate-700'}`}>
                      {EVENT_LABELS[row.event] ?? row.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-bold">{row.entity_type}</div>
                    <div className="text-xs text-slate-400">#{row.entity_id}</div>
                  </td>
                  <td className="px-4 py-3 min-w-56"><JsonPreview value={row.old_values} /></td>
                  <td className="px-4 py-3 min-w-56"><JsonPreview value={row.new_values} /></td>
                  <td className="px-4 py-3 text-slate-500" dir="ltr">{row.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function JsonPreview({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span className="text-slate-300">—</span>;
  return (
    <div className="space-y-1">
      {Object.entries(value).slice(0, 5).map(([key, val]) => (
        <div key={key} className="grid grid-cols-[90px_1fr] gap-2 text-xs">
          <span className="font-mono text-slate-500 truncate" dir="ltr">{key}</span>
          <span className="text-slate-700 truncate" title={String(val ?? '')}>
            {String(val ?? 'null')}
          </span>
        </div>
      ))}
    </div>
  );
}
