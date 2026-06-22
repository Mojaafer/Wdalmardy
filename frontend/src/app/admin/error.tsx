'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && error) {
      console.error('[wdalmardy/admin] Unhandled error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <p className="text-7xl font-extrabold text-rose-600 mb-2">!</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          تعذّر تحميل الصفحة
        </h1>
        <p className="text-slate-500 mb-6 max-w-md">
          حاول إعادة المحاولة، أو ارجع إلى لوحة التحكم.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4" dir="ltr">
            رمز الخطأ: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            إعادة المحاولة
          </button>
          <Link href="/admin" className="btn-outline">
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}