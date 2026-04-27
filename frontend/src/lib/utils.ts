import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number, locale: string = 'ar') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
