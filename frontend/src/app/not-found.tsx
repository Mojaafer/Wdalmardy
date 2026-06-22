import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <p className="text-7xl font-extrabold text-brand-green mb-2">404</p>
        <h1 className="text-2xl font-bold text-brand-ink mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 mb-6 max-w-sm">
          الصفحة التي تبحث عنها قد تكون قد نُقلت أو حُذفت.
        </p>
        <Link href="/" className="btn-orange inline-flex">
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}