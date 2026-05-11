'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, ChevronLeft } from 'lucide-react';
import { listPosSessions, type PosSession } from '@/lib/admin/api';
import { fmtSDG, fmtDate } from '@/lib/admin/format';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: 'مفتوحة', cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'مُقفلة', cls: 'bg-slate-200 text-slate-700' },
};

export default function PosSessionsPage() {
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    listPosSessions({ status: status || undefined })
      .then((r) => setSessions(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر التحميل'))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="p-6" dir="rtl">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-[#0E5C3A]" />
          <h1 className="text-2xl font-extrabold">جلسات نقطة البيع</h1>
        </div>
        <Link
          href="/admin/pos"
          className="text-sm inline-flex items-center gap-1.5 text-[#0E5C3A] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          الواجهة الرئيسية
        </Link>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="closed">مُقفلة</option>
          </select>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل…</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">لا توجد جلسات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-right font-semibold">#</th>
                  <th className="p-3 text-right font-semibold">الكاشير</th>
                  <th className="p-3 text-right font-semibold">الافتتاح</th>
                  <th className="p-3 text-right font-semibold">الإقفال</th>
                  <th className="p-3 text-right font-semibold">الحالة</th>
                  <th className="p-3 text-right font-semibold">رصيد افتتاحي</th>
                  <th className="p-3 text-right font-semibold">متوقع</th>
                  <th className="p-3 text-right font-semibold">معدود</th>
                  <th className="p-3 text-right font-semibold">الفارق</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = STATUS_LABELS[s.status] ?? STATUS_LABELS.closed;
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">#{s.id}</td>
                      <td className="p-3">{s.opened_by?.name ?? '—'}</td>
                      <td className="p-3 text-slate-600">
                        {s.opened_at ? fmtDate(s.opened_at) : '—'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.closed_at ? fmtDate(s.closed_at) : '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3">{fmtSDG(s.opening_cash)}</td>
                      <td className="p-3">
                        {s.closing_cash_expected !== null
                          ? fmtSDG(s.closing_cash_expected)
                          : '—'}
                      </td>
                      <td className="p-3">
                        {s.closing_cash_counted !== null
                          ? fmtSDG(s.closing_cash_counted)
                          : '—'}
                      </td>
                      <td className="p-3">
                        {s.variance === null ? (
                          '—'
                        ) : (
                          <span
                            className={
                              s.variance === 0
                                ? 'text-emerald-700 font-semibold'
                                : s.variance > 0
                                  ? 'text-sky-700 font-semibold'
                                  : 'text-red-700 font-semibold'
                            }
                          >
                            {s.variance > 0 ? '+' : ''}
                            {fmtSDG(s.variance)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
