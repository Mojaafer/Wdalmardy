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

// Offers
export type AdminOffer = {
  id: number;
  type: 'banner' | 'daily' | 'weekly' | 'percentage' | 'fixed' | 'free_shipping';
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  discount_value: number;
  discount_unit: 'percent' | 'amount' | 'free_shipping';
  max_discount: number | null;
  scope: 'all' | 'category' | 'product';
  scope_id: number | null;
  banner_image: string | null;
  banner_link: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
  is_live: boolean;
  created_at: string;
};
export type OfferStats = { total: number; active: number; scheduled: number; expired: number; paused: number };

export const listOffers = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{ data: AdminOffer[]; meta: { total: number; current_page: number; last_page: number }; stats: OfferStats }>(
    `/admin/offers${qs ? `?${qs}` : ''}`,
  );
};
export const createOffer = (body: Record<string, unknown>) =>
  request<{ data: AdminOffer }>('/admin/offers', { method: 'POST', body: JSON.stringify(body) });
export const updateOffer = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminOffer }>(`/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const toggleOffer = (id: number) =>
  request<{ data: AdminOffer }>(`/admin/offers/${id}/toggle`, { method: 'POST' });
export const deleteOffer = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/offers/${id}`, { method: 'DELETE' });

// Coupons
export type AdminCoupon = {
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  max_discount: number | null;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_customer: number | null;
  applies_to: 'all' | 'new_customers';
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  status: 'active' | 'scheduled' | 'expired' | 'paused' | 'exhausted';
  created_at: string;
};
export type CouponStats = { total: number; active: number; expired: number; exhausted: number };

export const listCoupons = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{ data: AdminCoupon[]; meta: { total: number }; stats: CouponStats }>(
    `/admin/coupons${qs ? `?${qs}` : ''}`,
  );
};
export const createCoupon = (body: Record<string, unknown>) =>
  request<{ data: AdminCoupon }>('/admin/coupons', { method: 'POST', body: JSON.stringify(body) });
export const updateCoupon = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminCoupon }>(`/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteCoupon = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/coupons/${id}`, { method: 'DELETE' });

// Suppliers
export type AdminSupplier = {
  id: number;
  name: string;
  contact_person: string | null;
  business_type: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  logo: string | null;
  registered_at: string | null;
  status: 'active' | 'paused' | 'archived';
  performance_rating: number;
  total_purchases: number;
  current_balance: number;
  orders_count: number;
  last_order_at: string | null;
  notes: string | null;
  created_at: string;
};
export type SupplierStats = { total: number; active: number; paused: number; open_orders: number; total_purchases: number };

export const listSuppliers = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{ data: AdminSupplier[]; meta: { total: number }; stats: SupplierStats }>(
    `/admin/suppliers${qs ? `?${qs}` : ''}`,
  );
};
export const getSupplier = (id: number) =>
  request<{ data: AdminSupplier }>(`/admin/suppliers/${id}`);
export const createSupplier = (body: Record<string, unknown>) =>
  request<{ data: AdminSupplier }>('/admin/suppliers', { method: 'POST', body: JSON.stringify(body) });
export const updateSupplier = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminSupplier }>(`/admin/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const toggleSupplier = (id: number) =>
  request<{ data: AdminSupplier }>(`/admin/suppliers/${id}/toggle`, { method: 'POST' });
export const deleteSupplier = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/suppliers/${id}`, { method: 'DELETE' });

// Employees
export type AdminEmployee = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: string | null;
  role_label: string | null;
  last_login_at: string | null;
  created_at: string;
};
export type EmployeeActivity = {
  id: number;
  action: string;
  description: string;
  occurred_at: string;
  ip_address: string | null;
};
export type EmployeeStats = { total: number; active: number; inactive: number; roles: number; logins_today: number };

export const listEmployees = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<{ data: AdminEmployee[]; meta: { total: number }; stats: EmployeeStats }>(
    `/admin/employees${qs ? `?${qs}` : ''}`,
  );
};
export const getEmployee = (id: number) =>
  request<{ data: AdminEmployee; permissions: string[]; activity: EmployeeActivity[] }>(
    `/admin/employees/${id}`,
  );
export const createEmployee = (body: Record<string, unknown>) =>
  request<{ data: AdminEmployee }>('/admin/employees', { method: 'POST', body: JSON.stringify(body) });
export const updateEmployee = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminEmployee }>(`/admin/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteEmployee = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/employees/${id}`, { method: 'DELETE' });

// Roles & permissions
export type AdminRole = {
  id: number;
  name: string;
  label: string;
  users_count: number;
  permissions: string[];
};
export const listRoles = () =>
  request<{ data: AdminRole[]; permissions: Record<string, string[]> }>('/admin/roles');
