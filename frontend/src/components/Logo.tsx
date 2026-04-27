import { useTranslations } from 'next-intl';

export function Logo({ className = '' }: { className?: string }) {
  const t = useTranslations('brand');
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-orange text-white font-extrabold text-xl">
        ج
      </span>
      <div className="leading-tight">
        <div className="font-extrabold text-base">{t('name')}</div>
        <div className="text-[11px] text-brand-orange font-semibold tracking-wide">
          {t('subtitle')}
        </div>
      </div>
    </div>
  );
}
