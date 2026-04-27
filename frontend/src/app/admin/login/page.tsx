'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, setSession, getToken, AdminApiError } from '@/lib/admin/api';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@wadalmardi.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/admin');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setSession(res.data.token, res.data.user);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.errors?.email?.[0] ?? err.message);
      } else {
        setError('حدث خطأ غير متوقع');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E5C3A] to-[#0a4429] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FBEFE2] text-[#0E5C3A] font-extrabold text-2xl mb-3">
            ود
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">لوحة التحكم</h1>
          <p className="text-sm text-slate-500">ود المرضي ماركت</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 block mb-1">البريد الإلكتروني</span>
            <div className="relative">
              <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0E5C3A] focus:border-transparent outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 block mb-1">كلمة المرور</span>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0E5C3A] focus:border-transparent outline-none"
              />
            </div>
          </label>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6">
          الحساب الافتراضي: admin@wadalmardi.com / password
        </p>
      </div>
    </div>
  );
}
