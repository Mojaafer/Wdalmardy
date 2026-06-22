/**
 * Admin-only formatters. Generic number/date formatters live in `@/lib/format`.
 */
export { fmtSDG, fmtNumber, fmtDate, fmtDeltaPct } from '@/lib/format';

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