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
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
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
): Promise<{ data: Product; related: { data: Product[] } }> {
  return request(`/products/${slug}`);
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
  items: { product_id: number; quantity: number }[];
};

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
