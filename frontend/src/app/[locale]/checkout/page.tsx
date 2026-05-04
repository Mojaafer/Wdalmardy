'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCart } from '@/lib/cart';
import {
  createOrder,
  validateCoupon,
  getDeliveryZones,
  type CouponValidation,
  type DeliveryZone,
} from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ProductImage } from '@/components/ProductImage';
import { Truck, Store, MessageCircle, Banknote, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';

const SUDAN_STATES = [
  { ar: 'الخرطوم', en: 'Khartoum' },
  { ar: 'الجزيرة', en: 'Gezira' },
  { ar: 'كسلا', en: 'Kassala' },
  { ar: 'البحر الأحمر', en: 'Red Sea' },
  { ar: 'القضارف', en: 'Gedaref' },
  { ar: 'سنار', en: 'Sennar' },
  { ar: 'النيل الأبيض', en: 'White Nile' },
  { ar: 'النيل الأزرق', en: 'Blue Nile' },
  { ar: 'الشمالية', en: 'Northern' },
  { ar: 'نهر النيل', en: 'River Nile' },
];

export default function CheckoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ number: string; whatsappUrl: string | null } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [details, setDetails] = useState('');
  const [delivery, setDelivery] = useState<'delivery' | 'pickup'>('delivery');
  const [payment, setPayment] = useState<'whatsapp' | 'cod'>('whatsapp');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState<number | ''>('');

  useEffect(() => {
    setMounted(true);
    getDeliveryZones()
      .then((r) => setZones(r.data))
      .catch(() => setZones([]));
  }, []);

  const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
  const baseDeliveryFee =
    delivery === 'delivery' ? (selectedZone ? selectedZone.fee : 1500) : 0;
  const deliveryFee = coupon?.free_shipping ? 0 : baseDeliveryFee;
  const discount = coupon ? coupon.discount : 0;
  const subtotalAfterDiscount = coupon?.free_shipping
    ? subtotal
    : Math.max(0, subtotal - discount);
  const total = subtotalAfterDiscount + deliveryFee;

  async function applyCoupon() {
    setCouponError(null);
    setCouponLoading(true);
    try {
      const r = await validateCoupon(couponInput.trim(), subtotal, baseDeliveryFee);
      setCoupon(r.data);
    } catch (e) {
      setCoupon(null);
      setCouponError(
        e instanceof Error
          ? e.message.replace(/^API \d+:\s*/, '')
          : t('common.error'),
      );
    } finally {
      setCouponLoading(false);
    }
  }

  if (!mounted) {
    return <div className="container py-10 text-center text-gray-500">{t('common.loading')}</div>;
  }

  if (success) {
    return (
      <div className="container py-16 max-w-md text-center">
        <div className="card p-8">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-green-50 mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-brand-green" />
          </div>
          <h1 className="text-xl font-extrabold mb-2">{t('checkout.success_title')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {t('checkout.success_sub', { number: success.number })}
          </p>
          {success.whatsappUrl && (
            <a href={success.whatsappUrl} target="_blank" rel="noreferrer" className="btn-orange w-full mb-3">
              <MessageCircle className="h-4 w-4" />
              {t('checkout.open_wa')}
            </a>
          )}
          <Link href="/" className="btn-outline w-full">
            {t('checkout.back_home')}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4 text-gray-500">{t('cart.empty')}</p>
        <Link href="/store" className="btn-orange inline-flex">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('cart.go_shopping')}
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createOrder({
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        address_state: delivery === 'delivery' ? state : undefined,
        address_district: delivery === 'delivery' ? district : undefined,
        address_details: delivery === 'delivery' ? details : undefined,
        delivery_method: delivery,
        payment_method: payment,
        notes: notes || undefined,
        coupon_code: coupon?.code,
        delivery_zone_id: delivery === 'delivery' && zoneId ? Number(zoneId) : undefined,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      const order = res.data;
      setSuccess({ number: order.order_number, whatsappUrl: order.whatsapp_url });
      clear();
      if (order.whatsapp_url) {
        window.open(order.whatsapp_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t('checkout.title')}</h1>
      </div>

      <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-5">
          <SectionCard step="1" title={t('checkout.customer_data')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('checkout.name')}>
                <input
                  required
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('checkout.name_placeholder')}
                />
              </Field>
              <Field label={t('checkout.phone')}>
                <input
                  required
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('checkout.phone_placeholder')}
                />
              </Field>
            </div>
            <Field label={t('checkout.email')}>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('checkout.email_placeholder')}
              />
            </Field>
          </SectionCard>

          {delivery === 'delivery' && (
            <SectionCard step="2" title={t('checkout.address')}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t('checkout.state')}>
                  <select required className="input" value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="">{t('checkout.state_placeholder')}</option>
                    {SUDAN_STATES.map((s) => (
                      <option key={s.en} value={locale === 'ar' ? s.ar : s.en}>
                        {locale === 'ar' ? s.ar : s.en}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('checkout.district')}>
                  <input
                    required
                    className="input"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={t('checkout.district_placeholder')}
                  />
                </Field>
              </div>
              {zones.length > 0 && (
                <Field label={t('checkout.delivery_zone')}>
                  <select
                    className="input"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">{t('checkout.delivery_zone_placeholder')}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {(locale === 'ar' ? z.name_ar : (z.name_en ?? z.name_ar))} — {formatPrice(z.fee, locale)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={t('checkout.address_details')}>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t('checkout.address_details_placeholder')}
                />
              </Field>
            </SectionCard>
          )}

          <SectionCard step="3" title={t('checkout.delivery_method')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <RadioCard
                selected={delivery === 'delivery'}
                onClick={() => setDelivery('delivery')}
                Icon={Truck}
                title={t('checkout.delivery')}
                sub={t('checkout.delivery_sub')}
                badge={selectedZone ? formatPrice(selectedZone.fee, locale) : `1500 ${t('common.currency')}`}
                badgeColor="text-brand-orange"
              />
              <RadioCard
                selected={delivery === 'pickup'}
                onClick={() => setDelivery('pickup')}
                Icon={Store}
                title={t('checkout.pickup')}
                sub={t('checkout.pickup_sub')}
                badge={t('checkout.free')}
                badgeColor="text-brand-green"
              />
            </div>
          </SectionCard>

          <SectionCard step="4" title={t('checkout.payment_method')}>
            <div className="space-y-3">
              <RadioCard
                selected={payment === 'whatsapp'}
                onClick={() => setPayment('whatsapp')}
                Icon={MessageCircle}
                title={t('checkout.wa')}
                sub={t('checkout.wa_sub')}
              />
              <RadioCard
                selected={payment === 'cod'}
                onClick={() => setPayment('cod')}
                Icon={Banknote}
                title={t('checkout.cod')}
                sub={t('checkout.cod_sub')}
              />
            </div>
          </SectionCard>

          <Field label={t('checkout.notes')}>
            <textarea
              rows={2}
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('checkout.notes_placeholder')}
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">{error}</div>
          )}

          <button type="submit" disabled={submitting} className="btn-orange w-full text-base py-3">
            <Lock className="h-4 w-4" />
            {submitting ? t('checkout.submitting') : t('checkout.confirm')}
          </button>
          <p className="text-center text-[11px] text-brand-orange">{t('checkout.agree')}</p>
        </div>

        <aside className="card p-5 h-fit space-y-3">
          <h3 className="font-extrabold text-lg">{t('cart.summary')}</h3>
          <ul className="space-y-3">
            {items.map((it) => {
              const itName = locale === 'ar' ? it.name_ar : it.name_en;
              const itUnit = locale === 'ar' ? it.unit_ar : it.unit_en;
              return (
                <li key={it.product_id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-brand-cream-50 overflow-hidden flex-shrink-0">
                    <ProductImage src={it.image} alt={itName} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold line-clamp-2">{itName}</div>
                    <div className="text-[11px] text-gray-500">
                      ×{it.quantity} {itUnit ? `· ${itUnit}` : ''}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-brand-orange whitespace-nowrap">
                    {formatPrice(it.price * it.quantity, locale)} {t('common.currency')}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100 pt-3">
            {coupon ? (
              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2 text-sm">
                <span>
                  <strong>{coupon.code}</strong>{' '}
                  {coupon.free_shipping
                    ? locale === 'ar' ? '— شحن مجاني' : '— Free shipping'
                    : locale === 'ar' ? `— خصم ${formatPrice(coupon.discount, locale)} ج.س` : `— ${formatPrice(coupon.discount, locale)} ${t('common.currency')} off`}
                </span>
                <button type="button" onClick={() => setCoupon(null)} className="text-xs underline">
                  {locale === 'ar' ? 'إزالة' : 'remove'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={locale === 'ar' ? 'أدخل كود الخصم' : 'Coupon code'}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!couponInput || couponLoading}
                  className="bg-brand-green text-white text-sm font-bold rounded-lg px-3 disabled:opacity-50"
                >
                  {couponLoading ? '...' : locale === 'ar' ? 'تطبيق' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <div className="text-rose-600 text-xs mt-1">{couponError}</div>}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('cart.subtotal')}</span>
              <span>
                {formatPrice(subtotal, locale)} {t('common.currency')}
              </span>
            </div>
            {discount > 0 && !coupon?.free_shipping && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {locale === 'ar' ? 'الخصم' : 'Discount'}
                </span>
                <span className="text-emerald-600">
                  -{formatPrice(discount, locale)} {t('common.currency')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t('cart.delivery_fee')}</span>
              <span className="text-brand-green">
                {coupon?.free_shipping ? (
                  <span>
                    <s className="opacity-50 me-1">
                      {formatPrice(baseDeliveryFee, locale)}
                    </s>
                    {formatPrice(0, locale)}
                  </span>
                ) : (
                  formatPrice(deliveryFee, locale)
                )}{' '}
                {t('common.currency')}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2">
              <span className="font-extrabold">{t('cart.total')}</span>
              <span className="text-xl font-extrabold text-brand-orange">
                {formatPrice(total, locale)} {t('common.currency')}
              </span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SectionCard({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-orange text-white text-xs">
          {step}
        </span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label} <span className="text-brand-orange">*</span>
      </span>
      {children}
    </label>
  );
}

type RadioCardProps = {
  selected: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  badge?: string;
  badgeColor?: string;
};

function RadioCard({ selected, onClick, Icon, title, sub, badge, badgeColor }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start rounded-xl border-2 p-4 flex items-center gap-3 transition-colors ${
        selected ? 'border-brand-green bg-brand-green-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border-2 flex-shrink-0 ${
          selected ? 'border-brand-green' : 'border-gray-300'
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />}
      </span>
      <Icon className="h-6 w-6 text-brand-green flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      {badge && <span className={`text-xs font-bold ${badgeColor ?? 'text-brand-green'}`}>{badge}</span>}
    </button>
  );
}
