# Wad Almardi Market

Bilingual (Arabic / English, RTL) e-commerce platform for **Wad Almardi Market** in Sudan. It spans a customer-facing storefront with WhatsApp ordering, a full admin/ERP dashboard, and an in-branch POS — all on a shared Laravel API.

> **Status:** The storefront, admin dashboard, POS, inventory, loyalty, coupons, suppliers, and reporting modules are implemented and in active use. Multi-branch support is in progress. The native driver app (Phase 8) is not yet started. See [Implemented modules](#implemented-modules) and [Roadmap](#roadmap) below.

## Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Frontend     | Next.js 14 (App Router) · TypeScript · Tailwind |
| i18n         | `next-intl` (`ar` / `en`) with RTL/LTR          |
| State (cart) | Zustand                                         |
| Backend      | Laravel 11 · PHP 8.2 · Sanctum                  |
| Database     | MySQL 8                                         |
| Local infra  | Docker Compose (`mysql`, `phpmyadmin`)          |

Currency: **ج.س** (Sudanese Pound, SDG).
Default locale: **ar** (RTL). English is a peer locale, not just a translation.

## Repo layout

```
.
├── backend/          Laravel 11 API (storefront + admin/POS/ERP endpoints)
├── frontend/         Next.js 14 app (storefront under /[locale], admin under /admin)
├── docker-compose.yml  Local MySQL + phpMyAdmin
├── docs/
│   ├── design/       UI/UX mockups (reference)
│   └── PLAN.md       Architecture, data model, roadmap
├── ui/               Original WhatsApp design mockups (47 screens, reference)
└── README.md
```

**Frontend layout**

- `frontend/src/app/[locale]/` — customer storefront (ar/en, RTL/LTR)
- `frontend/src/app/admin/(authed)/` — admin dashboard, POS, and ERP modules

## Local setup

### 1. Database

```bash
docker compose up -d mysql phpmyadmin
```

MySQL is exposed on `localhost:3307` (to avoid clashing with a host MySQL on 3306).
phpMyAdmin: <http://localhost:8081>.

### 2. Backend (Laravel)

```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

API will be at <http://localhost:8000/api>.

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local   # if present, otherwise create
npm install
npm run dev
```

Storefront will be at <http://localhost:3000>. The default route redirects to `/ar`.

## Environment variables

### `backend/.env`

```
APP_NAME=WdAlmardy
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=wdalmardy
DB_USERNAME=wdalmardy
DB_PASSWORD=wdalmardy

WA_PHONE_NUMBER=+249123456789      # WhatsApp number that receives orders
```

### `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WA_PHONE=249123456789  # WhatsApp number for wa.me links (no leading +)
NEXT_PUBLIC_CURRENCY=ج.س
```

## Implemented modules

### Customer storefront (`/[locale]`)

- Home (hero, categories grid, offers, featured products, trust strip)
- Store (`/store`) — product grid with category, price-range, and search filters
- Product detail (`/store/[slug]`, `/p/[slug]`) — gallery, description, related products
- Categories (`/categories`) and category page
- Cart (`/cart`) with quantity editing and recommendations
- Checkout (`/checkout`) — WhatsApp order **or** Cash on Delivery, with loyalty points redemption
- About, Contact, Account (order history)

### Admin dashboard & ERP (`/admin`)

- **Dashboard** — KPIs (today's sales/profit/orders/avg order/new customers), sales chart, recent orders, low-stock alerts, customer stats
- **Catalog** — products (with stock KPIs), categories, offers, barcodes
- **Sales** — orders (status workflow + detail), invoices (preview + PDF), POS
- **POS** — cashier screen, sessions, per-sale detail, Z-report
- **Customers & loyalty** — customers, loyalty program, coupons (with targeting)
- **Supply chain** — suppliers, branches (multi-branch, in progress), inventory + stock movements, quick-count inventory audits
- **Operations** — employees, permissions (role-based), delivery, messages/support, notifications
- **Content & insight** — pages (CMS), reports/analytics, audit log, system settings

### Backend API

Storefront (public):

- `GET /api/categories`, `GET /api/categories/{slug}`
- `GET /api/products`, `GET /api/products/{slug}` (filters: `category`, `q`, `min_price`, `max_price`, `sort`, `page`)
- `POST /api/orders` (WhatsApp or COD, with loyalty side-effects)
- Coupon redemption (`CouponController`)

Admin/ERP (Sanctum-authenticated, under `/api/admin/*`): products, categories, orders, customers, offers, coupons, suppliers, branches, employees, inventory, POS (sessions/sales/z-report), loyalty, invoices, reports, audit log, pages, settings, permissions.

## Roadmap

See [`docs/PLAN.md`](docs/PLAN.md) for the full phased plan. Current status against it:

| Phase | Module | Status |
| ----- | ------ | ------ |
| 1 | Storefront MVP | ✅ Done |
| 2 | Customer accounts (auth, order history) | ✅ Done |
| 3 | Admin dashboard | ✅ Done |
| 4 | Inventory & suppliers | ✅ Done (+ inventory audits) |
| 5 | POS (in-branch) | ✅ Done (sessions, sales, z-report) |
| 6 | ERP & finance | ✅ Done |
| 7 | Multi-branch | 🚧 In progress (branch + per-branch stock models added) |
| 8 | Driver app & tracking | ❌ Not started (native app, deferred) |
| 9 | Loyalty, coupons, marketing | ✅ Done |

Design references for all storefront and admin screens live in [`ui/`](ui/) (47 mockups) and [`docs/design/`](docs/design/).

## Quality

```bash
# Frontend
cd frontend && npm run lint && npx tsc --noEmit

# Backend
cd backend && ./vendor/bin/pint --test
```
