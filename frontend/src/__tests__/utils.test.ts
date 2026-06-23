import { describe, it, expect } from 'vitest';
import { fmtSDG } from '@/lib/format';

describe('fmtSDG', () => {
  it('formats a number with SDG suffix', () => {
    const result = fmtSDG(1500);
    expect(result).toContain('ج.س');
  });

  it('returns 0 SDG for null', () => {
    expect(fmtSDG(null)).toContain('ج.س');
  });

  it('formats English locale', () => {
    const result = fmtSDG(5000, 'en');
    expect(result).toContain('ج.س');
  });
});
