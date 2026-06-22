'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const TOKEN_KEY = 'wdalmardy_customer_token';

export type CustomerData = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  addresses: Address[];
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  lifetime_points: number;
  tier: { key: string; label: string; min: number; color: string };
};

export type Address = {
  label: string;
  state: string | null;
  district: string | null;
  details: string | null;
  phone: string | null;
};

export type OrderItem = {
  id: number;
  name_ar: string;
  name_en: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type CustomerOrder = {
  id: number;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  delivery_method: string;
  created_at: string;
  items: OrderItem[];
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && typeof init.body === 'string') {
    headers['Content-Type'] ??= 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch { }
    if (res.status === 401) clearToken();
    throw new Error(message);
  }

  return res.json();
}

export async function requestOtp(phone: string) {
  return request<{ data: { message: string; otp: string; expires_in_minutes: number } }>('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const res = await request<{ data: { token: string; customer: CustomerData } }>(
    '/auth/verify-otp',
    { method: 'POST', body: JSON.stringify({ phone, code }) },
  );
  setToken(res.data.token);
  return res;
}

export async function getMe() {
  return request<{ data: CustomerData }>('/auth/me');
}

export async function logout() {
  try {
    await request<{ data: { ok: boolean } }>('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export async function updateProfile(body: { name?: string; email?: string; city?: string }) {
  return request<{ data: CustomerData }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getAddresses() {
  return request<{ data: Address[] }>('/auth/addresses');
}

export async function updateAddresses(addresses: Address[]) {
  return request<{ data: Address[] }>('/auth/addresses', {
    method: 'PUT',
    body: JSON.stringify({ addresses }),
  });
}

export async function getOrders(page = 1) {
  return request<{
    data: CustomerOrder[];
    meta: { current_page: number; last_page: number; total: number };
  }>(`/auth/orders?page=${page}`);
}

export type CustomerOrderDetail = CustomerOrder & {
  notes: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_state: string | null;
  address_district: string | null;
  address_details: string | null;
  discount_amount: number;
  points_redeemed: number;
  points_discount: number;
  coupon_code: string | null;
  driver: { id: number; name: string; phone: string | null } | null;
};

export async function getOrder(orderId: number) {
  return request<{ data: CustomerOrderDetail }>(`/auth/orders/${orderId}`);
}