export const updateRolePermissions = (role: string, permissions: string[]) =>
  request<{ data: { ok: boolean } }>(`/admin/roles/${role}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });

// Inventory
export type StockMovement = {
  id: number;
  type: 'in' | 'out' | 'adjustment';
  reason: 'sale' | 'return' | 'restock' | 'damage' | 'manual';
  quantity: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
  product: { id: number; slug: string; name_ar: string; name_en: string } | null;
  user: { id: number; name: string } | null;
};
export type InventoryStats = { total_products: number; low_stock: number; out_of_stock: number; total_stock_units: number };

export const listStockMovements = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: StockMovement[]; meta: { total: number; per_page: number; current_page: number; last_page: number }; stats: InventoryStats }>(
    `/admin/inventory/movements${query ? `?${query}` : ''}`,
  );
};
export type LowStockProduct = { id: number; slug: string; name_ar: string; name_en: string; stock: number; price: number; unit_ar: string | null };
export const listLowStock = (threshold = 10) =>
  request<{ data: LowStockProduct[]; threshold: number }>(`/admin/inventory/low-stock?threshold=${threshold}`);
export const adjustStock = (body: { product_id: number; type: 'in' | 'out' | 'adjustment'; reason: string; quantity: number; notes?: string }) =>
  request<{ data: StockMovement }>('/admin/inventory/adjust', { method: 'POST', body: JSON.stringify(body) });

// Delivery zones
export type DeliveryZone = {
  id: number;
  name_ar: string;
  name_en: string | null;
  fee: number;
  estimated_minutes: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  orders_count: number;
};
export const listDeliveryZones = () => request<{ data: DeliveryZone[] }>('/admin/delivery/zones');
export const createDeliveryZone = (body: Record<string, unknown>) =>
  request<{ data: DeliveryZone }>('/admin/delivery/zones', { method: 'POST', body: JSON.stringify(body) });
export const updateDeliveryZone = (id: number, body: Record<string, unknown>) =>
  request<{ data: DeliveryZone }>(`/admin/delivery/zones/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDeliveryZone = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/delivery/zones/${id}`, { method: 'DELETE' });

// Drivers
export type AdminDriver = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  profile: {
    availability: 'available' | 'on_delivery' | 'off_duty';
    vehicle: string | null;
    vehicle_plate: string | null;
    national_id: string | null;
    completed_orders: number;
    rating: number;
    zone: { id: number; name_ar: string; name_en: string | null } | null;
  } | null;
};
export type DriverStats = { total: number; available: number; on_delivery: number; off_duty: number; in_progress_orders: number };

export const listDrivers = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: AdminDriver[]; meta: { total: number; per_page: number; current_page: number; last_page: number }; stats: DriverStats }>(
    `/admin/delivery/drivers${query ? `?${query}` : ''}`,
  );
};
export const createDriver = (body: Record<string, unknown>) =>
  request<{ data: AdminDriver }>('/admin/delivery/drivers', { method: 'POST', body: JSON.stringify(body) });
export const updateDriver = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminDriver }>(`/admin/delivery/drivers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDriver = (id: number) =>
  request<{ data: { ok: boolean } }>(`/admin/delivery/drivers/${id}`, { method: 'DELETE' });
export const assignDriver = (orderId: number, driverId: number) =>
  request<{ data: { ok: boolean; order_id: number; driver_id: number } }>(`/admin/orders/${orderId}/assign-driver`, {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId }),
  });

// Pages CMS
export type AdminPage = {
  id: number;
  slug: string;
  title_ar: string;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
export type PageStats = { total: number; published: number; draft: number };
export const listPages = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: AdminPage[]; meta: PageStats }>(`/admin/pages${query ? `?${query}` : ''}`);
};
export const createPage = (body: Record<string, unknown>) =>
  request<{ data: AdminPage }>('/admin/pages', { method: 'POST', body: JSON.stringify(body) });
export const updatePage = (id: number, body: Record<string, unknown>) =>
  request<{ data: AdminPage }>(`/admin/pages/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deletePage = (id: number) =>
  request<{ data: { deleted: boolean } }>(`/admin/pages/${id}`, { method: 'DELETE' });

// Messages / Support
export type AdminMessageReply = {
  id: number;
  body: string;
  channel: 'note' | 'whatsapp' | 'email';
  created_at: string;
  user: { id: number; name: string } | null;
};
export type AdminMessage = {
  id: number;
  subject: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  body: string;
  source: 'contact_form' | 'manual' | 'whatsapp' | 'order';
  status: 'new' | 'open' | 'replied' | 'closed';
  order_id: number | null;
  assigned_to: number | null;
  replied_at: string | null;
  created_at: string;
  order?: { id: number; order_number: string } | null;
  assignee?: { id: number; name: string } | null;
  replies?: AdminMessageReply[];
};
export type MessageStats = { total: number; new: number; open: number; replied: number; closed: number };
export const listMessages = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: AdminMessage[]; meta: MessageStats }>(`/admin/messages${query ? `?${query}` : ''}`);
};
export const getMessage = (id: number) =>
  request<{ data: AdminMessage }>(`/admin/messages/${id}`);
export const replyMessage = (id: number, body: string, channel: 'note' | 'whatsapp' | 'email' = 'note', markReplied = false) =>
  request<{ data: AdminMessage }>(`/admin/messages/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body, channel, mark_replied: markReplied }),
  });
