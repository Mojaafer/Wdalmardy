import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ShoppingBasket } from 'lucide-react';
import { getPage } from '@/lib/api';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const pageRes = await getPage('about');
  const page = pageRes?.data ?? null;

  if (page) {
    const isAr = locale === 'ar';
    const title = isAr ? page.title_ar : (page.title_en ?? page.title_ar);
    const body = isAr ? page.body_ar : (page.body_en ?? page.body_ar);

    return (
      <div className="container py-12">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">{title}</h1>
            <div
              className="mt-4 prose prose-sm md:prose-base max-w-none text-brand-ink/80 leading-relaxed [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5"
              dangerouslySetInnerHTML={{ __html: body ?? '' }}
            />
            <Link href="/store" className="mt-6 btn-primary inline-flex">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t('about.shop_now')}
            </Link>
          </div>
          <div className="rounded-2xl bg-brand-cream-100 aspect-[4/3] grid place-items-center">
            <ShoppingBasket className="h-32 w-32 text-brand-orange" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback to static i18n strings if no DB content
  return (
    <div className="container py-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">{t('about.title')}</h1>
          <p className="mt-2 text-brand-orange font-bold">{t('about.subtitle')}</p>
          <p className="mt-4 text-brand-ink/80 leading-relaxed text-sm md:text-base">{t('about.body')}</p>
          <Link href="/store" className="mt-6 btn-primary inline-flex">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('about.shop_now')}
          </Link>
        </div>
        <div className="rounded-2xl bg-brand-cream-100 aspect-[4/3] grid place-items-center">
          <ShoppingBasket className="h-32 w-32 text-brand-orange" />
        </div>
      </div>
    </div>
  );
}
