import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { User } from 'lucide-react';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container py-16 max-w-md text-center">
      <div className="card p-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-cream-100 mx-auto mb-4">
          <User className="h-8 w-8 text-brand-green" />
        </div>
        <h1 className="text-xl font-extrabold mb-2">{t('nav.account')}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Account & order history coming in the next milestone.
        </p>
        <Link href="/store" className="btn-orange inline-flex">
          {t('cart.go_shopping')}
        </Link>
      </div>
    </div>
  );
}