export const updateMessageStatus = (id: number, status: AdminMessage['status']) =>
  request<{ data: AdminMessage }>(`/admin/messages/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
export const deleteMessage = (id: number) =>
  request<{ data: { deleted: boolean } }>(`/admin/messages/${id}`, { method: 'DELETE' });

// Invoices
export type InvoiceItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  product_unit: string | null;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
};
export type AdminInvoice = {
  id: number;
  invoice_number: string;
  order_id: number | null;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  delivery_fee: string | number;
  total: string | number;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'refunded';
  payment_method: 'cod' | 'whatsapp' | 'cash' | 'transfer' | 'other';
  issued_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  order?: { id: number; order_number: string; status?: string } | null;
  items?: InvoiceItem[];
  creator?: { id: number; name: string } | null;
};
export type InvoiceStats = {
  count: number;
  issued: number;
  paid: number;
  cancelled: number;
  total_value: number;
  paid_value: number;
};
export const listInvoices = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{
    data: AdminInvoice[];
    meta: InvoiceStats & { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/invoices${query ? `?${query}` : ''}`);
};
export const getInvoice = (id: number) =>
  request<{ data: AdminInvoice }>(`/admin/invoices/${id}`);
export const generateInvoice = (orderId: number, paymentMethod?: string) =>
  request<{ data: AdminInvoice; created: boolean }>(`/admin/orders/${orderId}/invoice`, {
    method: 'POST',
    body: JSON.stringify({ payment_method: paymentMethod ?? null }),
  });
export const updateInvoiceStatus = (id: number, status: AdminInvoice['status'], notes?: string) =>
  request<{ data: AdminInvoice }>(`/admin/invoices/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, notes }),
  });
export const getInvoiceWhatsappUrl = (id: number) =>
  request<{ data: { whatsapp_url: string | null } }>(`/admin/invoices/${id}/whatsapp`);
export async function downloadInvoicePdf(id: number, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/invoices/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new AdminApiError('Failed to download PDF', res.status);
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

// Settings
export type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type AdminSetting = { value: SettingValue; type: string; group: string };
export type SettingsCatalogEntry = { key: string; type: string; group: string; label: string };
export const getSettings = () =>
  request<{ data: Record<string, AdminSetting>; catalog: SettingsCatalogEntry[] }>(
    '/admin/settings',
  );
export const updateSettings = (
  settings: { key: string; value: SettingValue; type: string; group?: string }[],
) =>
  request<{ data: Record<string, AdminSetting>; catalog: SettingsCatalogEntry[] }>(
    '/admin/settings',
    { method: 'PUT', body: JSON.stringify({ settings }) },
  );
export async function downloadBackup(filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/settings/backup`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new AdminApiError('Failed to download backup', res.status);
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

// Reports
export type ReportRange = '7d' | '30d' | '90d' | 'mtd' | 'ytd';
export type ReportSummary = {
  range: ReportRange | string;
  from: string;
  to: string;
  totals: {
    sales: number;
    orders: number;
    avg_order: number;
    discount: number;
    new_customers: number;
    estimated_profit: number;
  };
  sales_by_day: { date: string; total: number; count: number }[];
  top_products: { product_id: number; name: string; qty: number; revenue: number }[];
  revenue_by_category: { category_id: number; name: string; revenue: number }[];
  orders_by_status: Record<string, number>;
  top_customers: {
    customer_id: number;
    name: string;
    phone: string | null;
    orders_count: number;
    revenue: number;
  }[];
};
export const getReportSummary = (range: ReportRange = '30d') =>
  request<{ data: ReportSummary }>(`/admin/reports/summary?range=${range}`);

// Notifications
export type AdminNotificationItem = {
  id: number;
  type: 'order_new' | 'low_stock' | 'message_new' | 'supplier_order' | 'payment_received' | string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  link: string | null;
  user_id: number | null;
  read_at: string | null;
  created_at: string;
};
export const listNotifications = (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<{
    data: AdminNotificationItem[];
    meta: { total: number; unread: number };
  }>(`/admin/notifications${query ? `?${query}` : ''}`);
};
export const getUnreadCount = () =>
  request<{ unread: number }>('/admin/notifications/unread-count');
export const markNotificationRead = (id: number) =>
  request<{ data: AdminNotificationItem }>(`/admin/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () =>
  request<{ data: { marked_read: number } }>('/admin/notifications/read-all', { method: 'POST' });
export const deleteNotification = (id: number) =>
  request<{ data: { deleted: boolean } }>(`/admin/notifications/${id}`, { method: 'DELETE' });
