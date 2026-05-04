export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export type LocalizedString = { ar: string; en: string };

export type Category = {
  id: number;
  slug: string;
  name: LocalizedString;
  image: string | null;
  sort_order: number;
  products_count?: number;
  products?: Product[];
};

export type Product = {
  id: number;
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  unit: LocalizedString;
  image: string | null;
  images?: string[];
  price: number;
  compare_at_price: number | null;
  discount_percent: number;
  stock: number;
  in_stock: boolean;
  is_featured: boolean;
  rating: number;
  reviews_count: number;
  category?: { id: number; slug: string; name: LocalizedString };
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: init?.cache ?? 'no-store',
  });
  if (!res.ok) {
    let message = res.statusText;
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        const body = JSON.parse(text) as { message?: unknown };
        if (typeof body.message === 'string') {
          message = body.message;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
    throw new Error(`API ${res.status}: ${message}`);
  }
  return res.json();
}

export async function getCategories(): Promise<{ data: Category[] }> {
  return request('/categories');
}

export async function getCategory(slug: string): Promise<{ data: Category }> {
  return request(`/categories/${slug}`);
}

export async function getProducts(params: Record<string, string | number | undefined> = {}): Promise<
  Paginated<Product>
> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) search.append(k, String(v));
  });
  const qs = search.toString();
  return request(`/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(
  slug: string
): Promise<{ data: Product; related: Product[] }> {
  const res = await request<{ data: Product; related: Product[] | { data: Product[] } }>(
    `/products/${slug}`
  );
  const related = Array.isArray(res.related) ? res.related : (res.related?.data ?? []);
  return { data: res.data, related };
}

export type CreateOrderInput = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  address_state?: string;
  address_district?: string;
  address_details?: string;
  delivery_method: 'delivery' | 'pickup';
  payment_method: 'whatsapp' | 'cod' | 'bank_transfer';
  notes?: string;
  coupon_code?: string;
  delivery_zone_id?: number;
  items: { product_id: number; quantity: number }[];
};

export type DeliveryZone = {
  id: number;
  name_ar: string;
  name_en: string | null;
  fee: number;
  estimated_minutes: number;
};

export async function getDeliveryZones(): Promise<{ data: DeliveryZone[] }> {
  return request('/delivery-zones');
}

export type ActiveOffer = {
  id: number;
  type: 'banner' | 'daily' | 'weekly' | 'percentage' | 'fixed' | 'free_shipping';
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  discount_value: number;
  discount_unit: 'percent' | 'amount' | 'free_shipping';
  banner_image: string | null;
  banner_link: string | null;
  ends_at: string | null;
};

export async function getActiveOffers(): Promise<{ data: ActiveOffer[] }> {
  return request('/offers/active');
}

export type CouponValidation = {
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  discount: number;
  free_shipping: boolean;
};

export async function validateCoupon(
  code: string,
  subtotal: number,
  shipping: number,
): Promise<{ data: CouponValidation }> {
  return request('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal, shipping }),
  });
}

export type CreateOrderResponse = {
  data: {
    order_number: string;
    total: number;
    subtotal: number;
    delivery_fee: number;
    status: string;
    whatsapp_url: string | null;
  };
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  return request('/orders', { method: 'POST', body: JSON.stringify(input) });
}

export type StorefrontPage = {
  slug: string;
  title_ar: string;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  meta_description: string | null;
};

export async function getPage(slug: string): Promise<{ data: StorefrontPage } | null> {
  try {
    return await request<{ data: StorefrontPage }>(`/pages/${slug}`);
  } catch {
    return null;
  }
}

export async function listPages(): Promise<{ data: Pick<StorefrontPage, 'slug' | 'title_ar' | 'title_en' | 'meta_description'>[] }> {
  return request<{ data: Pick<StorefrontPage, 'slug' | 'title_ar' | 'title_en' | 'meta_description'>[] }>('/pages');
}

export async function submitContactMessage(input: {
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  body: string;
  order_number?: string;
}): Promise<{ data: { id: number; received: boolean } }> {
  return request<{ data: { id: number; received: boolean } }>('/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
