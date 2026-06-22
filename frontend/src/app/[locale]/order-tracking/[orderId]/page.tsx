'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import {
  CheckCircle2, Circle, Truck, Package, XCircle, MapPin, Phone,
  Mail, User as UserIcon, ArrowLeft, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/customer/useAuth';
import { getOrder, type CustomerOrderDetail } from '@/lib/customer/auth';
import { formatPrice } from '@/lib/utils';

type Step = 'new' | 'preparing' | 'shipped' | 'delivered';

const STEPS: { key: Step; ar: string; en: string }[] = [
  { key: 'new',       ar: 'تم استلام الطلب',     en: 'Order placed'    },
  { key: 'preparing', ar: 'قيد التحضير',         en: 'Preparing'       },
  { key: 'shipped',   ar: 'خرج للتوصيل',        en: 'Out for delivery'},
  { key: 'delivered', ar: 'تم التوصيل',          en: 'Delivered'       },
];

function stepIndex(status: string): number {
  if (status === 'cancelled') return -1;
  const i = STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const { isAuthenticated, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const id = parseInt(params.orderId, 10);
    if (!id || Number.isNaN(id)) {
      setError(isAr ? 'رقم طلب غير صالح' : 'Invalid order id');
      setLoading(false);
      return;
    }
    getOrder(id)
      .then((res) => setOrder(res.data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : (isAr ? 'تعذّر تحميل الطلب' : 'Could not load order')),
      )
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, params.orderId, router, isAr]);

  if (loading || authLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-20 text-center">
        <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
        <p className="text-gray-700 mb-4">{error}</p>
        <Link href="/account" className="btn-outline">
          {isAr ? 'حسابي' : 'My account'}
        </Link>
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const current = stepIndex(order.status);

  return (
    <div className="container py-8 max-w-3xl">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-green mb-4"
      >
        {isAr ? <ArrowLeft className="h-4 w-4 rotate-180" /> : <ArrowLeft className="h-4 w-4" />}
        {isAr ? 'حسابي' : 'My account'}
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-extrabold">
              {isAr ? 'طلب رقم' : 'Order'} {order.order_number}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              cancelled
                ? 'bg-rose-50 text-rose-700'
                : order.status === 'delivered'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {cancelled
              ? (isAr ? 'ملغي' : 'Cancelled')
              : STEPS[current] && (isAr ? STEPS[current].ar : STEPS[current].en)}
          </span>
        </div>
      </div>

      {!cancelled && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-bold mb-5 flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand-green" />
            {isAr ? 'حالة الطلب' : 'Order status'}
          </h2>
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const done = i <= current;
              const active = i === current;
              return (
                <li key={s.key} className="flex flex-col items-center text-center">
                  <div className="relative">
                    {done ? (
                      <CheckCircle2 className="h-8 w-8 text-brand-green" />
                    ) : (
                      <Circle className="h-8 w-8 text-gray-300" />
                    )}
                    {active && (
                      <span className="absolute inset-0 rounded-full ring-4 ring-brand-green/20 animate-pulse" />
                    )}
                  </div>
                  <div
                    className={`text-xs mt-2 font-medium ${done ? 'text-brand-ink' : 'text-gray-400'}`}
                  >
                    {isAr ? s.ar : s.en}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`hidden sm:block absolute h-0.5 w-full top-4 ${
                        i < current ? 'bg-brand-green' : 'bg-gray-200'
                      }`}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-brand-green" />
            {isAr ? 'بيانات العميل' : 'Customer'}
          </h3>
          <div className="space-y-1.5 text-sm">
            <div>{order.customer_name}</div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs" dir="ltr">
              <Phone className="h-3.5 w-3.5" />
              {order.customer_phone}
            </div>
            {order.customer_email && (
              <div className="flex items-center gap-1.5 text-gray-500 text-xs" dir="ltr">
                <Mail className="h-3.5 w-3.5" />
                {order.customer_email}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-green" />
            {isAr ? 'عنوان التوصيل' : 'Delivery address'}
          </h3>
          {order.delivery_method === 'pickup' ? (
            <p className="text-sm text-gray-500">{isAr ? 'استلام من المتجر' : 'Pickup from store'}</p>
          ) : (
            <div className="text-sm text-gray-600 space-y-0.5">
              {order.address_state && <div>{order.address_state}</div>}
              {order.address_district && <div>{order.address_district}</div>}
              {order.address_details && <div className="text-xs">{order.address_details}</div>}
            </div>
          )}
          {order.driver && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{isAr ? 'مندوب التوصيل' : 'Driver'}</p>
              <div className="text-sm font-medium">{order.driver.name}</div>
              {order.driver.phone && (
                <div className="text-xs text-gray-500" dir="ltr">{order.driver.phone}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-green" />
          {isAr ? 'المنتجات' : 'Items'}
        </h3>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <li key={item.id} className="py-2.5 flex justify-between text-sm">
              <div>
                <div className="font-medium">{isAr ? item.name_ar : (item.name_en || item.name_ar)}</div>
                <div className="text-xs text-gray-500">
                  {item.quantity} × {formatPrice(item.unit_price, locale)} {isAr ? 'ج.س' : 'SDG'}
                </div>
              </div>
              <div className="font-bold">{formatPrice(item.line_total, locale)}</div>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-200 pt-3 mt-2 space-y-1 text-sm">
          <Row label={isAr ? 'المجموع الفرعي' : 'Subtotal'} value={formatPrice(order.subtotal, locale)} />
          {(order.discount_amount ?? 0) > 0 && (
            <Row
              label={`${isAr ? 'الخصم' : 'Discount'}${order.coupon_code ? ` (${order.coupon_code})` : ''}`}
              value={`-${formatPrice(order.discount_amount, locale)}`}
              negative
            />
          )}
          {(order.points_redeemed ?? 0) > 0 && (
            <Row
              label={`${isAr ? 'نقاط مستبدلة' : 'Points'} (${order.points_redeemed})`}
              value={`-${formatPrice(order.points_discount, locale)}`}
              negative
            />
          )}
          <Row
            label={isAr ? 'رسوم التوصيل' : 'Delivery fee'}
            value={formatPrice(order.delivery_fee, locale)}
          />
          <Row
            label={isAr ? 'الإجمالي' : 'Total'}
            value={formatPrice(order.total, locale)}
            bold
          />
        </div>
      </div>

      {order.notes && (
        <div className="card p-4 text-sm text-gray-600">
          <span className="font-bold text-brand-ink">{isAr ? 'ملاحظات:' : 'Notes:'}</span> {order.notes}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? 'font-extrabold text-base pt-1' : ''}`}>
      <span>{label}</span>
      <span className={negative ? 'text-rose-600' : ''}>{value}</span>
    </div>
  );
}