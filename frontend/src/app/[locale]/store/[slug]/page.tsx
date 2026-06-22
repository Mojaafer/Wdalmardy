import { getProduct } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ProductActions } from './ProductActions';
import { ProductReviews } from '@/components/ProductReviews';
import { WishlistButton } from '@/components/WishlistButton';
import { Star, Truck, Award, RotateCcw } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const result = await getProduct(slug).catch(() => null);
  if (!result) notFound();
  const { data: product, related } = result;

  const name = locale === 'ar' ? product.name.ar : product.name.en;
  const description = locale === 'ar' ? product.description.ar : product.description.en;
  const unit = locale === 'ar' ? product.unit?.ar : product.unit?.en;

  return (
    <div className="container py-8">
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-brand-orange">
          {t('nav.home')}
        </Link>{' '}
        /{' '}
        <Link href="/store" className="hover:text-brand-orange">
          {t('nav.store')}
        </Link>{' '}
        / <span className="text-brand-ink">{name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card overflow-hidden">
          <div className="aspect-square bg-brand-cream-50">
            <ProductImage src={product.image} alt={name} className="w-full h-full object-contain p-6" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{name}</h1>
          {unit && <p className="mt-1 text-sm text-gray-500">{unit}</p>}

          {product.reviews_count > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(product.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-gray-500 text-xs ms-1">
                {t('product.rating_count', { count: product.reviews_count })}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-brand-orange">
              {new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(product.price)}{' '}
              {t('common.currency')}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <>
                <span className="text-base text-gray-400 line-through">
                  {new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(
                    product.compare_at_price
                  )}
                </span>
                <span className="rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-0.5">
                  {t('home.discount_label', { percent: product.discount_percent })}
                </span>
              </>
            )}
          </div>

          <p className="mt-4 text-sm text-brand-ink/80 leading-relaxed">{description}</p>

          <div className="mt-4 text-sm">
            <span className="text-gray-500">{t('product.availability')}: </span>
            {product.in_stock ? (
              <span className="text-brand-green font-semibold">● {t('product.in_stock')}</span>
            ) : (
              <span className="text-red-500 font-semibold">● {t('product.out_of_stock')}</span>
            )}
          </div>

          <div className="mt-4">
            <WishlistButton productId={product.id} />
          </div>

          <ProductActions product={product} />

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
            <div className="card p-3 text-center">
              <Truck className="h-5 w-5 text-brand-orange mx-auto mb-1" />
              <div className="font-semibold">{t('trust.fast_delivery')}</div>
              <div className="text-gray-500 text-[11px]">{t('trust.fast_delivery_sub')}</div>
            </div>
            <div className="card p-3 text-center">
              <Award className="h-5 w-5 text-brand-green mx-auto mb-1" />
              <div className="font-semibold">{t('trust.original')}</div>
              <div className="text-gray-500 text-[11px]">{t('trust.original_sub')}</div>
            </div>
            <div className="card p-3 text-center">
              <RotateCcw className="h-5 w-5 text-brand-orange mx-auto mb-1" />
              <div className="font-semibold">{t('product.description')}</div>
              <div className="text-gray-500 text-[11px]">24h</div>
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-center mb-6">{t('product.related')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {related.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
