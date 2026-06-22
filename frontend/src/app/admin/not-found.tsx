import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <p className="text-7xl font-extrabold text-slate-300 mb-2">404</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-slate-500 mb-6 max-w-sm">
          الصفحة التي تبحث عنها في لوحة التحكم غير متاحة.
        </p>
        <Link href="/admin" className="btn-primary inline-flex">
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </div>
  );
}