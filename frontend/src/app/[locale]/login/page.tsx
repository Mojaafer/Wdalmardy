'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { User, Smartphone, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import { requestOtp, verifyOtp, getToken } from '@/lib/customer/auth';
import { useAuth } from '@/lib/customer/useAuth';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) router.replace('/account');
  }, [router]);

  const isAr = locale === 'ar';

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestOtp(phone.trim());
      setDebugCode(res.data.otp ?? null);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (code.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone.trim(), code.trim());
      await refresh();
      router.replace('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setStep('phone');
    setCode('');
    setError(null);
    setDebugCode(null);
  }

  return (
    <div className="container py-10 max-w-md">
      <div className="card p-6 md:p-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-cream-100 mx-auto mb-3">
          {step === 'phone' ? (
            <User className="h-8 w-8 text-brand-green" />
          ) : (
            <Smartphone className="h-8 w-8 text-brand-green" />
          )}
        </div>

        <h1 className="text-xl font-extrabold mb-2">
          {isAr ? 'تسجيل الدخول' : 'Sign in'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {step === 'phone'
            ? isAr
              ? 'أدخل رقم هاتفك لتلقي رمز التحقق'
              : 'Enter your phone to receive a verification code'
            : isAr
              ? `أدخل الرمز المرسل إلى ${phone}`
              : `Enter the code sent to ${phone}`}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="relative">
              <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                dir="ltr"
                placeholder={isAr ? '+249xxxxxxxxx' : '+249xxxxxxxxx'}
                className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-brand-green text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {loading
                ? isAr ? 'جاري الإرسال...' : 'Sending...'
                : isAr ? 'إرسال رمز التحقق' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                placeholder={isAr ? 'رمز التحقق' : 'Verification code'}
                className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              />
            </div>
            {debugCode && (
              <div className="p-2 bg-yellow-50 text-yellow-800 rounded-lg text-xs">
                {isAr ? 'رمز التطوير: ' : 'Dev code: '}
                <b>{debugCode}</b>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full bg-brand-green text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {loading
                ? isAr ? 'جاري التحقق...' : 'Verifying...'
                : isAr ? 'تسجيل الدخول' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="w-full text-sm text-gray-500 flex items-center justify-center gap-1 py-2 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {isAr ? 'تغيير الرقم' : 'Change number'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
          {isAr
            ? 'لأول مرة؟ اطلب عبر المتجر وسيتم إنشاء حسابك تلقائياً'
            : 'First time? Place an order and your account will be created automatically'}
        </div>
      </div>
    </div>
  );
}
