'use client';

import { useTranslations } from 'next-intl';
import { Search, User, Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Logo } from './Logo';
import { CartBadge } from './CartBadge';
import { cn } from '@/lib/utils';

const NAV = [
  { key: 'home', href: '/' },
  { key: 'categories', href: '/categories' },
  { key: 'store', href: '/store' },
  { key: 'about', href: '/about' },
  { key: 'contact', href: '/contact' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { locale } = useParams<{ locale: string }>();
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex-shrink-0">
          <Logo />
        </Link>

        <form
          action="/store"
          className="hidden md:flex flex-1 max-w-xl items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
        >
          <Search className="h-4 w-4 text-gray-400" />
          <input
            name="q"
            placeholder={t('search_placeholder')}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </form>

        <div className="ms-auto flex items-center gap-1">
          <a
            href={`/${otherLocale}`}
            className="hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            <Globe className="h-4 w-4" />
            {t('language')}
          </a>
          <Link
            href="/account"
            className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            <User className="h-4 w-4" />
            {t('account')}
          </Link>
          <CartBadge />
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid h-10 w-10 place-items-center rounded-full hover:bg-gray-100"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="hidden md:block border-t border-gray-100 bg-white">
        <ul className="container flex h-12 items-center gap-2 text-sm font-medium">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-md transition-colors',
                    active
                      ? 'text-brand-orange border-b-2 border-brand-orange rounded-none'
                      : 'text-brand-ink hover:text-brand-orange'
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <ul className="container flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm font-medium hover:text-brand-orange"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
            <li className="border-t border-gray-100 mt-2 pt-2">
              <a href={`/${otherLocale}`} className="block py-3 text-sm font-medium">
                <Globe className="inline h-4 w-4 me-1" /> {t('language')}
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
