'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCart } from '@/lib/cart';
import { Trash2, Minus, Plus, ShoppingCart, MessageCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const t = useTranslations();
  const locale = useLocale();
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const subtotal = useCart((s) => s.subtotal());
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="container py-10 text-center text-gray-500">{t('common.loading')}</div>;

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingCart className="h-14 w-14 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-extrabold mb-2">{t('cart.empty')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('cart.empty_sub')}</p>
        <Link href="/store" className="btn-orange inline-flex">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('cart.go_shopping')}
        </Link>
      </div>
    );
  }

  const deliveryFee = 1500;

  return (
    <div className="container py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t('cart.title')}</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {items.map((item) => {
            const name = locale === 'ar' ? item.name_ar : item.name_en;
            const unit = locale === 'ar' ? item.unit_ar : item.unit_en;
            return (
              <div key={item.product_id} className="card p-4 flex items-center gap-3">
                <button
                  onClick={() => remove(item.product_id)}
                  className="text-red-500 hover:bg-red-50 grid h-9 w-9 place-items-center rounded-full"
                  aria-label={t('cart.remove')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex-1 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[80px_1fr_auto_auto] items-center gap-3">
                  <div className="hidden sm:block w-20 h-20 rounded-lg bg-brand-cream-50 overflow-hidden">
                    <ProductImage src={item.image} alt={name} className="w-full h-full object-contain p-2" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm line-clamp-2">{name}</div>
                    {unit && <div className="text-xs text-gray-500">{unit}</div>}
                  </div>
                  <div className="inline-flex items-center rounded-xl border border-gray-200">
                    <button
                      onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                      className="grid h-9 w-9 place-items-center text-gray-500 hover:bg-gray-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                      className="grid h-9 w-9 place-items-center text-gray-500 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-end">
                    <div className="font-extrabold text-brand-orange text-sm">
                      {formatPrice(item.price, locale)} {t('common.currency')}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {t('cart.row_total')} {formatPrice(item.price * item.quantity, locale)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <button onClick={clear} className="btn-outline text-sm">
              <Trash2 className="h-4 w-4" />
              {t('cart.clear')}
            </button>
            <Link href="/store" className="btn-outline text-sm">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t('cart.continue_shopping')}
            </Link>
          </div>
        </div>

        <aside className="card p-5 h-fit space-y-3">
          <h3 className="font-extrabold text-lg">{t('cart.summary')}</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('cart.items_count')}</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('cart.subtotal')}</span>
            <span>
              {formatPrice(subtotal, locale)} {t('common.currency')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('cart.delivery_fee')}</span>
            <span className="text-brand-green">
              {formatPrice(deliveryFee, locale)} {t('common.currency')}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
            <span className="font-extrabold">{t('cart.total')}</span>
            <span className="text-2xl font-extrabold text-brand-orange">
              {formatPrice(subtotal + deliveryFee, locale)} {t('common.currency')}
            </span>
          </div>
          <Link href="/checkout" className="btn-orange w-full">
            <MessageCircle className="h-4 w-4" />
            {t('cart.send_via_wa')}
          </Link>
          <Link href="/checkout" className="btn-outline w-full">
            {t('cart.checkout')}
          </Link>
          <div className="flex items-start gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <ShieldCheck className="h-4 w-4 text-brand-green flex-shrink-0 mt-0.5" />
            <span>{t('cart.secure_note')}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
