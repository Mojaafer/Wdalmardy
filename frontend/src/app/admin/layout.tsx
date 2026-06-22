import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'لوحة التحكم — ود المرضي ماركت',
  description: 'لوحة تحكم إدارة متجر ود المرضي',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="ar";document.documentElement.dir="rtl"`,
        }}
      />
      <div
        className="bg-slate-100 text-slate-800"
        style={{
          fontFamily: 'var(--font-cairo), system-ui, sans-serif',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </>
  );
}
