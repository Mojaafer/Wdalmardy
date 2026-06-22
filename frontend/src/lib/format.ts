/**
 * Locale-aware formatters shared by storefront and admin.
 *
 * `fmtSDG` / `fmtNumber` / `fmtDate` accept a locale and default to Arabic.
 * `STATUS_LABELS` / `STATUS_COLORS` / `ROLE_LABELS` are admin-only and stay in
 * `lib/admin/format.ts` so they don't leak into the storefront bundle.
 */
export function fmtSDG(
  value: number | string | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(n)) return '0 ج.س';
  const intl = locale === 'ar' ? 'ar-EG' : 'en-US';
  return `${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(n)} ج.س`;
}

export function fmtNumber(
  value: number | string | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const intl = locale === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(n || 0);
}

export function fmtDate(iso: string, locale: 'ar' | 'en' = 'ar'): string {
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
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