'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CreditCard,
  History,
  Minus,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import {
  createPosSale,
  getCurrentPosSession,
  listCategories,
  listPosSales,
  openPosSession,
  searchPosProducts,
  voidPosSale,
  type AdminCategory,
  type PosProduct,
  type PosSale,
} from '@/lib/admin/api';
import { fmtSDG } from '@/lib/admin/format';

type CartLine = {
  product_id: number;
  name: string;
  image: string | null;
  unit_price: number;
  quantity: number;
  stock: number;
  barcode: string | null;
};

type PaymentMethod = 'cash' | 'mobile_money' | 'card';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export default function PosPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [customerPhone, setCustomerPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [recentSales, setRecentSales] = useState<PosSale[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((res) => {
        const url = res.data?.store_logo as string | undefined;
        if (url) {
          setLogoUrl(url.startsWith('http') ? url : `${API_BASE}/storage/${url}`);
        }
      })
      .catch(() => {});
    initSession();
    listCategories().then((r) => setCategories(r.data)).catch(() => setCategories([]));
    refreshRecentSales();
  }, []);

  async function refreshRecentSales() {
    try {
      const r = await listPosSales({ status: 'completed', page: 1 });
      setRecentSales(r.data.slice(0, 10));
    } catch {
      setRecentSales([]);
    }
  }

  async function initSession() {
    try {
      const r = await getCurrentPosSession();
      if (r.data) {
        setSessionId(r.data.id);
      } else {
        const created = await openPosSession({ opening_cash: 0 });
        setSessionId(created.data.id);
      }
    } catch {
      setError('تعذر فتح جلسة البيع');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionId) searchRef.current?.focus();
  }, [sessionId]);

  useEffect(() => {
    setSearching(true);
    const timer = setTimeout(() => {
      searchPosProducts(q.trim(), {
        category_id: activeCategory === 'all' ? undefined : activeCategory,
        limit: 36,
      })
        .then((r) => setProducts(r.data))
        .catch(() => setProducts([]))
        .finally(() => setSearching(false));
    }, 160);
    return () => clearTimeout(timer);
  }, [q, activeCategory]);

  function addToCart(product: PosProduct, qty = 1) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.product_id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: Math.min(product.stock, line.quantity + qty) }
            : line,
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name.ar || product.name.en || `#${product.id}`,
        image: product.image,
        unit_price: product.price,
        quantity: Math.min(product.stock, Math.max(1, qty)),
        stock: product.stock,
        barcode: product.barcode,
      }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.product_id === id
            ? { ...line, quantity: Math.min(line.stock, Math.max(0, line.quantity + delta)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(id: number) {
    setCart((prev) => prev.filter((line) => line.product_id !== id));
  }

  function clearCart() {
    setCart([]);
    setDiscount('0');
    setCustomerPhone('');
    setAmountPaid('0');
    setMethod('cash');
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0),
    [cart],
  );
  const discountValue = useMemo(() => {
    const value = parseFloat(discount) || 0;
    return Math.max(0, Math.min(value, subtotal));
  }, [discount, subtotal]);
  const total = Math.max(0, subtotal - discountValue);

  useEffect(() => {
    if (method !== 'cash') setAmountPaid(total.toString());
  }, [method, total]);

  async function submitSale() {
    if (!sessionId || !cart.length) return;
    const paid = parseFloat(amountPaid) || 0;
    if (method === 'cash' && paid < total) {
      setError('المبلغ المدفوع أقل من الإجمالي');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await createPosSale({
        session_id: sessionId,
        items: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
        payment_method: method,
        amount_paid: method === 'cash' ? paid : total,
        discount_amount: discountValue,
        customer_phone: customerPhone || undefined,
      });
      setLastSale(r.data);
      clearCart();
      refreshRecentSales();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إتمام البيع');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(sale: PosSale) {
    if (!window.confirm(`إرجاع/إلغاء العملية ${sale.sale_number}؟`)) return;
    try {
      await voidPosSale(sale.id);
      await refreshRecentSales();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ الإرجاع');
    }
  }

  if (loading) return <div className="p-6 text-slate-500">جاري التحميل...</div>;

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-slate-100 -m-4 lg:-m-6" dir="rtl">
      <header className="bg-[#101923] text-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="ود المرضي ماركت" className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#0E5C3A] grid place-items-center">
              <ShoppingCart className="w-7 h-7" />
            </div>
          )}
          <div>
            <div className="font-extrabold">ود المرضي ماركت</div>
            <div className="text-xs text-slate-300">نقطة البيع</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-5 text-sm">
          <span>{new Date().toLocaleDateString('en-CA')}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            متصل
          </span>
        </div>
        <Link href="/admin/pos/sessions" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-1.5">
          <History className="w-4 h-4" />
          الجلسات
        </Link>
      </header>

      {error && (
        <div className="m-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} title="إغلاق"><X className="w-4 h-4" /></button>
        </div>
      )}

      <main className="grid xl:grid-cols-[380px_1fr] gap-4 p-4">
        <CartPanel
          cart={cart}
          changeQty={changeQty}
          removeLine={removeLine}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          subtotal={subtotal}
          discount={discount}
          setDiscount={setDiscount}
          total={total}
          method={method}
          setMethod={setMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          clearCart={clearCart}
          submitSale={submitSale}
          submitting={submitting}
        />

        <section className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="البحث عن منتج..."
                  className="w-full pr-9 pl-3 h-11 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="h-11 px-4 rounded-lg border border-emerald-200 text-[#0E5C3A] font-bold inline-flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                بحث
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pt-3">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={tabClass(activeCategory === 'all')}
              >
                الكل
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(String(category.id))}
                  className={tabClass(activeCategory === String(category.id))}
                >
                  {category.name.ar}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 min-h-[430px]">
            {searching ? (
              <div className="h-full grid place-items-center text-slate-400">جار تحميل المنتجات...</div>
            ) : products.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-400">لا توجد منتجات</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <ProductTile key={product.id} product={product} onAdd={addToCart} />
                ))}
              </div>
            )}
          </div>

          {recentSales.length > 0 && (
            <ReturnsTable sales={recentSales} onReturn={handleReturn} />
          )}
        </section>
      </main>

      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </div>
  );
}

