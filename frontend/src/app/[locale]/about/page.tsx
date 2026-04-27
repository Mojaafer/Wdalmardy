import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ShoppingBasket } from 'lucide-react';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container py-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">{t('about.title')}</h1>
          <p className="mt-2 text-brand-orange font-bold">{t('about.subtitle')}</p>
          <p className="mt-4 text-brand-ink/80 leading-relaxed text-sm md:text-base">
            {t('about.body')}
          </p>
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
