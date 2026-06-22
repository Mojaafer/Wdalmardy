import { getCategories, getProducts, getPublicSettings } from '@/lib/api';
import { CategoryCard } from '@/components/CategoryCard';
import { ProductCard } from '@/components/ProductCard';
import OffersBanner from '@/components/OffersBanner';
import { Link } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, Bike, MessageCircle, Phone, ListChecks } from 'lucide-react';

const API_BASE = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [{ data: categories }, featured, latest, settings] = await Promise.all([
    getCategories().catch(() => ({ data: [] })),
    getProducts({ featured: 1, per_page: 4 }).catch(() => ({ data: [] })),
    getProducts({ per_page: 8, sort: 'newest' }).catch(() => ({ data: [] })),
    getPublicSettings().catch(() => ({ data: {} }) as { data: Record<string, unknown> }),
  ]);

  const heroImage = (settings.data as Record<string, unknown> | undefined)?.hero_image as string | undefined;
  const heroImageUrl = heroImage
    ? heroImage.startsWith('http')
      ? heroImage
      : `${API_BASE}/storage/${heroImage}`
    : null;

  return (
    <div>
      {/* Active offers banner from CMS */}
      <OffersBanner locale={locale} />

       {/* Hero */}
       <section className="relative overflow-hidden min-h-[300px] xs:min-h-[400px] md:min-h-[500px] flex items-center bg-brand-green">
          {heroImageUrl ? (
           <>
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
           </>
         ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-brand-green via-brand-green to-brand-green-700" />
         )}
         <div className="absolute -top-20 ltr:-right-20 rtl:-left-20 w-80 h-80 rounded-full bg-brand-orange/10 blur-3xl" />
         <div className="absolute -bottom-16 ltr:-left-16 rtl:-right-16 w-60 h-60 rounded-full bg-brand-cream/10 blur-3xl" />
         <div className="relative z-10 py-16 md:py-24 w-full">
           <div className="container">
            <div className="max-w-lg mr-auto ml-12 md:ml-32 lg:ml-40">
             <h1 className="text-2xl xs:text-3xl md:text-5xl font-extrabold leading-tight text-left">
               <span className="text-white">{t('home.hero_title_1')}</span>
               <br />
               <span className="text-brand-orange">{t('home.hero_title_2')}</span>
             </h1>
             <p className="mt-4 text-base text-white/80 text-left">{t('home.hero_subtitle')}</p>
             <div className="mt-6 text-left">
               <Link href="/store" className="btn-orange inline-flex shadow-lg shadow-brand-orange/30">
               <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
               {t('home.hero_cta')}
             </Link>
           </div>
         </div>
         </div>
         </div>
       </section>

      {/* Categories */}
      <section className="container py-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold">{t('home.shop_by_category')}</h2>
          <div className="mt-1 mx-auto h-1 w-16 rounded-full bg-brand-orange" />
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/categories" className="btn-outline inline-flex">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('home.view_all')}
          </Link>
        </div>
      </section>

      {/* Offers */}
      {featured.data.length > 0 && (
        <section className="bg-brand-orange/10 py-10">
          <div className="container">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl font-extrabold">{t('home.offers_title')}</h2>
              <Link href="/store" className="text-sm text-brand-orange font-semibold hover:underline">
                {t('home.view_all')}
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.data.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.data.length > 0 && (
        <section className="container py-10">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-extrabold">{t('nav.store')}</h2>
            <Link href="/store" className="text-sm text-brand-orange font-semibold hover:underline">
              {t('home.view_all')}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {latest.data.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Delivery banner */}
      <section className="container">
        <div className="rounded-2xl bg-brand-green text-white p-6 md:p-8 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <h3 className="text-xl md:text-2xl font-extrabold">
              {t('home.fast_delivery_banner_title')}
            </h3>
            <p className="text-white/80 text-sm mt-2">{t('home.fast_delivery_banner_sub')}</p>
            <Link href="/store" className="mt-4 btn-orange inline-flex">
              <Bike className="h-4 w-4" />
              {t('home.order_now')}
            </Link>
          </div>
          <div className="hidden md:flex justify-center">
            <Bike className="h-32 w-32 text-brand-orange" />
          </div>
        </div>
      </section>

      {/* Quick order options */}
      <section className="container py-10">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold">{t('home.order_fast_title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('home.order_fast_sub')}</p>
        </div>
        <div className="grid xs:grid-cols-3 gap-4">
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_PHONE ?? '249123456789'}`}
            target="_blank"
            rel="noreferrer"
            className="card p-5 flex items-start gap-3 hover:shadow-lg transition"
          >
            <MessageCircle className="h-9 w-9 text-green-600" />
            <div>
              <div className="font-bold">{t('home.wa_order')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('home.wa_order_sub')}</div>
            </div>
          </a>
          <a
            href={`tel:+${process.env.NEXT_PUBLIC_WA_PHONE ?? '249123456789'}`}
            className="card p-5 flex items-start gap-3 hover:shadow-lg transition"
          >
            <Phone className="h-9 w-9 text-brand-orange" />
            <div>
              <div className="font-bold">{t('home.call_us')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('home.call_us_sub')}</div>
            </div>
          </a>
          <Link href="/contact" className="card p-5 flex items-start gap-3 hover:shadow-lg transition">
            <ListChecks className="h-9 w-9 text-brand-green" />
            <div>
              <div className="font-bold">{t('home.list_request')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('home.list_request_sub')}</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
