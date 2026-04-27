# Wad Almardi Market — Architecture Plan

## Goal

A scalable bilingual (ar/en, RTL) platform combining:

1. **E-commerce storefront** with WhatsApp ordering and standard checkout
2. **Admin dashboard** (catalog, orders, customers, offers, inventory)
3. **POS** for in-branch sales with barcode support
4. **ERP modules** (suppliers, finance, employees, branches, audit, reports)
5. **Driver app** (delivery dispatch + tracking)

Designed so each module can be built incrementally without rewriting the foundation.

## Stack rationale

- **Next.js (App Router) + TypeScript** for the customer storefront — SSR/ISR for SEO and fast first paint, server actions for forms.
- **Laravel 11** for the API and admin backend — mature ORM (Eloquent), policies/permissions (Spatie), queues, scheduling, and a rich ecosystem (Filament/Nova) we can plug in for the admin dashboard later without rebuilding.
- **MySQL 8** because the user owns the operational stack and is most comfortable with MySQL.
- **next-intl** for ar/en and RTL — `dir` flips automatically per locale, messages co-located with components.
- **Zustand** for the cart — lightweight, persists to localStorage, no Redux ceremony.

## High-level architecture

```
┌──────────────────┐    HTTPS/JSON    ┌───────────────────┐
│  Next.js (web)   │ ───────────────► │  Laravel API      │
│  ar/en storefront│                  │  /api/*           │
└──────────────────┘                  │                   │
       ▲                              │  Eloquent ───────►│  MySQL 8
       │                              │  Sanctum auth     │
       │                              │  Queues (later)   │
       │                              └───────────────────┘
       │                                       ▲
       │                                       │
┌──────┴───────────┐                  ┌────────┴──────────┐
│  Admin (Filament │                  │  Driver app       │
│  / Next.js, TBD) │                  │  (Flutter, later) │
└──────────────────┘                  └───────────────────┘
```

## Data model (MVP slice)

```
categories (id, slug, name_ar, name_en, image, sort_order, is_active)
products   (id, category_id→categories, slug, name_ar, name_en,
            description_ar, description_en, image, price, compare_at_price,
            unit_ar, unit_en, stock, is_featured, is_active, rating, reviews_count)
product_images (id, product_id→products, url, sort_order)
orders     (id, order_number, customer_name, customer_phone, customer_email,
            address_state, address_district, address_details,
            delivery_method, payment_method, status,
            subtotal, delivery_fee, total, notes)
order_items (id, order_id→orders, product_id→products,
             name_ar, name_en, unit_price, quantity, line_total)
```

Bilingual fields are stored as parallel `_ar` / `_en` columns rather than a JSON locale map. Trade-off: more columns, but easier to index, search, and admin in Laravel without translation packages.

## API contract (MVP)

| Method | Path                       | Description                                                                         |
| ------ | -------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/categories`          | List active categories                                                              |
| GET    | `/api/categories/{slug}`   | One category + its products                                                         |
| GET    | `/api/products`            | List products. Filters: `category`, `q`, `min_price`, `max_price`, `sort`, `page`   |
| GET    | `/api/products/{slug}`     | Product detail + related products                                                   |
| POST   | `/api/orders`              | Place an order (WhatsApp or COD). Returns `order_number` and a wa.me link if WA.   |

## Roadmap

### Phase 1 — Storefront MVP (this PR)
Home · Store · Categories · Product · Cart · Checkout (WhatsApp + COD) · About · Contact.

### Phase 2 — Customer accounts
Sanctum-based login (phone + OTP via WhatsApp Cloud API or SMS), saved addresses, order history, order tracking timeline.

### Phase 3 — Admin dashboard
Filament v3 admin: products, categories, offers, orders, customers, basic inventory, page content.

### Phase 4 — Inventory & suppliers
Stock movements, low-stock alerts, suppliers CRUD, purchase orders, receiving.

### Phase 5 — POS
In-branch tablet UI (separate Next.js app or PWA) with barcode scanning, cash drawer, receipts, and offline-first cart.

### Phase 6 — ERP & finance
Chart of accounts, journal entries linked to orders/POs, daily/monthly reports, employee timesheets.

### Phase 7 — Multi-branch
`branches` table; `inventory` becomes per-branch; orders routed to nearest branch by delivery zone.

### Phase 8 — Driver app & tracking
Flutter app with login, assigned orders, status updates, GPS pings; web map on order tracking page.

### Phase 9 — Loyalty, coupons, BI, marketing automation
On top of the foundation.

## Non-goals for this PR

- Payment gateway integration (deferred — Sudan-specific gateways like Bashan/Bankak are separate work)
- Customer auth / accounts
- Admin dashboard
- Real-time anything (driver tracking, inventory sync)
- Mobile apps
