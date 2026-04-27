# Wad Almardi Market

Bilingual (Arabic / English, RTL) e-commerce platform for **Wad Almardi Market** in Sudan, with a customer-facing storefront, WhatsApp ordering, and a forthcoming admin dashboard, POS, and ERP.

This first PR ships the customer-facing storefront MVP and the supporting REST API.

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
├── backend/          Laravel 11 API
├── frontend/         Next.js 14 storefront
├── docker-compose.yml  Local MySQL + phpMyAdmin
├── docs/
│   ├── design/       UI/UX mockups (reference)
│   └── PLAN.md       Architecture, data model, roadmap
└── README.md
```

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

## What's in this MVP

Customer storefront:

- Home (hero, categories grid, offers, featured products, trust strip)
- Store (`/store`) — product grid with category, price-range, and search filters
- Product detail (`/store/[slug]`) — gallery, description, related products
- Categories (`/categories`) and category page (`/categories/[slug]`)
- Cart (`/cart`)
- Checkout (`/checkout`) — WhatsApp order **or** Cash on Delivery
- About, Contact (static)

Backend API:

- `GET /api/categories`, `GET /api/categories/{slug}`
- `GET /api/products`, `GET /api/products/{slug}` (filters: `category`, `q`, `min_price`, `max_price`, `sort`, `page`)
- `POST /api/orders`

## Roadmap (not in this PR)

See [`docs/PLAN.md`](docs/PLAN.md). Next milestones: customer auth, account/orders, admin dashboard, POS, inventory, suppliers, ERP modules, driver app.

## Quality

```bash
# Frontend
cd frontend && npm run lint && npx tsc --noEmit

# Backend
cd backend && ./vendor/bin/pint --test
```
