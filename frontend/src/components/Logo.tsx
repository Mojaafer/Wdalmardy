'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export function Logo({ className = '' }: { className?: string }) {
  const t = useTranslations('brand');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((res) => {
        const url = res.data?.store_logo as string | undefined;
        if (url) {
          setLogoUrl(url.startsWith('http') ? url : `${API_BASE}/storage/${url}`);
        }
      })
      .catch(() => {});
  }, []);

  if (logoUrl) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img src={logoUrl} alt={t('name')} className="h-20 xs:h-24 w-auto object-contain" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-16 w-16 place-items-center rounded-lg bg-brand-orange text-white font-extrabold text-3xl">
        ج
      </span>
      <div className="leading-tight">
        <div className="font-extrabold text-2xl xs:text-3xl">{t('name')}</div>
        <div className="text-sm xs:text-base text-brand-orange font-semibold tracking-wide">
          {t('subtitle')}
        </div>
      </div>
    </div>
  );
}
