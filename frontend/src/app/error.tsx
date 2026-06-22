'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && error) {
      console.error('[wdalmardy] Unhandled error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <p className="text-7xl font-extrabold text-rose-600 mb-2">!</p>
        <h1 className="text-2xl font-bold text-brand-ink mb-2">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-gray-500 mb-6 max-w-md">
          نأسف لذلك. حاول إعادة المحاولة، وإن استمرّ الخطأ تواصل مع الدعم.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4" dir="ltr">
            رمز الخطأ: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            إعادة المحاولة
          </button>
          <Link href="/" className="btn-outline">
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}