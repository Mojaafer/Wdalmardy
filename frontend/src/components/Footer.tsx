import { useTranslations } from 'next-intl';
import { Phone, Mail, MapPin, Facebook, Instagram } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Logo } from './Logo';

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const wa = process.env.NEXT_PUBLIC_WA_PHONE ?? '249123456789';

  return (
    <footer className="bg-brand-green-700 text-white mt-12">
      <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
        <div className="col-span-2 md:col-span-1">
          <div className="bg-white rounded-xl p-3 inline-flex">
            <Logo />
          </div>
          <p className="mt-4 text-sm text-white/70">{t('brand.tagline')}</p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                <path d="M20.5 3.5A11.4 11.4 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.7 6L0 24l6.2-1.6A12 12 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.7 1 1-3.6-.2-.4A10 10 0 1 1 22 12c0 5.5-4.5 10-10 10z" />
              </svg>
            </a>
            <a
              href="#"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-3">{t('footer.info')}</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link href="/about" className="hover:text-white">
                {t('footer.about')}
              </Link>
            </li>
            <li>
              <Link href="/p/terms" className="hover:text-white">
                {t('footer.terms')}
              </Link>
            </li>
            <li>
              <Link href="/p/privacy" className="hover:text-white">
                {t('footer.privacy')}
              </Link>
            </li>
            <li>
              <Link href="/p/faq" className="hover:text-white">
                {t('footer.faq')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-3">{t('footer.categories')}</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link href="/categories" className="hover:text-white">
                {t('categories.title')}
              </Link>
            </li>
            <li>
              <Link href="/store" className="hover:text-white">
                {t('nav.store')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-3">{t('footer.contact')}</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> +249 12 345 6789
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> info@wadalmardi.com
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {t('contact.location_value')}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-xs text-white/60">
          {t('footer.rights', { year })}
        </div>
      </div>
    </footer>
  );
}
