'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Barcode,
  CalendarDays,
  CreditCard,
  History,
  LockKeyhole,
  Menu,
  Minus,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Star,
  Trash2,
  UnlockKeyhole,
  User,
  X,
} from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import {
  closePosSession,
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
  type PosSession,
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
type PadTarget = 'quantity' | 'discount' | 'paid';

const DRAFT_KEY = 'wdalmardy-pos-draft';

export default function PosPage() {
  const [session, setSession] = useState<PosSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('0');
  const [closeModal, setCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState('0');

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [favourites, setFavourites] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [discount, setDiscount] = useState('0');
  const [customerPhone, setCustomerPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [padTarget, setPadTarget] = useState<PadTarget>('quantity');
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [recentSales, setRecentSales] = useState<PosSale[]>([]);

  useEffect(() => {
    refreshSession();
    listCategories().then((r) => setCategories(r.data)).catch(() => setCategories([]));
    searchPosProducts('', { featured: true, limit: 8 }).then((r) => setFavourites(r.data)).catch(() => setFavourites([]));
    refreshRecentSales();
  }, []);

  useEffect(() => {
    if (session) searchRef.current?.focus();
  }, [session]);

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

  async function refreshRecentSales() {
    try {
      const r = await listPosSales({ status: 'completed', page: 1 });
      setRecentSales(r.data.slice(0, 5));
    } catch {
      setRecentSales([]);
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
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name.ar || product.name.en || `#${product.id}`,
          image: product.image,
          unit_price: product.price,
          quantity: Math.min(product.stock, Math.max(1, qty)),
          stock: product.stock,
          barcode: product.barcode,
        },
      ];
    });
    setSelectedLineId(product.id);
    setPadTarget('quantity');
  }

  function setLineQuantity(id: number, quantity: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.product_id === id
            ? { ...line, quantity: Math.min(line.stock, Math.max(0, quantity)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function changeQty(id: number, delta: number) {
    const line = cart.find((item) => item.product_id === id);
    setLineQuantity(id, (line?.quantity ?? 0) + delta);
  }

  function removeLine(id: number) {
    setCart((prev) => prev.filter((line) => line.product_id !== id));
    if (selectedLineId === id) setSelectedLineId(null);
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
    if (!session || !cart.length) return;
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
        items: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
        payment_method: method,
        amount_paid: method === 'cash' ? paid : total,
        discount_amount: discountValue,
        customer_phone: customerPhone || undefined,
      });
      setLastSale(r.data);
      clearCart();
      window.localStorage.removeItem(DRAFT_KEY);
      await Promise.all([refreshSession(), refreshRecentSales()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إتمام البيع');
    } finally {
      setSubmitting(false);
    }
  }

  function clearCart() {
    setCart([]);
    setSelectedLineId(null);
    setDiscount('0');
    setCustomerPhone('');
    setAmountPaid('0');
    setMethod('cash');
  }

  function saveDraft() {
    if (!cart.length) return;
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ cart, discount, customerPhone, savedAt: new Date().toISOString() }),
    );
    window.alert('تم حفظ الطلب كمسودة');
  }

  function restoreDraft() {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      window.alert('لا توجد مسودة محفوظة');
      return;
    }
    try {
      const draft = JSON.parse(raw) as { cart: CartLine[]; discount: string; customerPhone: string };
      setCart(draft.cart ?? []);
      setDiscount(draft.discount ?? '0');
      setCustomerPhone(draft.customerPhone ?? '');
      setSelectedLineId(draft.cart?.[0]?.product_id ?? null);
    } catch {
      window.alert('تعذر فتح المسودة');
    }
  }

  function handlePad(value: string) {
    if (value === 'back') {
      if (padTarget === 'discount') setDiscount((prev) => prev.slice(0, -1) || '0');
      if (padTarget === 'paid') setAmountPaid((prev) => prev.slice(0, -1) || '0');
      if (padTarget === 'quantity' && selectedLineId) {
        const current = String(cart.find((line) => line.product_id === selectedLineId)?.quantity ?? 0);
        setLineQuantity(selectedLineId, Number(current.slice(0, -1) || 0));
      }
      return;
    }
    if (value === 'clear') {
      if (padTarget === 'discount') setDiscount('0');
      if (padTarget === 'paid') setAmountPaid('0');
      if (padTarget === 'quantity' && selectedLineId) setLineQuantity(selectedLineId, 0);
      return;
    }
    const append = (prev: string) => (prev === '0' && value !== '.' ? value : `${prev}${value}`);
    if (padTarget === 'discount') setDiscount(append);
    if (padTarget === 'paid') setAmountPaid(append);
    if (padTarget === 'quantity' && selectedLineId) {
      const current = String(cart.find((line) => line.product_id === selectedLineId)?.quantity ?? 0);
      setLineQuantity(selectedLineId, Number(append(current)));
    }
  }

  async function handleReturn(sale: PosSale) {
    if (!window.confirm(`إرجاع/إلغاء العملية ${sale.sale_number}؟`)) return;
    try {
      await voidPosSale(sale.id);
      await refreshRecentSales();
      window.alert('تم تسجيل الإرجاع وتحديث المخزون');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ الإرجاع');
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    const counted = parseFloat(countedCash);
    if (!Number.isFinite(counted) || counted < 0) {
      setError('أدخل قيمة العد النقدي');
      return;
    }
    try {
      const r = await closePosSession(session.id, { closing_cash_counted: counted });
      setSession(null);
      setCloseModal(false);
      setCountedCash('0');
      window.alert(`تم إقفال الجلسة. الفارق: ${fmtSDG(r.data.variance ?? 0)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إقفال الجلسة');
    }
  }

  if (loading) return <div className="p-6 text-slate-500">جاري التحميل...</div>;

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-6" dir="rtl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-[#0E5C3A]" />
              نقطة البيع
            </h1>
            <p className="text-sm text-slate-500 mt-1">افتح جلسة بيع للبدء</p>
          </div>
          <Link href="/admin/pos/sessions" className="text-sm text-[#0E5C3A] inline-flex items-center gap-1.5">
            <History className="w-4 h-4" />
            سجل الجلسات
          </Link>
        </header>
        <section className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <LockKeyhole className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">لا توجد جلسة مفتوحة</h2>
          <p className="text-sm text-slate-500 mb-5">أدخل الرصيد الافتتاحي لتفعيل الكاشير</p>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="px-5 py-2.5 bg-[#0E5C3A] text-white rounded-lg font-semibold"
          >
            فتح جلسة جديدة
          </button>
        </section>
        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {openModal && (
          <SessionModal
            title="فتح جلسة بيع جديدة"
            value={openingCash}
            onValue={setOpeningCash}
            onClose={() => setOpenModal(false)}
            onSubmit={handleOpenSession}
            submitLabel="فتح الجلسة"
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-slate-100 -m-4 lg:-m-6" dir="rtl">
      <header className="bg-[#101923] text-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#0E5C3A] grid place-items-center">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <div>
            <div className="font-extrabold">ود المرضي ماركت</div>
            <div className="text-xs text-slate-300">نقطة البيع - الفرع الرئيسي</div>
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
        <div className="flex items-center gap-2">
          <button title="تحديث" onClick={() => window.location.reload()} className="pos-top-button">
            <RefreshCcw className="w-4 h-4" />
            <span>تحديث</span>
          </button>
          <button title="قفل الشاشة" className="pos-top-button">
            <LockKeyhole className="w-4 h-4" />
            <span>قفل</span>
          </button>
          <button title="القائمة" className="w-10 h-10 rounded-lg hover:bg-white/10 grid place-items-center">
            <Menu className="w-5 h-5" />
          </button>
        </div>
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
          selectedLineId={selectedLineId}
          setSelectedLineId={setSelectedLineId}
          changeQty={changeQty}
          setLineQuantity={setLineQuantity}
          removeLine={removeLine}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          subtotal={subtotal}
          discountValue={discountValue}
          total={total}
          method={method}
          amountPaid={amountPaid}
          clearCart={clearCart}
          submitSale={submitSale}
          submitting={submitting}
        />

        <section className="space-y-3">
          <div className="grid lg:grid-cols-[1fr_130px] gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="البحث عن منتج، الاسم، الباركود (SKU)"
                    className="w-full pr-9 pl-3 h-11 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => searchRef.current?.focus()}
                  className="h-11 px-4 rounded-lg border border-emerald-200 text-[#0E5C3A] font-bold inline-flex items-center gap-2"
                >
                  <Barcode className="w-4 h-4" />
                  مسح باركود
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

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <Link href="/admin/pos/sessions" className="pos-side-action">
                <Printer className="w-5 h-5" />
                كاشير
              </Link>
              <Link href="/admin/orders" className="pos-side-action">
                <CalendarDays className="w-5 h-5" />
                الطلبات
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_390px] gap-3">
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

            <div className="space-y-3">
              <Keypad target={padTarget} setTarget={setPadTarget} onPress={handlePad} />
              <QuickActions
                method={method}
                setMethod={setMethod}
                setPadTarget={setPadTarget}
                saveDraft={saveDraft}
                restoreDraft={restoreDraft}
                openDrawer={() => window.alert('تم إرسال أمر فتح درج النقود')}
                clearCart={clearCart}
              />
              <Favourites products={favourites} onAdd={addToCart} />
              <ReturnsTable sales={recentSales} onReturn={handleReturn} />
            </div>
          </div>
        </section>
      </main>

      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}
      {closeModal && (
        <SessionModal
          title="إقفال جلسة البيع"
          value={countedCash}
          onValue={setCountedCash}
          onClose={() => setCloseModal(false)}
          onSubmit={handleCloseSession}
          submitLabel="إقفال الجلسة"
          danger
          hint={`الكاش المتوقع: ${fmtSDG(session.expected_cash ?? 0)}`}
        />
      )}

      <footer className="px-4 pb-4 grid md:grid-cols-4 gap-3 text-sm">
        <Metric label="إجمالي اليوم" value={fmtSDG(session.sales_total ?? 0)} />
        <Metric label="عمليات اليوم" value={String(session.sales_count ?? 0)} />
        <Metric label="الكاش المتوقع" value={fmtSDG(session.expected_cash ?? 0)} />
        <button
          type="button"
          onClick={() => {
            setCountedCash((session.expected_cash ?? 0).toString());
            setCloseModal(true);
          }}
          className="bg-white border border-slate-200 rounded-lg p-3 text-red-700 font-bold inline-flex items-center justify-center gap-2"
        >
          <UnlockKeyhole className="w-4 h-4" />
          إقفال الجلسة
        </button>
      </footer>
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
  selectedLineId,
  setSelectedLineId,
  changeQty,
  setLineQuantity,
  removeLine,
  customerPhone,
  setCustomerPhone,
  subtotal,
  discountValue,
  total,
  method,
  amountPaid,
  clearCart,
  submitSale,
  submitting,
}: {
  cart: CartLine[];
  selectedLineId: number | null;
  setSelectedLineId: (id: number) => void;
  changeQty: (id: number, delta: number) => void;
  setLineQuantity: (id: number, quantity: number) => void;
  removeLine: (id: number) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  subtotal: number;
  discountValue: number;
  total: number;
  method: PaymentMethod;
  amountPaid: string;
  clearCart: () => void;
  submitSale: () => void;
  submitting: boolean;
}) {
  return (
    <aside className="bg-white border border-slate-200 rounded-lg p-3 min-h-[690px] flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <button type="button" className="w-8 h-8 rounded border border-slate-200 grid place-items-center">
          <Plus className="w-4 h-4" />
        </button>
        <div className="font-extrabold">العميل</div>
      </div>
      <label className="mt-3 block">
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <User className="w-3 h-3" />
          عميل عام
        </span>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="رقم الهاتف"
          className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          dir="ltr"
        />
      </label>

      <div className="grid grid-cols-[1fr_82px_70px_70px] gap-2 text-xs text-slate-500 mt-4 pb-2 border-b border-slate-100">
        <span>المنتج</span>
        <span className="text-center">الكمية</span>
        <span className="text-center">السعر</span>
        <span className="text-center">المجموع</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-64 grid place-items-center text-slate-400 text-sm">أضف منتجات إلى الطلب</div>
        ) : (
          cart.map((line) => (
            <button
              key={line.product_id}
              type="button"
              onClick={() => setSelectedLineId(line.product_id)}
              className={[
                'w-full grid grid-cols-[1fr_82px_70px_70px] gap-2 items-center py-2 border-b border-slate-100 text-right',
                selectedLineId === line.product_id ? 'bg-emerald-50' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLine(line.product_id);
                  }}
                  className="text-slate-400 hover:text-red-600"
                  title="حذف"
                >
                  <X className="w-4 h-4" />
                </button>
                <ProductImage src={line.image} alt={line.name} className="w-9 h-9 rounded object-cover bg-slate-50 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{line.name}</div>
                  <div className="text-[10px] text-slate-400" dir="ltr">{line.barcode ?? `#${line.product_id}`}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); changeQty(line.product_id, -1); }} className="qty-button">
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  value={line.quantity}
                  onChange={(e) => setLineQuantity(line.product_id, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-7 text-center border border-slate-200 rounded text-sm"
                />
                <button type="button" onClick={(e) => { e.stopPropagation(); changeQty(line.product_id, 1); }} className="qty-button">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-center text-xs">{fmtSDG(line.unit_price)}</span>
              <span className="text-center text-xs font-bold">{fmtSDG(line.unit_price * line.quantity)}</span>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <SummaryRow label="إجمالي المنتجات" value={fmtSDG(subtotal)} />
        <SummaryRow label="خصم" value={fmtSDG(discountValue)} />
        <SummaryRow label="الضريبة (0%)" value={fmtSDG(0)} />
        <div className="flex items-center justify-between pt-2 text-xl font-extrabold">
          <span>الإجمالي</span>
          <span className="text-[#0E5C3A]">{fmtSDG(total)}</span>
        </div>
        <button
          type="button"
          onClick={submitSale}
          disabled={!cart.length || submitting || (method === 'cash' && (parseFloat(amountPaid) || 0) < total)}
          className="w-full h-12 rounded-lg bg-[#138A43] text-white font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Banknote className="w-5 h-5" />
          {submitting ? 'جار الدفع...' : `الدفع ${fmtSDG(total)}`}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={clearCart} className="h-10 rounded-lg bg-red-50 text-red-700 font-bold inline-flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            إلغاء الطلب
          </button>
          <Link href="/admin/pos/sales" className="h-10 rounded-lg bg-slate-50 text-slate-700 font-bold inline-flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            السجل
          </Link>
        </div>
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

function Keypad({ target, setTarget, onPress }: { target: PadTarget; setTarget: (target: PadTarget) => void; onPress: (value: string) => void }) {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back'];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <PadTab label="كمية" active={target === 'quantity'} onClick={() => setTarget('quantity')} />
        <PadTab label="خصم" active={target === 'discount'} onClick={() => setTarget('discount')} />
        <PadTab label="مدفوع" active={target === 'paid'} onClick={() => setTarget('paid')} />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPress(key)}
            className="h-11 rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-lg"
          >
            {key === 'back' ? '⌫' : key}
          </button>
        ))}
      </div>
    </div>
  );
}

function PadTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'h-9 rounded-lg bg-violet-100 text-violet-700 text-sm font-bold' : 'h-9 rounded-lg bg-slate-50 text-slate-600 text-sm font-bold'}
    >
      {label}
    </button>
  );
}

