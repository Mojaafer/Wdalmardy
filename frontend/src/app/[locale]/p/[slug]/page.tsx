import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/api';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale } = await params;
  const r = await getPage(slug);
  if (!r) return {};
  const isAr = locale === 'ar';
  const title = isAr ? r.data.title_ar : (r.data.title_en ?? r.data.title_ar);
  return {
    title,
    description: r.data.meta_description ?? undefined,
  };
}

export default async function StaticPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const r = await getPage(slug);
  if (!r) notFound();

  const isAr = locale === 'ar';
  const title = isAr ? r.data.title_ar : (r.data.title_en ?? r.data.title_ar);
  const body = isAr ? r.data.body_ar : (r.data.body_en ?? r.data.body_ar);

  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-6">{title}</h1>
      <div
        className="prose prose-sm md:prose-base max-w-none text-brand-ink/80 leading-relaxed [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5"
        dangerouslySetInnerHTML={{ __html: body ?? '' }}
      />
    </div>
  );
}