function tabClass(active: boolean) {
  return [
    'shrink-0 h-9 px-4 rounded-lg text-sm font-bold border transition-colors',
    active ? 'bg-[#0E5C3A] text-white border-[#0E5C3A]' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  ].join(' ');
}

function ProductTile({ product, onAdd }: { product: PosProduct; onAdd: (product: PosProduct) => void }) {
  const name = product.name.ar || product.name.en || `#${product.id}`;
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={product.stock <= 0}
      className="border border-slate-200 rounded-lg overflow-hidden bg-white text-right hover:border-[#0E5C3A] hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ProductImage src={product.image} alt={name} className="w-full aspect-[4/3] object-cover bg-slate-50" />
      <div className="p-2 min-h-24">
        <div className="text-sm font-bold text-slate-800 line-clamp-2 min-h-10">{name}</div>
        <div className="text-[#0E5C3A] font-extrabold mt-1">{fmtSDG(product.price)}</div>
        <div className="text-[11px] text-slate-500" dir="ltr">SKU: {product.barcode ?? product.slug}</div>
      </div>
    </button>
  );
}

function CartPanel({
  cart,
  changeQty,
  removeLine,
  customerPhone,
  setCustomerPhone,
  subtotal,
  discount,
  setDiscount,
  total,
  method,
  setMethod,
  amountPaid,
  setAmountPaid,
  clearCart,
  submitSale,
  submitting,
}: {
  cart: CartLine[];
  changeQty: (id: number, delta: number) => void;
  removeLine: (id: number) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  subtotal: number;
  discount: string;
  setDiscount: (value: string) => void;
  total: number;
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  amountPaid: string;
  setAmountPaid: (value: string) => void;
  clearCart: () => void;
  submitSale: () => void;
  submitting: boolean;
}) {
  return (
    <aside className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col">
      <div className="font-extrabold text-lg pb-3 border-b border-slate-100">الطلب</div>

      <label className="mt-3 block">
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <User className="w-3 h-3" />
          عميل (اختياري)
        </span>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="رقم الهاتف"
          className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          dir="ltr"
        />
      </label>

      <div className="grid grid-cols-[1fr_80px_70px] gap-2 text-xs text-slate-500 mt-4 pb-2 border-b border-slate-100">
        <span>المنتج</span>
        <span className="text-center">الكمية</span>
        <span className="text-center">المجموع</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {cart.length === 0 ? (
          <div className="h-48 grid place-items-center text-slate-400 text-sm">أضف منتجات إلى الطلب</div>
        ) : (
          cart.map((line) => (
            <div
              key={line.product_id}
              className="w-full grid grid-cols-[1fr_80px_70px] gap-2 items-center py-2 border-b border-slate-100 text-right"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => removeLine(line.product_id)}
                  className="text-slate-400 hover:text-red-600 shrink-0"
                  title="حذف"
                >
                  <X className="w-4 h-4" />
                </button>
                <ProductImage src={line.image} alt={line.name} className="w-9 h-9 rounded object-cover bg-slate-50 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{line.name}</div>
                  <div className="text-[10px] text-slate-400">{fmtSDG(line.unit_price)}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => changeQty(line.product_id, -1)}
                  className="w-7 h-7 rounded border border-slate-200 grid place-items-center hover:bg-slate-50"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center text-sm font-bold">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => changeQty(line.product_id, 1)}
                  className="w-7 h-7 rounded border border-slate-200 grid place-items-center hover:bg-slate-50"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-center text-xs font-bold">{fmtSDG(line.unit_price * line.quantity)}</span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2 mt-auto">
        <SummaryRow label="الإجمالي" value={fmtSDG(subtotal)} />
        <label className="flex items-center justify-between text-sm">
          <span className="text-slate-500">الخصم</span>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-24 h-8 text-left border border-slate-200 rounded px-2 text-sm font-semibold"
            dir="ltr"
          />
        </label>
        <SummaryRow label="الإجمالي بعد الخصم" value={fmtSDG(total)} />

        <div className="flex items-center gap-2">
          {(['cash', 'card', 'mobile_money'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 h-10 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5 ${method === m ? 'bg-emerald-100 text-[#0E5C3A]' : 'bg-slate-50 text-slate-600'}`}
            >
              {m === 'cash' ? <Banknote className="w-4 h-4" /> : m === 'card' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              {m === 'cash' ? 'نقدي' : m === 'card' ? 'بطاقة' : 'محفظة'}
            </button>
          ))}
        </div>

        {method === 'cash' && (
          <label className="flex items-center justify-between text-sm">
            <span className="text-slate-500">المدفوع</span>
            <input
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-28 h-8 text-left border border-slate-200 rounded px-2 text-sm font-semibold"
              dir="ltr"
            />
          </label>
        )}
        {method === 'cash' && parseFloat(amountPaid) > total && (
          <div className="text-sm text-emerald-600 font-bold text-left">
            الباقي: {fmtSDG(parseFloat(amountPaid) - total)}
          </div>
        )}

        <button
          type="button"
          onClick={submitSale}
          disabled={!cart.length || submitting || (method === 'cash' && (parseFloat(amountPaid) || 0) < total)}
          className="w-full h-12 rounded-lg bg-[#138A43] text-white font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Banknote className="w-5 h-5" />
          {submitting ? 'جار الدفع...' : `إتمام البيع ${fmtSDG(total)}`}
        </button>
        <button type="button" onClick={clearCart} className="w-full h-10 rounded-lg bg-red-50 text-red-700 font-bold inline-flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" />
          إلغاء الطلب
        </button>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ReceiptModal({ sale, onClose }: { sale: PosSale; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[95vw] shadow-xl" dir="rtl">
        <div className="text-center mb-4">
          <ShoppingCart className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-xl font-extrabold">تم البيع بنجاح</h3>
          <p className="text-sm text-slate-500">رقم العملية: {sale.sale_number}</p>
        </div>
        <div className="space-y-1.5 text-sm border-y border-slate-200 py-3 my-3">
          {sale.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="flex-1 truncate">{item.quantity}x {item.product_name}</span>
              <span className="font-semibold">{fmtSDG(item.line_total)}</span>
            </div>
          ))}
        </div>
        <SummaryRow label="المجموع الفرعي" value={fmtSDG(sale.subtotal)} />
        <SummaryRow label="الخصم" value={fmtSDG(sale.discount_amount)} />
        <div className="flex justify-between font-extrabold text-base pt-2 border-t border-slate-200 mt-2">
          <span>الإجمالي</span>
          <span className="text-[#0E5C3A]">{fmtSDG(sale.total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Link href={`/admin/pos/sales/${sale.id}`} className="h-10 rounded-lg border border-slate-200 text-sm font-bold inline-flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            طباعة
          </Link>
          <button type="button" onClick={onClose} className="h-10 rounded-lg bg-[#0E5C3A] text-white text-sm font-bold">
            عملية جديدة
          </button>
        </div>
      </div>
    </div>
  );
}

function ReturnsTable({ sales, onReturn }: { sales: PosSale[]; onReturn: (sale: PosSale) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-rose-600" />
        آخر العمليات
      </div>
      <div className="space-y-2 max-h-[260px] overflow-y-auto">
        {sales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-2 text-xs border border-slate-100 rounded-lg p-2">
            <div>
              <div className="font-mono font-bold" dir="ltr">{sale.sale_number}</div>
              <div className="text-slate-500">{fmtSDG(sale.total)}</div>
            </div>
            <button type="button" onClick={() => onReturn(sale)} className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-bold">
              إرجاع
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
