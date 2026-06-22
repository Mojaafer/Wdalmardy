'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Heart, Loader2 } from 'lucide-react';
import { getToken } from '@/lib/customer/auth';
import { toggleWishlist } from '@/lib/customer/auth';
import { useRouter } from '@/i18n/routing';

export function WishlistButton({ productId, initialAdded = false }: { productId: number; initialAdded?: boolean }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const [added, setAdded] = useState(initialAdded);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await toggleWishlist(productId);
      setAdded(res.data.added);
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 hover:bg-rose-50 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${added ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`} />
      )}
      {isAr ? (added ? 'تمت الإضافة' : 'أضف للمفضلة') : (added ? 'Saved' : 'Add to wishlist')}
    </button>
  );
}
