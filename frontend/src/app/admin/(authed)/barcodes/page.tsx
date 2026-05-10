'use client';

import { useEffect, useMemo, useState } from 'react';
import { Barcode, Search, Wand2, Printer, AlertTriangle } from 'lucide-react';
import {
  getBarcodeSummary,
  listBarcodes,
  generateMissingBarcodes,
  type BarcodeSummary,
  type AdminProduct,
} from '@/lib/admin/api';

export default function BarcodesPage() {
  const [summary, setSummary] = useState<BarcodeSummary | null>(null);
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingOnly]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { per_page: 100 };
      if (q.trim()) params.q = q.trim();
      if (missingOnly) params.missing = 1;
      const [sumRes, listRes] = await Promise.all([getBarcodeSummary(), listBarcodes(params)]);
      setSummary(sumRes.data);
      setItems(listRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }

  async function generateMissing() {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await generateMissingBarcodes();
      setSuccess(`تم توليد ${res.data.generated} باركود`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التوليد');
    } finally {
      setGenerating(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.filter((i) => i.barcode).map((i) => i.id)));
  }

  function printSelected() {
    const labels = items.filter((p) => selected.has(p.id) && p.barcode);
    if (labels.length === 0) {
      setError('لا توجد منتجات مختارة لها باركود');
      return;
    }
    openPrintWindow(labels);
  }

  const stats = useMemo(
    () => [
      { label: 'إجمالي المنتجات', value: summary?.total_products ?? 0, color: 'bg-slate-100 text-slate-700' },
      { label: 'لديها باركود', value: summary?.with_barcode ?? 0, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'بدون باركود', value: summary?.without_barcode ?? 0, color: 'bg-amber-100 text-amber-700' },
      { label: 'تكرارات', value: summary?.duplicates ?? 0, color: 'bg-rose-100 text-rose-700' },
    ],
    [summary],
  );

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Barcode className="w-6 h-6 text-[#0E5C3A]" />
            إدارة الباركود
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            توليد كود EAN-13 تلقائياً للمنتجات الجديدة، طباعة بطاقات للأرفف، والبحث برقم الباركود.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateMissing}
            disabled={generating || (summary?.without_barcode ?? 0) === 0}
            className="bg-[#0E5C3A] hover:bg-[#0a4a2e] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {generating ? 'جاري التوليد...' : 'توليد للمفقود'}
          </button>
          <button
            onClick={printSelected}
            disabled={selected.size === 0}
            className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            طباعة المختارة ({selected.size})
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${s.color}`}>
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refresh()}
              placeholder="بحث بالاسم أو رقم الباركود"
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0E5C3A]/20 focus:border-[#0E5C3A]"
            />
          </div>
          <label className="text-sm text-slate-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            بدون باركود فقط
          </label>
          <button
            onClick={refresh}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
          >
            تحديث
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.filter((i) => i.barcode).length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-right">المنتج</th>
                <th className="px-4 py-3 text-right">الباركود</th>
                <th className="px-4 py-3 text-right">السعر</th>
                <th className="px-4 py-3 text-right">المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-12">
                    جاري التحميل...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-12">
                    لا توجد منتجات
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      disabled={!p.barcode}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.name.ar}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {p.barcode ? (
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {p.barcode}
                      </span>
                    ) : (
                      <span className="text-amber-700 text-xs">— مفقود</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{Number(p.price).toLocaleString()} ج.س</td>
                  <td className="px-4 py-3 text-slate-700">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Open a print-friendly window with EAN-13 barcodes drawn as SVG.
 * Each label shows the product name (AR), the barcode as bars, the digits, and the price.
 * 4 columns × N rows fit on A4 portrait.
 */
function openPrintWindow(products: AdminProduct[]) {
  const labels = products.map((p) => labelHtml(p)).join('');
  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>طباعة باركود</title>
<style>
  @page { size: A4; margin: 8mm; }
  body { font-family: 'Cairo', 'Tahoma', sans-serif; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
  .label { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 4mm; text-align: center; page-break-inside: avoid; }
  .label .name { font-size: 11px; font-weight: 700; margin-bottom: 4px; min-height: 30px; }
  .label .price { font-size: 13px; font-weight: 700; color: #0E5C3A; margin-top: 4px; }
  .label .digits { font-family: monospace; font-size: 11px; letter-spacing: 1px; margin-top: 2px; }
  @media print { .no-print { display: none; } }
</style></head>
<body>
  <div class="no-print" style="text-align:center;padding:8px;background:#0E5C3A;color:#fff;">
    <button onclick="window.print()">طباعة</button> &nbsp;
    <span style="opacity:.85;font-size:12px">${products.length} بطاقة</span>
  </div>
  <div class="grid">${labels}</div>
</body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function labelHtml(p: AdminProduct): string {
  const code = (p.barcode ?? '').replace(/[^0-9]/g, '');
  const svg = ean13Svg(code);
  return `<div class="label">
    <div class="name">${escapeHtml(p.name.ar)}</div>
    ${svg}
    <div class="digits" dir="ltr">${escapeHtml(p.barcode ?? '')}</div>
    <div class="price">${Number(p.price).toLocaleString()} ج.س</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* Minimal EAN-13 SVG renderer. Returns a 100×40 svg of black bars on white. */
function ean13Svg(code: string): string {
  if (code.length !== 13) {
    return `<svg viewBox="0 0 200 40" width="100%" height="40"><text x="100" y="22" text-anchor="middle" font-size="10" fill="#94a3b8">باركود غير صالح</text></svg>`;
  }
  // EAN-13 left-side L/G coding map per first digit
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const L: Record<string, string> = {
    '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011',
    '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011',
  };
  const G: Record<string, string> = {
    '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001', '4': '0011101',
    '5': '0111001', '6': '0000101', '7': '0010001', '8': '0001001', '9': '0010111',
  };
  const R: Record<string, string> = {
    '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010', '4': '1011100',
    '5': '1001110', '6': '1010000', '7': '1000100', '8': '1001000', '9': '1110100',
  };
  const first = code[0];
  const left = code.slice(1, 7);
  const right = code.slice(7, 13);
  const parity = PARITY[parseInt(first, 10)];
  let bits = '101'; // start guard
  for (let i = 0; i < 6; i++) bits += parity[i] === 'L' ? L[left[i]] : G[left[i]];
  bits += '01010'; // middle guard
  for (let i = 0; i < 6; i++) bits += R[right[i]];
  bits += '101'; // end guard
  // 95 modules total
  const moduleW = 2;
  const totalW = bits.length * moduleW;
  const h = 40;
  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${i * moduleW}" y="0" width="${moduleW}" height="${h}" fill="#000"/>`;
    }
  }
  return `<svg viewBox="0 0 ${totalW} ${h}" width="100%" height="40">${rects}</svg>`;
}
