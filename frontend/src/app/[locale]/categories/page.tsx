import { getCategories } from '@/lib/api';
import { CategoryCard } from '@/components/CategoryCard';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { data: categories } = await getCategories().catch(() => ({ data: [] }));

  return (
    <div className="container py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t('categories.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('categories.subtitle')}</p>
        <div className="mt-2 mx-auto h-1 w-16 rounded-full bg-brand-orange" />
      </div>
      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>
    </div>
  );
}
