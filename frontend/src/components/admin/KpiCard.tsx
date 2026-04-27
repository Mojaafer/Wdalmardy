'use client';

import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { fmtDeltaPct } from '@/lib/admin/format';

export default function KpiCard({
  label,
  value,
  today,
  yesterday,
  icon: Icon,
  accent,
  suffix,
}: {
  label: string;
  value: string;
  today: number;
  yesterday: number;
  icon: LucideIcon;
  accent: string;
  suffix?: string;
}) {
  const { pct, up } = fmtDeltaPct(today, yesterday);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
          <div className="text-xl lg:text-2xl font-extrabold text-slate-900 truncate">
            {value}
            {suffix && <span className="text-sm text-slate-400 mr-1 font-normal">{suffix}</span>}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${accent} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {up !== null && (
        <div
          className={[
            'mt-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded',
            up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
          ].join(' ')}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {pct} مقارنة بالأمس
        </div>
      )}
    </div>
  );
}
