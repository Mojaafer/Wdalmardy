'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from './api';

export type CartItem = {
  product_id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  unit_ar: string | null;
  unit_en: string | null;
  image: string | null;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product_id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                product_id: product.id,
                slug: product.slug,
                name_ar: product.name.ar,
                name_en: product.name.en,
                unit_ar: product.unit?.ar ?? null,
                unit_en: product.unit?.en ?? null,
                image: product.image,
                price: product.price,
                quantity,
              },
            ],
          };
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product_id !== productId)
              : state.items.map((i) =>
                  i.product_id === productId ? { ...i, quantity } : i
                ),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'wadalmardi-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
