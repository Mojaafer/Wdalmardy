import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { TrustStrip } from '@/components/TrustStrip';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/lib/customer/useAuth';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Wad Almardi Market | ود المرضي ماركت',
  description: 'Bilingual e-commerce storefront for Wad Almardi Market, Sudan.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${locale}";document.documentElement.dir="${dir}"`,
        }}
      />
      <NextIntlClientProvider messages={messages} locale={locale}>
        <AuthProvider>
          <div
            className="min-h-screen bg-white text-brand-ink"
            style={{
              ['--font-app' as string]:
                locale === 'ar' ? 'var(--font-cairo)' : 'var(--font-inter)',
              fontFamily: 'var(--font-app), system-ui, sans-serif',
            }}
          >
            <Header />
            <TrustStrip />
            <main className="grow">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </NextIntlClientProvider>
    </>
  );
}
