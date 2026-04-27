export function fmtSDG(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(n)) return '0 ج.س';
  return `${new Intl.NumberFormat('ar-SD', { maximumFractionDigits: 0 }).format(n)} ج.س`;
}

export function fmtNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('ar-SD', { maximumFractionDigits: 0 }).format(n || 0);
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-SD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function fmtDeltaPct(today: number, yesterday: number): { pct: string; up: boolean | null } {
  if (yesterday === 0) {
    if (today === 0) return { pct: '0%', up: null };
    return { pct: '+100%', up: true };
  }
  const delta = ((today - yesterday) / yesterday) * 100;
  return {
    pct: `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`,
    up: delta === 0 ? null : delta > 0,
  };
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  preparing: 'قيد التحضير',
  shipped: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير',
  accountant: 'محاسب',
  driver: 'مندوب توصيل',
  branch_staff: 'موظف فرع',
};
