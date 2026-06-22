'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import {
  User, Package, MapPin, LogOut, Award, Wallet, TrendingUp,
  Sparkles, Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  ShoppingBag, Clock, Eye,
} from 'lucide-react';
import { useAuth } from '@/lib/customer/useAuth';
import {
  updateProfile, getOrders, updateAddresses, cancelOrder,
  type CustomerData, type Address, type CustomerOrder,
} from '@/lib/customer/auth';
import { getLoyaltyBalance, type LoyaltyBalance } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  preparing: { ar: 'قيد التحضير', en: 'Preparing' },
  shipped: { ar: 'تم الشحن', en: 'Shipped' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

type Tab = 'orders' | 'profile' | 'addresses' | 'loyalty';

function ProfileTab({ customer, locale }: { customer: CustomerData; locale: string }) {
  const isAr = locale === 'ar';
  const { refresh } = useAuth();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? '');
  const [city, setCity] = useState(customer.city ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, email: email || undefined, city: city || undefined });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">
          {isAr ? 'الاسم' : 'Name'}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">
          {isAr ? 'رقم الهاتف' : 'Phone'}
        </label>
        <input
          value={customer.phone}
          disabled
          dir="ltr"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">
          {isAr ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          dir="ltr"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">
          {isAr ? 'المدينة' : 'City'}
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-brand-green text-white rounded-lg px-6 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved
          ? (isAr ? '✓ تم الحفظ' : '✓ Saved')
          : (isAr ? 'حفظ التغييرات' : 'Save changes')}
      </button>
    </form>
  );
}

