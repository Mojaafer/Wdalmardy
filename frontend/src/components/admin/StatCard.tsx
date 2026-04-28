import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-[#0E5C3A]',
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      {Icon ? (
        <div className={`w-10 h-10 rounded-lg bg-slate-50 grid place-items-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-xl font-extrabold ${accent}`}>{value}</div>
      </div>
    </div>
  );
}
