'use client';

import type { Category } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ProductImage } from './ProductImage';

export function CategoryCard({ category }: { category: Category }) {
  const locale = useLocale();
  const t = useTranslations();
  const name = locale === 'ar' ? category.name.ar : category.name.en;

  return (
    <Link
      href={`/store?category=${category.slug}`}
      className="card overflow-hidden flex flex-col group hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[4/3] bg-brand-cream-50 overflow-hidden">
        <ProductImage src={category.image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <div className="p-3 text-center">
        <h3 className="font-bold text-sm">{name}</h3>
        {category.products_count !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            {t('categories.products_count', { count: category.products_count })}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-brand-orange font-semibold">
          {t('categories.shop_now')} <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}
