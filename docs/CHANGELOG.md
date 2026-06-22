# Changelog — Wad Almardi Market

All notable changes to this project. Format based on
[Keep a Changelog](https://keepachangelog.com/), dates in `YYYY-MM-DD`.

## [Unreleased]

### To be added — see `docs/BACKLOG.md` for the full list.

---

## [1.1.0] — 2026-06-22 — Quality & CI hardening pass

### Added
- **GitHub Actions CI** for both apps:
  - `.github/workflows/backend.yml` — Pint + PHPUnit (MySQL service container)
  - `.github/workflows/frontend.yml` — ESLint + `tsc --noEmit` + `next build`
- **Backend test suite** (Feature tests):
  - `tests/Feature/OrderCheckoutTest.php` — 11 cases covering order placement,
    WhatsApp/COD payment methods, stock movement, customer auto-create,
    percent / free-shipping coupons, inactive coupons, points redemption
    clamping, validation, and inactive-product 404.
  - `tests/Feature/CouponValidationTest.php` — 10 cases covering happy path,
    case-insensitivity, expiry, exhaustion, min-order, segment targeting,
    max-discount cap, paused coupons, and missing-fields.
  - `tests/Feature/AdminAuthTest.php` — 10 cases covering login success,
    wrong password, unknown email, disabled account, employee activity
    logging, `/me` round-trip, token invalidation on logout, and
    permission middleware enforcement.
- **Next.js error / loading / not-found boundaries**:
  - `frontend/src/app/{error,not-found,loading}.tsx` — storefront RTL
  - `frontend/src/app/admin/{error,not-found,loading}.tsx` — admin (LTR)
- **`backend/app/Providers/AppServiceProvider`** now wires:
  - `Model::preventLazyLoading()` + `preventSilentlyDiscardingAttributes()`
    in non-production (catches N+1 and mass-assignment bugs early)
  - `URL::forceScheme('https')` in production
  - `RateLimiter::for('api', ...)` (was already wired)
- **`backend/.env.example`** gains:
  - `SANCTUM_STATEFUL_DOMAINS` (with localhost defaults)
  - `RATE_LIMIT_ORDERS`, `RATE_LIMIT_LOGIN`, `RATE_LIMIT_OTP`
- **`backend/routes/api.php`** adds per-route throttling:
  - `POST /api/orders` → `throttle:RATE_LIMIT_ORDERS,1`
  - `POST /api/messages` → `throttle:30,1`
  - `POST /api/auth/request-otp` + `verify-otp` → `throttle:RATE_LIMIT_OTP,1`
  - `POST /api/admin/login` → `throttle:RATE_LIMIT_LOGIN,1`
  - Customer protected routes are extracted from the public OTP group.
- **`backend/bootstrap/app.php`** adds global `throttleApi()` (60/min/IP).
- **Order tracking page** at `frontend/src/app/[locale]/order-tracking/[orderId]/page.tsx`:
  matches `docs/design/06-order-tracking.png`. Shows status timeline,
  customer + driver details, itemized totals, and 404s on cross-customer
  access. Linked from the `Orders` tab in `/account`.
- **`App\Http\Controllers\Api\AuthController::showOrder`** + new route
  `GET /api/auth/orders/{orderId}` so the storefront can pull a single
  order scoped to the authenticated customer (404 on cross-customer access).
- **Shared formatter module** `frontend/src/lib/format.ts`. `lib/admin/format.ts`
  now re-exports the locale-aware `fmtSDG` / `fmtNumber` / `fmtDate` /
  `fmtDeltaPct` and keeps admin-only `STATUS_*` / `ROLE_LABELS` maps.
- **`AdminSeeder`** permissions for the new finance modules: expenses,
  chart-of-accounts, journal-entries, purchase-orders.

### Fixed
- `AppServiceProvider` had empty `register()` / `boot()`; now boots model
  safety, HTTPS forcing, and the rate limiter.
- `AdminSeeder.php` had a duplicate `$granularModules` block and a
  mis-indented `$permissions`; both cleaned up. Adds new permission
  modules (`expenses`, `chart_of_accounts`, `journal_entries`,
  `purchase_orders`).
- CORS / Sanctum env now documented in `.env.example` so operators don't
  have to guess.
- **`routes/api.php:95`** admin `/admin/logout` now uses `AdminAuthController`
  (was calling the customer `AuthController::logout`, which silently
  bypassed admin token deletion).
- **`DashboardController`** is now permission-gated
  (`permission:dashboard.view`). Previously any authenticated user could
  hit it.
- **`Customer::awardPoints`** atomic UPDATE is now SQLite-compatible
  (uses `MAX(0, …)` on SQLite, `GREATEST(0, …)` on MySQL/Postgres).
  Lets the test suite run on the dev `.env` SQLite without a MySQL
  service.

### Docs
- `docs/CHANGELOG.md` (this file)
- `docs/BACKLOG.md` — comprehensive backlog of remaining gaps
  (security, missing features, polish), prioritized P0–P2.
- `docs/DEPLOYMENT.md` — server requirements, Nginx configs,
  systemd units, env vars, pre-deploy checklist, rollback procedure.
- `docs/SECURITY.md` — auth model, rate limits, headers, audit, known
  limitations.
- `docs/TESTING.md` — how to run tests, what each one covers, how to
  write new tests, manual smoke-test checklist.

---

## [1.0.0] — 2026-06-20 — Initial functional baseline

Implemented by Opus 4.8 + GLM-5.2 as the first usable release of the
Wad Almardi Market platform. See `README.md` for the full feature list.

### Highlights
- Bilingual (Arabic/English, RTL/LTR) Next.js 14 storefront
- Laravel 11 API with 47 controllers across storefront + admin
- POS with sessions, sales, Z-reports, void
- ERP: products, categories, customers, suppliers, branches, inventory,
  invoices, messages, audit log
- Finance v1: expenses, chart of accounts, journal entries, purchase orders
- Loyalty program with tiers + redemption
- Coupon engine with percent / fixed / free-shipping + targeting segments
- Customer OTP auth + admin email/password auth (Spatie permissions)
- Docker Compose for local MySQL + phpMyAdmin
- 42 migrations + 39 Eloquent models + 156 i18n keys (fully in sync)