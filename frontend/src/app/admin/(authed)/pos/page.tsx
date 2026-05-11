'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ScanLine,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  X,
  History,
  Printer,
  ListChecks,
} from 'lucide-react';
import {
  closePosSession,
  createPosSale,
  getCurrentPosSession,
  openPosSession,
  searchPosProducts,
  type PosProduct,
  type PosSale,
  type PosSession,
} from '@/lib/admin/api';
import { fmtSDG } from '@/lib/admin/format';

type CartLine = {
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  stock: number;
  barcode: string | null;
};

type PaymentMethod = 'cash' | 'mobile_money' | 'card';

export default function PosPage() {
  const [session, setSession] = useState<PosSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // open-session modal
  const [openModal, setOpenModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('0');

  // search
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [customerPhone, setCustomerPhone] = useState('');

  // payment
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);

  // close-session modal
  const [closeModal, setCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState('0');

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    if (session) searchRef.current?.focus();
  }, [session]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchPosProducts(q.trim())
        .then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  async function refreshSession() {
    setLoading(true);
    setError(null);
    try {
      const r = await getCurrentPosSession();
      setSession(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenSession() {
    const cash = parseFloat(openingCash) || 0;
    if (cash < 0) {
      setError('الرصيد الافتتاحي يجب أن يكون 0 أو أكثر');
      return;
    }
    try {
      const r = await openPosSession({ opening_cash: cash });
      setSession(r.data);
      setOpenModal(false);
      setOpeningCash('0');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر فتح الجلسة');
    }
  }

  function addToCart(p: PosProduct, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id
            ? { ...l, quantity: Math.min(p.stock, l.quantity + qty) }
            : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name.ar || p.name.en || `#${p.id}`,
          unit_price: p.price,
          quantity: Math.min(p.stock, Math.max(1, qty)),
          stock: p.stock,
          barcode: p.barcode,
        },
      ];
    });
    setQ('');
    setResults([]);
    searchRef.current?.focus();
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product_id === id
            ? { ...l, quantity: Math.min(l.stock, Math.max(0, l.quantity + delta)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
  function setQty(id: number, n: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product_id === id
            ? { ...l, quantity: Math.min(l.stock, Math.max(0, n || 0)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(id: number) {
    setCart((prev) => prev.filter((l) => l.product_id !== id));
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [cart],
  );
  const discountValue = useMemo(() => {
    const n = parseFloat(discount) || 0;
    return Math.max(0, Math.min(n, subtotal));
  }, [discount, subtotal]);
  const total = Math.max(0, subtotal - discountValue);

  function openPayment() {
    if (!cart.length) return;
    setAmountPaid(total.toString());
    setMethod('cash');
    setPaymentOpen(true);
  }

  async function submitSale() {
    if (!session) return;
    const paid = parseFloat(amountPaid) || 0;
    if (method === 'cash' && paid < total) {
      setError('المبلغ المدفوع أقل من الإجمالي');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await createPosSale({
        session_id: session.id,
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        payment_method: method,
        amount_paid: method === 'cash' ? paid : total,
        discount_amount: discountValue,
        customer_phone: customerPhone || undefined,
      });
      setLastSale(r.data);
      setCart([]);
      setDiscount('0');
      setCustomerPhone('');
      setPaymentOpen(false);
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إتمام البيع');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    const counted = parseFloat(countedCash);
    if (!Number.isFinite(counted) || counted < 0) {
      setError('أدخل قيمة العدّ النقدي');
      return;
    }
    try {
      const r = await closePosSession(session.id, { closing_cash_counted: counted });
      setSession(null);
      setCloseModal(false);
      setCountedCash('0');
      window.alert(
        `تم إقفال الجلسة. الفارق: ${fmtSDG(r.data.variance ?? 0)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إقفال الجلسة');
    }
  }

  // ─── render ──────────────────────────────────────────
  if (loading) return <div className="p-6 text-slate-500">جاري التحميل…</div>;

  if (!session) {
    return (
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#0E5C3A]" />
            <h1 className="text-2xl font-extrabold">نقطة البيع</h1>
          </div>
          <Link
            href="/admin/pos/sessions"
            className="text-sm text-[#0E5C3A] inline-flex items-center gap-1.5 hover:underline"
          >
            <History className="w-4 h-4" />
            سجل الجلسات
          </Link>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <ScanLine className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">لا توجد جلسة بيع مفتوحة</h2>
          <p className="text-sm text-slate-500 mb-5">
            افتح جلسة جديدة لبدء استقبال العملاء
          </p>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="px-5 py-2.5 bg-[#0E5C3A] text-white rounded-lg font-semibold hover:bg-[#0a4a2e]"
          >
            فتح جلسة جديدة
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {openModal && (
          <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
            <div className="bg-white rounded-2xl p-6 w-[420px] shadow-xl" dir="rtl">
              <h3 className="text-lg font-bold mb-4">فتح جلسة بيع جديدة</h3>
              <label className="block text-sm mb-1.5 text-slate-700">
                الرصيد النقدي الافتتاحي (ج.س)
              </label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-5 text-lg"
                min={0}
                step="0.01"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleOpenSession}
                  className="px-4 py-2 text-sm rounded-lg bg-[#0E5C3A] text-white font-semibold"
                >
                  فتح الجلسة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-[#0E5C3A]" />
          <h1 className="text-xl font-extrabold">نقطة البيع</h1>
          <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">
            جلسة #{session.id} مفتوحة
          </span>
          {session.opened_by && (
            <span className="text-xs text-slate-500">— {session.opened_by.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pos/sessions"
            className="text-sm text-slate-600 inline-flex items-center gap-1.5 hover:text-[#0E5C3A]"
          >
            <History className="w-4 h-4" />
            الجلسات
          </Link>
          <Link
            href="/admin/pos/z-report"
            className="text-sm text-slate-600 inline-flex items-center gap-1.5 hover:text-[#0E5C3A]"
          >
            <ListChecks className="w-4 h-4" />
            تقرير اليوم
          </Link>
          <button
            type="button"
            onClick={() => {
              setCountedCash((session.expected_cash ?? 0).toString());
              setCloseModal(true);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
          >
            إقفال الجلسة
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* search + results */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="امسح الباركود أو ابحث بالاسم…"
              className="w-full border border-slate-300 rounded-xl pr-10 pl-3 py-3 text-lg"
            />
          </div>

          {searching && (
            <div className="text-sm text-slate-400 py-2">جاري البحث…</div>
          )}
          {!searching && q && results.length === 0 && (
            <div className="text-sm text-slate-400 py-2">لا توجد نتائج</div>
          )}
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#0E5C3A] hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed text-right"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 truncate">
                      {p.name.ar || p.name.en}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                      {p.barcode && <span>باركود: {p.barcode}</span>}
                      <span
                        className={
                          p.stock > 5
                            ? 'text-emerald-700'
                            : p.stock > 0
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }
                      >
                        المخزون: {p.stock}
                      </span>
                    </div>
                  </div>
                  <div className="text-[#0E5C3A] font-bold">{fmtSDG(p.price)}</div>
                </button>
              ))}
            </div>
          )}

          {!q && (
            <div className="text-center text-sm text-slate-400 py-12">
              استخدم القارئ أو اكتب اسم المنتج للبدء.
            </div>
          )}
        </div>

        {/* cart */}
        <aside className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">السلة ({cart.length})</h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:underline"
              >
                إفراغ السلة
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[28rem] -mx-1 px-1">
            {cart.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-12">
                السلة فارغة
              </div>
            )}
            {cart.map((l) => (
              <div
                key={l.product_id}
                className="py-2.5 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold text-slate-800 line-clamp-2 flex-1">
                    {l.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.product_id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQty(l.product_id, -1)}
                      className="w-7 h-7 rounded-md border border-slate-300 grid place-items-center hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => setQty(l.product_id, parseInt(e.target.value, 10))}
                      className="w-12 text-center border border-slate-300 rounded-md py-1 text-sm"
                      min={1}
                      max={l.stock}
                    />
                    <button
                      type="button"
                      onClick={() => changeQty(l.product_id, +1)}
                      className="w-7 h-7 rounded-md border border-slate-300 grid place-items-center hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-slate-400 mx-1">×</span>
                    <span className="text-xs text-slate-500">
                      {fmtSDG(l.unit_price)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {fmtSDG(l.unit_price * l.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <label className="block">
                <span className="text-xs text-slate-600">رقم هاتف العميل (لمنح نقاط الولاء)</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+249…"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">خصم نقدي (ج.س)</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min={0}
                  max={subtotal}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">المجموع الفرعي</span>
                <span>{fmtSDG(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-sm text-amber-700">
                  <span>الخصم</span>
                  <span>−{fmtSDG(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-xl pt-2 border-t border-slate-200">
                <span>الإجمالي</span>
                <span className="text-[#0E5C3A]">{fmtSDG(total)}</span>
              </div>
              <button
                type="button"
                onClick={openPayment}
                className="w-full mt-2 py-3 bg-[#0E5C3A] text-white rounded-xl font-bold text-lg hover:bg-[#0a4a2e]"
              >
                إتمام البيع
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* payment modal */}
      {paymentOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[440px] max-w-[95vw] shadow-xl" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إتمام الدفع</h3>
              <button onClick={() => setPaymentOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex justify-between font-bold text-xl mb-4 pb-3 border-b border-slate-200">
              <span>الإجمالي المطلوب</span>
              <span className="text-[#0E5C3A]">{fmtSDG(total)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(
                [
                  { id: 'cash', label: 'نقدي', Icon: Banknote },
                  { id: 'mobile_money', label: 'محفظة', Icon: Smartphone },
                  { id: 'card', label: 'بطاقة', Icon: CreditCard },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethod(m.id);
                    if (m.id !== 'cash') setAmountPaid(total.toString());
                  }}
                  className={[
                    'flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-bold transition-colors',
                    method === m.id
                      ? 'border-[#0E5C3A] bg-emerald-50 text-[#0E5C3A]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300',
                  ].join(' ')}
                >
                  <m.Icon className="w-6 h-6" />
                  {m.label}
                </button>
              ))}
            </div>

            <label className="block mb-3">
              <span className="text-xs text-slate-600">المبلغ المستلم (ج.س)</span>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                disabled={method !== 'cash'}
                min={method === 'cash' ? total : undefined}
                step="0.01"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-3 text-2xl font-bold disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            {method === 'cash' && (
              <div className="flex justify-between text-sm mb-4 p-2 bg-emerald-50 rounded-lg">
                <span className="text-emerald-700">المتبقي للعميل</span>
                <span className="font-bold text-emerald-700">
                  {fmtSDG(Math.max(0, (parseFloat(amountPaid) || 0) - total))}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={submitSale}
              disabled={submitting || (method === 'cash' && (parseFloat(amountPaid) || 0) < total)}
              className="w-full py-3 bg-[#0E5C3A] text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'جاري المعالجة…' : 'تأكيد البيع'}
            </button>
          </div>
        </div>
      )}

      {/* receipt modal */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-[420px] max-w-[95vw] shadow-xl" dir="rtl">
            <div className="text-center mb-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-xl font-extrabold">تم البيع بنجاح</h3>
              <p className="text-sm text-slate-500">رقم العملية: {lastSale.sale_number}</p>
            </div>
            <div className="space-y-1.5 text-sm border-y border-slate-200 py-3 my-3">
              {lastSale.items?.map((it) => (
                <div key={it.id} className="flex justify-between gap-2">
                  <span className="flex-1 truncate">
                    {it.quantity}× {it.product_name}
                  </span>
                  <span className="font-semibold">{fmtSDG(it.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm mb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">المجموع الفرعي</span>
                <span>{fmtSDG(lastSale.subtotal)}</span>
              </div>
              {lastSale.discount_amount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>الخصم</span>
                  <span>−{fmtSDG(lastSale.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-base pt-1 border-t border-slate-200">
                <span>الإجمالي</span>
                <span className="text-[#0E5C3A]">{fmtSDG(lastSale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  دفع{' '}
                  {lastSale.payment_method === 'cash'
                    ? 'نقدي'
                    : lastSale.payment_method === 'mobile_money'
                      ? 'محفظة إلكترونية'
                      : 'بطاقة'}
                </span>
                <span>{fmtSDG(lastSale.amount_paid)}</span>
              </div>
              {lastSale.change_given > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>المبلغ المرتجع</span>
                  <span>{fmtSDG(lastSale.change_given)}</span>
                </div>
              )}
              {lastSale.points_earned > 0 && (
                <div className="flex justify-between text-violet-700 font-semibold">
                  <span>نقاط الولاء المكتسبة</span>
                  <span>+{lastSale.points_earned}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/pos/sales/${lastSale.id}`}
                className="flex-1 py-2.5 text-center rounded-lg border border-slate-200 text-sm font-bold hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                طباعة الإيصال
              </Link>
              <button
                type="button"
                onClick={() => setLastSale(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#0E5C3A] text-white text-sm font-bold"
              >
                عملية جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* close session */}
      {closeModal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[440px] shadow-xl" dir="rtl">
            <h3 className="text-lg font-bold mb-3">إقفال جلسة البيع</h3>
            <div className="text-sm bg-slate-50 rounded-lg p-3 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">رصيد افتتاحي</span>
                <span>{fmtSDG(session.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">عدد العمليات</span>
                <span>{session.sales_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي المبيعات</span>
                <span>{fmtSDG(session.sales_total ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span>الكاش المتوقع في الدرج</span>
                <span>{fmtSDG(session.expected_cash ?? 0)}</span>
              </div>
            </div>
            <label className="block mb-4">
              <span className="text-sm text-slate-700">الكاش المعدود فعلياً</span>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-lg font-bold"
                min={0}
                step="0.01"
                autoFocus
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCloseModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold"
              >
                إقفال الجلسة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
