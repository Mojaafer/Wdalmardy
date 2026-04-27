import { getCategories, getProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

type SearchParams = {
  category?: string;
  q?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  page?: string;
};

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();

  const [{ data: categories }, products] = await Promise.all([
    getCategories().catch(() => ({ data: [] })),
    getProducts({
      category: sp.category,
      q: sp.q,
      min_price: sp.min_price,
      max_price: sp.max_price,
      sort: sp.sort,
      page: sp.page,
      per_page: 12,
    }).catch(() => ({ data: [], meta: undefined })),
  ]);

  const meta = products.meta;
  const activeCategory = sp.category;

  return (
    <div className="container py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t('store.title')}</h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters */}
        <aside className="card p-4 h-fit">
          <h3 className="font-bold mb-3">{t('store.filters')}</h3>

          <details open className="border-t border-gray-100 pt-3">
            <summary className="cursor-pointer font-semibold text-sm mb-2">
              {t('store.category')}
            </summary>
            <ul className="space-y-1.5 mt-2">
              <li>
                <Link
                  href="/store"
                  className={`block text-sm px-2 py-1 rounded ${
                    !activeCategory ? 'bg-brand-cream font-semibold' : 'hover:bg-gray-50'
                  }`}
                >
                  {t('store.clear')}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/store?category=${c.slug}`}
                    className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                      activeCategory === c.slug ? 'bg-brand-cream font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span>{locale === 'ar' ? c.name.ar : c.name.en}</span>
                    <span className="text-gray-400 text-xs">({c.products_count ?? 0})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          <details className="border-t border-gray-100 pt-3 mt-3">
            <summary className="cursor-pointer font-semibold text-sm">
              {t('store.price')}
            </summary>
            <form method="GET" className="mt-3 space-y-2">
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input text-xs"
                  name="min_price"
                  type="number"
                  defaultValue={sp.min_price ?? ''}
                  placeholder={t('store.from')}
                />
                <input
                  className="input text-xs"
                  name="max_price"
                  type="number"
                  defaultValue={sp.max_price ?? ''}
                  placeholder={t('store.to')}
                />
              </div>
              <button className="btn-orange w-full text-sm py-2">{t('store.apply')}</button>
            </form>
          </details>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {meta?.total
                ? t('store.showing', {
                    from: meta.from ?? 0,
                    to: meta.to ?? 0,
                    total: meta.total,
                  })
                : ''}
            </p>
            <form method="GET">
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <select name="sort" defaultValue={sp.sort ?? 'default'} className="input text-sm py-2">
                <option value="default">{t('store.sort_default')}</option>
                <option value="price_asc">{t('store.sort_price_asc')}</option>
                <option value="price_desc">{t('store.sort_price_desc')}</option>
                <option value="newest">{t('store.sort_newest')}</option>
                <option value="best_selling">{t('store.sort_best_selling')}</option>
              </select>
            </form>
          </div>

          {products.data.length === 0 ? (
            <div className="card p-10 text-center text-gray-500">{t('store.empty')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: meta.last_page }).map((_, i) => {
                const page = i + 1;
                const params = new URLSearchParams();
                if (sp.category) params.set('category', sp.category);
                if (sp.sort) params.set('sort', sp.sort);
                if (sp.min_price) params.set('min_price', sp.min_price);
                if (sp.max_price) params.set('max_price', sp.max_price);
                if (page > 1) params.set('page', String(page));
                return (
                  <Link
                    key={page}
                    href={`/store${params.toString() ? `?${params.toString()}` : ''}`}
                    className={`grid h-9 min-w-9 px-3 place-items-center rounded-md border ${
                      page === meta.current_page
                        ? 'border-brand-orange text-brand-orange font-bold'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
