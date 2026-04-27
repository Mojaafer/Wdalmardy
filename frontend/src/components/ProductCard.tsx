'use client';

import { ShoppingCart, Star } from 'lucide-react';
import type { Product } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import { ProductImage } from './ProductImage';

export function ProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const t = useTranslations();
  const add = useCart((s) => s.add);
  const name = locale === 'ar' ? product.name.ar : product.name.en;

  return (
    <article className="card overflow-hidden flex flex-col group">
      <Link href={`/store/${product.slug}`} className="relative block aspect-square bg-brand-cream-50">
        <ProductImage src={product.image} alt={name} className="w-full h-full object-contain p-3" />
        {product.discount_percent > 0 && (
          <span className="absolute top-2 start-2 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white">
            {t('home.discount_label', { percent: product.discount_percent })}
          </span>
        )}
        {product.is_featured && product.discount_percent === 0 && (
          <span className="absolute top-2 start-2 rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">
            {t('product.best_seller')}
          </span>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-3">
        <Link href={`/store/${product.slug}`} className="hover:text-brand-orange">
          <h3 className="text-sm font-semibold line-clamp-2 min-h-[40px]">{name}</h3>
        </Link>
        {product.reviews_count > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({product.reviews_count})</span>
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-brand-orange">
            {formatPrice(product.price, locale)} {t('common.currency')}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.compare_at_price, locale)}
            </span>
          )}
        </div>

        <button
          onClick={() => add(product, 1)}
          disabled={!product.in_stock}
          className="mt-3 btn-orange w-full text-sm py-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {t('product.add_to_cart')}
        </button>
      </div>
    </article>
  );
}
