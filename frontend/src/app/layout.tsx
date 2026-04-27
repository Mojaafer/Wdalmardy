import type { ReactNode } from 'react';

// The locale layout is the only one that renders <html> / <body>. This
// pass-through layout is required so Next.js can find a root layout, and
// keeps next-intl's per-locale layout in charge of HTML attributes (lang,
// dir, fonts).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