function AddressesTab({ customer, locale }: { customer: CustomerData; locale: string }) {
  const isAr = locale === 'ar';
  const [addresses, setAddresses] = useState<Address[]>(customer.addresses ?? []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const blank: Address = { label: '', state: '', district: '', details: '', phone: '' };

  function addAddress() {
    setAddresses([...addresses, { ...blank }]);
    setEditingIndex(addresses.length);
  }

  function removeAddress(i: number) {
    const next = addresses.filter((_, idx) => idx !== i);
    setAddresses(next);
    saveAll(next);
  }

  async function saveAll(updated: Address[]) {
    setSaving(true);
    try {
      await updateAddresses(updated);
    } catch { }
    finally { setSaving(false); }
  }

  function updateField(i: number, field: keyof Address, value: string) {
    const next = addresses.map((a, idx) => (idx === i ? { ...a, [field]: value } : a));
    setAddresses(next);
  }

  async function saveSingle() {
    setEditingIndex(null);
    await saveAll(addresses);
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-6">
          {isAr ? 'لا توجد عناوين مسجلة' : 'No addresses saved'}
        </div>
      )}
      {addresses.map((addr, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4">
          {editingIndex === i ? (
            <div className="space-y-3">
              <input
                value={addr.label}
                onChange={(e) => updateField(i, 'label', e.target.value)}
                placeholder={isAr ? 'تسمية (مثال: المنزل)' : 'Label (e.g. Home)'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={addr.state ?? ''}
                  onChange={(e) => updateField(i, 'state', e.target.value)}
                  placeholder={isAr ? 'الولاية' : 'State'}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={addr.district ?? ''}
                  onChange={(e) => updateField(i, 'district', e.target.value)}
                  placeholder={isAr ? 'المحلية' : 'District'}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <input
                value={addr.details ?? ''}
                onChange={(e) => updateField(i, 'details', e.target.value)}
                placeholder={isAr ? 'العنوان التفصيلي' : 'Detailed address'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={addr.phone ?? ''}
                onChange={(e) => updateField(i, 'phone', e.target.value)}
                placeholder={isAr ? 'رقم هاتف التوصيل' : 'Delivery phone'}
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveSingle}
                  disabled={saving}
                  className="bg-brand-green text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60"
                >
                  {saving ? '...' : isAr ? 'حفظ' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingIndex(null)}
                  className="text-gray-500 rounded-lg px-4 py-2 text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div className="text-sm">
                <div className="font-bold">{addr.label || (isAr ? 'عنوان' : 'Address')}</div>
                <div className="text-gray-500 mt-1">
                  {addr.state ?? ''}{addr.district ? ` / ${addr.district}` : ''}
                </div>
                <div className="text-gray-500">{addr.details ?? ''}</div>
                <div className="text-gray-400 text-xs mt-1" dir="ltr">{addr.phone ?? ''}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditingIndex(i)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={() => removeAddress(i)} className="p-1.5 hover:bg-rose-50 rounded-lg">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addAddress}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-brand-green hover:text-brand-green"
      >
        <Plus className="h-4 w-4" />
        {isAr ? 'إضافة عنوان جديد' : 'Add new address'}
      </button>
    </div>
  );
}

function OrdersTab({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  async function load(p: number) {
    setLoading(true);
    try {
      const res = await getOrders(p);
      setOrders(res.data);
      setLastPage(res.meta.last_page);
      setPage(res.meta.current_page);
    } catch { }
    finally { setLoading(false); }
  }

  async function handleCancel(orderId: number) {
    if (!confirm(isAr ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?')) return;
    setCancelling(orderId);
    try {
      await cancelOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
    } catch { }
    finally { setCancelling(null); }
  }

  useEffect(() => { load(page); }, [page]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{isAr ? 'لا توجد طلبات سابقة' : 'No orders yet'}</p>
        <Link href="/store" className="btn-orange inline-flex mt-4 text-sm">
          {isAr ? 'تسوق الآن' : 'Shop now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const status = STATUS_LABELS[order.status] ?? { ar: order.status, en: order.status };
        return (
          <div key={order.id} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold">{order.order_number}</div>
              <div className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                order.status === 'delivered' && 'bg-green-50 text-green-700',
                order.status === 'cancelled' && 'bg-rose-50 text-rose-700',
                order.status === 'new' && 'bg-blue-50 text-blue-700',
                order.status === 'preparing' && 'bg-amber-50 text-amber-700',
                order.status === 'shipped' && 'bg-purple-50 text-purple-700',
              )}>
                {isAr ? status.ar : status.en}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(order.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                {order.items.length} {isAr ? 'منتج' : 'items'}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-gray-600 py-1">
                  <span>{isAr ? item.name_ar : (item.name_en || item.name_ar)}</span>
                  <span>{item.quantity} × {formatPrice(item.unit_price, locale)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 mt-1 flex justify-between font-bold text-sm">
              <span>{isAr ? 'الإجمالي' : 'Total'}</span>
              <span>{formatPrice(order.total, locale)} {isAr ? 'ج.س' : 'SDG'}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href={`/order-tracking/${order.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green hover:text-brand-green-600"
              >
                <Eye className="h-3.5 w-3.5" />
                {isAr ? 'تتبع الطلب' : 'Track order'}
              </Link>
              {order.status === 'new' && (
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancelling === order.id}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {cancelling === order.id
                    ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...')
                    : (isAr ? 'إلغاء الطلب' : 'Cancel order')}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <span className="text-xs text-gray-500">{page} / {lastPage}</span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

function LoyaltyTab({ customer, locale }: { customer: CustomerData; locale: string }) {
  const isAr = locale === 'ar';
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoyaltyBalance(customer.phone)
      .then((r) => setBalance(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [customer.phone]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (!balance) return null;

  return (
    <div className="space-y-4">
      <div
        className="card p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${balance.tier.color}, #0E5C3A)` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Award className="h-6 w-6" />
          <div>
            <div className="text-xs opacity-90">{isAr ? 'مستوى الولاء' : 'Loyalty tier'}</div>
            <div className="text-lg font-extrabold">{balance.tier.label}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              {isAr ? 'الرصيد' : 'Balance'}
            </div>
            <div className="text-xl font-extrabold mt-1">
              {balance.loyalty_points.toLocaleString(isAr ? 'ar-EG' : 'en-US')}
            </div>
            <div className="text-[11px] opacity-80">
              ≈ {formatPrice(balance.loyalty_points * balance.rules.redeem_value, locale)} {isAr ? 'ج.س' : 'SDG'}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {isAr ? 'مدى الحياة' : 'Lifetime'}
            </div>
            <div className="text-xl font-extrabold mt-1">
              {balance.lifetime_points.toLocaleString(isAr ? 'ar-EG' : 'en-US')}
            </div>
            {balance.next_tier && (
              <div className="text-[11px] opacity-80">
                {isAr
                  ? `${balance.next_tier.remaining.toLocaleString('ar-EG')} نقطة للوصول إلى ${balance.next_tier.label}`
                  : `${balance.next_tier.remaining.toLocaleString()} pts to ${balance.next_tier.label}`}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2 font-bold text-sm text-gray-800">
          <Sparkles className="h-4 w-4 text-brand-green" />
          {isAr ? 'كيف يعمل النظام' : 'How it works'}
        </div>
        <ul className="text-xs text-gray-600 space-y-1 list-disc pr-4 rtl:pr-0 rtl:pl-4">
          <li>{isAr ? `نقطة لكل ${balance.rules.earn_rate} ج.س` : `1 pt per ${balance.rules.earn_rate} SDG`}</li>
          <li>{isAr ? `النقطة = ${balance.rules.redeem_value} ج.س خصم` : `1 pt = ${balance.rules.redeem_value} SDG off`}</li>
          <li>{isAr ? `استبدال حتى ${(balance.rules.redeem_cap_pct * 100).toFixed(0)}%` : `Redeem up to ${(balance.rules.redeem_cap_pct * 100).toFixed(0)}%`}</li>
        </ul>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const locale = useLocale();
  const router = useRouter();
  const { customer, loading, isAuthenticated, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');

  const isAr = locale === 'ar';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) return null;

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'orders', label: isAr ? 'الطلبات' : 'Orders', icon: Package },
    { key: 'profile', label: isAr ? 'البيانات الشخصية' : 'Profile', icon: User },
    { key: 'addresses', label: isAr ? 'العناوين' : 'Addresses', icon: MapPin },
    { key: 'loyalty', label: isAr ? 'الولاء' : 'Loyalty', icon: Award },
  ];

  return (
    <div className="container py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-cream-100">
            <User className="h-6 w-6 text-brand-green" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{customer.name || (isAr ? 'حسابي' : 'My Account')}</h1>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
          {isAr ? 'تسجيل خروج' : 'Log out'}
        </button>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === key
                ? 'bg-brand-green text-white'
                : 'text-gray-500 hover:bg-gray-100',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'orders' && <OrdersTab locale={locale} />}
        {tab === 'profile' && <ProfileTab customer={customer} locale={locale} />}
        {tab === 'addresses' && <AddressesTab customer={customer} locale={locale} />}
        {tab === 'loyalty' && <LoyaltyTab customer={customer} locale={locale} />}
      </div>
    </div>
  );
}
