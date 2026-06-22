'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('ar-SD', { weekday: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">المبيعات خلال 7 أيام</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0E5C3A" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0E5C3A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} reversed />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} orientation="right" />
            <Tooltip
              contentStyle={{ direction: 'rtl', borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(v: unknown) => [`${Number(v ?? 0).toLocaleString('ar-SD')} ج.س`, 'المبيعات']}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#0E5C3A"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
