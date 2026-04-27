import { Bike, Lock, Award, Headphones } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TrustStrip() {
  const t = useTranslations('trust');
  const items = [
    { Icon: Bike, key: 'fast_delivery', sub: 'fast_delivery_sub', color: 'text-brand-orange' },
    { Icon: Lock, key: 'secure_payment', sub: 'secure_payment_sub', color: 'text-brand-ink' },
    { Icon: Award, key: 'original', sub: 'original_sub', color: 'text-brand-green' },
    { Icon: Headphones, key: 'support', sub: 'support_sub', color: 'text-brand-ink' },
  ] as const;

  return (
    <div className="bg-brand-cream-50 border-y border-brand-cream-200">
      <div className="container grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
        {items.map(({ Icon, key, sub, color }) => (
          <div key={key} className="flex items-center gap-3">
            <Icon className={`h-7 w-7 ${color} flex-shrink-0`} />
            <div className="leading-tight">
              <div className="text-sm font-bold">{t(key)}</div>
              <div className="text-xs text-gray-500">{t(sub)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
