'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Award,
  User,
  Search,
  Wallet,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { getLoyaltyBalance, type LoyaltyBalance } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

const STORAGE_KEY = 'wd_account_phone';

export default function AccountPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPhone(saved);
      lookup(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(p: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await getLoyaltyBalance(p);
      setBalance(r.data);
      setSearched(true);
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phone.trim()) lookup(phone.trim());
  }

  return (
    <div className="container py-10 max-w-2xl">
      <div className="card p-6 md:p-8 mb-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-cream-100 mx-auto mb-3">
          <User className="h-8 w-8 text-brand-green" />
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold mb-2">
          {locale === 'ar' ? 'حسابي ونقاط الولاء' : 'My Account & Loyalty'}
        </h1>
        <p className="text-sm text-gray-500">
          {locale === 'ar'
            ? 'أدخل رقم هاتفك لمعرفة رصيد نقاطك ومستوى ولائك.'
            : 'Enter your phone to view your loyalty balance and tier.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-4 mb-6 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          dir="ltr"
          placeholder={locale === 'ar' ? '+249xxxxxxxxx' : '+249xxxxxxxxx'}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
        />
        <button
          type="submit"
          disabled={loading || !phone.trim()}
          className="bg-brand-green text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? '...' : locale === 'ar' ? 'بحث' : 'Look up'}
        </button>
      </form>

      {error && (
        <div className="card p-4 mb-4 bg-rose-50 text-rose-700 text-sm">{error}</div>
      )}

      {searched && balance === null && !loading && (
        <div className="card p-6 text-center text-gray-500 text-sm">
          {locale === 'ar'
            ? 'لم نجد حساب بهذا الرقم بعد. اطلب أول مرة وسننشئ ملفك تلقائياً.'
            : "No account yet for this number. Place an order — we'll create your profile automatically."}
          <div className="mt-4">
            <Link href="/store" className="btn-orange inline-flex">
              {t('cart.go_shopping')}
            </Link>
          </div>
        </div>
      )}

      {balance && (
        <div className="space-y-4">
          <div
            className="card p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${balance.tier.color}, #0E5C3A)` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Award className="h-7 w-7" />
              <div>
                <div className="text-xs opacity-90">
                  {locale === 'ar' ? 'مستوى الولاء' : 'Loyalty tier'}
                </div>
                <div className="text-xl font-extrabold">{balance.tier.label}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs opacity-90 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  {locale === 'ar' ? 'الرصيد القابل للاستبدال' : 'Spendable balance'}
                </div>
                <div className="text-2xl font-extrabold mt-1">
                  {balance.loyalty_points.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                </div>
                <div className="text-[11px] opacity-80">
                  ≈ {formatPrice(balance.loyalty_points * balance.rules.redeem_value, locale)} {t('common.currency')}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-90 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {locale === 'ar' ? 'مجموع النقاط مدى الحياة' : 'Lifetime points'}
                </div>
                <div className="text-2xl font-extrabold mt-1">
                  {balance.lifetime_points.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                </div>
                {balance.next_tier && (
                  <div className="text-[11px] opacity-80">
                    {locale === 'ar'
                      ? `${balance.next_tier.remaining.toLocaleString('ar-EG')} نقطة للوصول إلى ${balance.next_tier.label}`
                      : `${balance.next_tier.remaining.toLocaleString()} points to ${balance.next_tier.label}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 font-bold text-gray-800">
              <Sparkles className="h-4 w-4 text-brand-green" />
              {locale === 'ar' ? 'كيف تكسب وتستبدل النقاط' : 'How earning & redemption works'}
            </div>
            <ul className="text-sm text-gray-600 space-y-1.5 list-disc pr-5 rtl:pr-0 rtl:pl-5">
              <li>
                {locale === 'ar'
                  ? `تكسب نقطة واحدة عن كل ${balance.rules.earn_rate.toLocaleString('ar-EG')} ${t('common.currency')} من قيمة الطلب بعد التوصيل.`
                  : `Earn 1 point per ${balance.rules.earn_rate} ${t('common.currency')} of payable subtotal once the order is delivered.`}
              </li>
              <li>
                {locale === 'ar'
                  ? `كل نقطة = ${balance.rules.redeem_value} ${t('common.currency')} خصم في صفحة الدفع.`
                  : `Each point = ${balance.rules.redeem_value} ${t('common.currency')} off at checkout.`}
              </li>
              <li>
                {locale === 'ar'
                  ? `أقصى استبدال في الطلب الواحد ${(balance.rules.redeem_cap_pct * 100).toFixed(0)}٪ من المجموع.`
                  : `You can redeem up to ${(balance.rules.redeem_cap_pct * 100).toFixed(0)}% of an order's subtotal.`}
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Link href="/store" className="btn-orange inline-flex">
              {t('cart.go_shopping')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
