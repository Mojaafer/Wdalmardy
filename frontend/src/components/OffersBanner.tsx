import { Megaphone, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getActiveOffers, type ActiveOffer } from '@/lib/api';

export default async function OffersBanner({ locale }: { locale: string }) {
  let offers: ActiveOffer[] = [];
  try {
    const r = await getActiveOffers();
    offers = r.data;
  } catch {
    return null;
  }
  if (!offers.length) return null;

  const banner = offers.find((o) => o.type === 'banner') ?? offers[0];
  const others = offers.filter((o) => o.id !== banner.id).slice(0, 3);

  return (
    <section className="container pt-6">
      <div className="rounded-2xl bg-gradient-to-l from-brand-orange to-brand-green text-white p-5 md:p-7 grid md:grid-cols-[1fr_auto] gap-4 items-center shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase font-semibold opacity-90">
            <Sparkles className="h-4 w-4" />
            {locale === 'ar' ? 'عرض حصري' : 'Special Offer'}
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold">
            {locale === 'en' ? (banner.title_en ?? banner.title) : banner.title}
          </h2>
          {(locale === 'en' ? banner.description_en : banner.description) && (
            <p className="mt-1 text-sm md:text-base opacity-95">
              {locale === 'en' ? banner.description_en : banner.description}
            </p>
          )}
          <Link
            href={(banner.banner_link as `/${string}`) ?? '/store'}
            className="mt-4 inline-flex items-center gap-2 bg-white text-brand-green font-bold rounded-lg px-5 py-2"
          >
            {locale === 'ar' ? 'تسوق العروض' : 'Shop offers'}
          </Link>
        </div>
        <div className="hidden md:flex items-center justify-center">
          <div className="grid place-items-center w-28 h-28 rounded-full bg-white/15">
            <Megaphone className="w-14 h-14" />
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {others.map((o) => (
            <div
              key={o.id}
              className="rounded-xl bg-white border border-brand-orange/20 p-4 flex items-center gap-3"
            >
              <div className="grid place-items-center w-12 h-12 rounded-lg bg-brand-orange/10 text-brand-orange">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-brand-ink line-clamp-1">
                  {locale === 'en' ? (o.title_en ?? o.title) : o.title}
                </div>
                <div className="text-xs text-brand-ink/70 line-clamp-1">
                  {o.discount_unit === 'percent'
                    ? `${o.discount_value}%`
                    : o.discount_unit === 'free_shipping'
                      ? locale === 'ar'
                        ? 'شحن مجاني'
                        : 'Free shipping'
                      : `${o.discount_value} ج.س`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
