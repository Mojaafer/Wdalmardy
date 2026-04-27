'use client';

import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import { Link } from '@/i18n/routing';

export function CartBadge() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/cart"
      className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-gray-100"
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {mounted && count > 0 && (
        <span className="absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-orange px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
