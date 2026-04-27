import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import '../globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700', '800'] });

export const metadata: Metadata = {
  title: 'لوحة التحكم — ود المرضي ماركت',
  description: 'لوحة تحكم إدارة متجر ود المرضي',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-slate-100 text-slate-800`}>{children}</body>
    </html>
  );
}
