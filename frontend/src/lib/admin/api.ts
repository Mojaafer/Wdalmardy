'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const TOKEN_KEY = 'wdalmardy_admin_token';
const USER_KEY = 'wdalmardy_admin_user';

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  permissions: string[];
  is_active: boolean;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AdminUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class AdminApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  parseJson = true,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && typeof init.body === 'string') {
    headers['Content-Type'] ??= 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new AdminApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let errors: Record<string, string[]> | undefined;
    try {
      const body = await res.json();
      message = body.message ?? message;
      errors = body.errors;
    } catch {
      // ignore
    }
    throw new AdminApiError(message, res.status, errors);
  }

  if (!parseJson) return undefined as T;
  return (await res.json()) as T;
}

// Auth
export const login = (email: string, password: string) =>
  request<{ data: { token: string; user: AdminUser } }>(
    '/admin/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );

export const me = () => request<{ data: AdminUser }>('/admin/me');
export const logout = () =>
  request<{ data: { ok: boolean } }>('/admin/logout', { method: 'POST' });

// Dashboard
export type DashboardData = {
  kpis: {
    sales: { today: number; yesterday: number };
    profit: { today: number; yesterday: number };
    orders: { today: number; yesterday: number };
    avg_order: { today: number; yesterday: number };
    new_customers: { today: number; yesterday: number };
  };
  sales_series: { date: string; total: number }[];
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    total: string | number;
    status: string;
    created_at: string;
  }>;
  low_stock: Array<{ id: number; name_ar: string; name_en: string; stock: number; image: string | null }>;
  customer_stats: { total: number; new: number; active: number; returning: number };
};
export const getDashboard = () => request<{ data: DashboardData }>('/admin/dashboard');

// Products
export type AdminProduct = {
  id: number;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  unit: { ar: string; en: string };
  image: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  rating: number;
  reviews_count: number;
  category: { id: number; slug: string; name: { ar: string; en: string } } | null;
};

export const listProducts = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{
    data: AdminProduct[];
    meta: { current_page: number; last_page: number; total: number };
  }>(`/admin/products${qs ? `?${qs}` : ''}`);
};
export const createProduct = (body: Record<string, unknown>) =>
  request<{ data: AdminProduct }>('/admin/products', { method: 'POST', body: JSON.stringify(body) });
export const updateProduct = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminProduct }>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteProduct = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/products/${id}`, { method: 'DELETE' });

// Categories
export type AdminCategory = {
  id: number;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string | null; en: string | null };
  image: string | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
};
export const listCategories = () =>
  request<{ data: AdminCategory[] }>('/admin/categories?per_page=100');
export const createCategory = (body: Record<string, unknown>) =>
  request<{ data: AdminCategory }>('/admin/categories', { method: 'POST', body: JSON.stringify(body) });
export const updateCategory = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminCategory }>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteCategory = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/categories/${id}`, { method: 'DELETE' });
export const reorderCategories = (order: number[]) =>
  request<{ data: { ok: boolean } }>('/admin/categories/reorder', {
    method: 'POST',
    body: JSON.stringify({ order }),
  });

// Orders
export type AdminOrder = {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_state: string | null;
  address_district: string | null;
  address_details: string | null;
  delivery_method: 'delivery' | 'pickup';
  payment_method: 'whatsapp' | 'cod' | 'bank_transfer';
  status: 'new' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: string;
  delivery_fee: string;
  total: string;
  notes: string | null;
  created_at: string;
  driver?: { id: number; name: string } | null;
  items: Array<{
    id: number;
    name_ar: string;
    name_en: string;
    unit_price: string;
    quantity: number;
    line_total: string;
  }>;
};

export const listOrders = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{
    data: AdminOrder[];
    meta: { current_page: number; last_page: number; total: number };
  }>(`/admin/orders${qs ? `?${qs}` : ''}`);
};
export const getOrder = (id: number) => request<{ data: AdminOrder }>(`/admin/orders/${id}`);
export const updateOrderStatus = (id: number, status: string, assigned_driver_id?: number) =>
  request<{ data: AdminOrder }>(`/admin/orders/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, ...(assigned_driver_id ? { assigned_driver_id } : {}) }),
  });
export const resendWhatsapp = (id: number) =>
  request<{ data: { whatsapp_url: string } }>(`/admin/orders/${id}/whatsapp-resend`, {
    method: 'POST',
  });
export async function downloadInvoice(id: number, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/orders/${id}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : {},
  });
  if (!res.ok) throw new AdminApiError(`Failed (${res.status})`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Customers
export type AdminCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  is_blocked: boolean;
  total_orders: number;
  total_spent: string;
  created_at: string;
  orders_count?: number;
};
export type CustomerStats = {
  total_customers: number;
  active: number;
  blocked: number;
  total_orders: number;
  total_sales: number;
};

export const listCustomers = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{ data: AdminCustomer[]; meta: CustomerStats }>(
    `/admin/customers${qs ? `?${qs}` : ''}`,
  );
};
export const getCustomer = (id: number) =>
  request<{ data: AdminCustomer & { orders: AdminOrder[] } }>(`/admin/customers/${id}`);
export const createCustomer = (body: Record<string, unknown>) =>
  request<{ data: AdminCustomer }>('/admin/customers', { method: 'POST', body: JSON.stringify(body) });
export const updateCustomer = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminCustomer }>(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const blockCustomer = (id: number) =>
  request<{ data: AdminCustomer }>(`/admin/customers/${id}/block`, { method: 'POST' });
export const deleteCustomer = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/customers/${id}`, { method: 'DELETE' });