function QuickActions({
  method,
  setMethod,
  setPadTarget,
  saveDraft,
  restoreDraft,
  openDrawer,
  clearCart,
}: {
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  setPadTarget: (target: PadTarget) => void;
  saveDraft: () => void;
  restoreDraft: () => void;
  openDrawer: () => void;
  clearCart: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <PayButton label="نقدي" icon={Banknote} active={method === 'cash'} onClick={() => { setMethod('cash'); setPadTarget('paid'); }} />
        <PayButton label="بطاقة مدى" icon={CreditCard} active={method === 'card'} onClick={() => setMethod('card')} />
        <PayButton label="محفظة" icon={Smartphone} active={method === 'mobile_money'} onClick={() => setMethod('mobile_money')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ActionButton label="إرجاع منتج" icon={RotateCcw} onClick={() => window.alert('اختر عملية من جدول المرتجعات بالأسفل')} tone="rose" />
        <ActionButton label="إزالة منتج" icon={Trash2} onClick={clearCart} tone="amber" />
        <ActionButton label="فتح درج النقود" icon={Printer} onClick={openDrawer} tone="green" />
        <ActionButton label="المنتجات المفضلة" icon={Star} onClick={restoreDraft} tone="violet" />
        <ActionButton label="حفظ كطلب" icon={Save} onClick={saveDraft} tone="slate" wide />
      </div>
    </div>
  );
}

function PayButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Banknote; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'h-10 rounded-lg bg-emerald-100 text-[#0E5C3A] font-bold inline-flex items-center justify-center gap-2' : 'h-10 rounded-lg bg-slate-50 text-slate-600 font-bold inline-flex items-center justify-center gap-2'}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ActionButton({ label, icon: Icon, onClick, tone, wide }: { label: string; icon: typeof Save; onClick: () => void; tone: 'rose' | 'amber' | 'green' | 'violet' | 'slate'; wide?: boolean }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-orange-50 text-orange-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <button type="button" onClick={onClick} className={`${wide ? 'col-span-2' : ''} h-11 rounded-lg ${colors[tone]} font-bold inline-flex items-center justify-center gap-2`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Favourites({ products, onAdd }: { products: PosProduct[]; onAdd: (product: PosProduct) => void }) {
  if (!products.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
        <Star className="w-4 h-4 text-violet-600" />
        المفضلة
      </div>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map((product) => (
          <button key={product.id} type="button" onClick={() => onAdd(product)} className="h-10 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold truncate px-2">
            {product.name.ar || product.name.en}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReturnsTable({ sales, onReturn }: { sales: PosSale[]; onReturn: (sale: PosSale) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-rose-600" />
        المرتجعات
      </div>
      <div className="space-y-2">
        {sales.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">لا توجد عمليات حديثة</div>
        ) : sales.map((sale) => (
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-extrabold text-slate-800 mt-1">{value}</div>
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

function SessionModal({
  title,
  value,
  onValue,
  onClose,
  onSubmit,
  submitLabel,
  danger,
  hint,
}: {
  title: string;
  value: string;
  onValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  danger?: boolean;
  hint?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-[420px] max-w-[95vw] shadow-xl" dir="rtl">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {hint && <div className="bg-slate-50 text-slate-600 rounded-lg p-3 text-sm mb-3">{hint}</div>}
        <label className="block text-sm mb-1.5 text-slate-700">المبلغ النقدي</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-5 text-lg"
          min={0}
          step="0.01"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200">
            إلغاء
          </button>
          <button type="button" onClick={onSubmit} className={`px-4 py-2 text-sm rounded-lg text-white font-semibold ${danger ? 'bg-red-600' : 'bg-[#0E5C3A]'}`}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
