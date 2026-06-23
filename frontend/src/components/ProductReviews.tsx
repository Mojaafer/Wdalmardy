'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { Star, Loader2, User } from 'lucide-react';
import { getProductReviews, submitReview, type Review } from '@/lib/api';
import { getToken } from '@/lib/customer/auth';

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            className={`h-6 w-6 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getProductReviews(productId)
      .then((r) => setReviews(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setError(isAr ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    if (rating === 0) {
      setError(isAr ? 'اختر التقييم' : 'Select a rating');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitReview(productId, { rating, comment: comment || undefined }, token);
      setReviews((prev) => [res.data, ...prev]);
      setRating(0);
      setComment('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (isAr ? 'حدث خطأ' : 'Something went wrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-extrabold mb-6">{isAr ? 'التقييمات' : 'Reviews'}</h2>

      <form onSubmit={handleSubmit} className="card p-4 mb-6 space-y-3">
        <StarPicker value={rating} onChange={setRating} />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isAr ? 'اكتب تقييمك (اختياري)' : 'Write your review (optional)'}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 min-h-[80px]"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {success && <p className="text-xs text-brand-green">{isAr ? 'تم إرسال التقييم' : 'Review submitted'}</p>}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="btn-orange text-sm disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isAr ? 'إرسال التقييم' : 'Submit review'}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">{isAr ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-cream-100">
                  <User className="h-4 w-4 text-brand-green" />
                </div>
                <div>
                  <div className="text-sm font-bold">{r.customer_name}</div>
                  <div className="text-[11px] text-gray-400">{r.created_at}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
