'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/api';

export function ProductActions({ product }: { product: Product }) {
  const t = useTranslations();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  const wa = process.env.NEXT_PUBLIC_WA_PHONE ?? '249123456789';
  const waText = encodeURIComponent(
    `أرغب بطلب: ${product.name.ar} × ${qty} - ${product.price * qty} ج.س`
  );

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{t('product.quantity')}:</span>
        <div className="inline-flex items-center rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-10 w-10 place-items-center text-gray-500 hover:bg-gray-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="grid h-10 w-10 place-items-center text-gray-500 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        onClick={() => add(product, qty)}
        disabled={!product.in_stock}
        className="btn-orange w-full"
      >
        <ShoppingCart className="h-4 w-4" />
        {t('product.add_to_cart')}
      </button>

      <a
        href={`https://wa.me/${wa}?text=${waText}`}
        target="_blank"
        rel="noreferrer"
        className="btn-outline w-full"
      >
        <MessageCircle className="h-4 w-4" />
        {t('product.buy_via_wa')}
      </a>
    </div>
  );
}
