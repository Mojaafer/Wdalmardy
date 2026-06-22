# Wad Almardi Market — Security Notes

Last updated: 2026-06-22.

This is the live security stance of the platform. Anything in the
**Open / Mitigated by Configuration** section is set up via code/env but
requires a production deployment to actually be active.

## Authentication

### Customer (storefront)
- **OTP only** — no password. Phone is the canonical identifier.
- OTP TTL: **10 minutes** (`Customer::OTP_TTL_MINUTES`).
- Failed verification is rate-limited via Laravel's `throttle` middleware
  (configurable via `RATE_LIMIT_OTP`, default **5/min per IP**).
- OTP delivery: currently **returned in the API response** (dev mode). In
  production this should be removed and replaced with SMS / WhatsApp
  delivery. See BACKLOG.md S5.

### Admin / staff
- **Email + bcrypt password** (BCRYPT_ROUNDS=12).
- Sanctum personal access tokens, never cookies by default.
- Login throttled via `throttle:RATE_LIMIT_LOGIN,1` (default **10/min/IP**).
- Each successful login writes an `EmployeeActivity` row. Failed logins
  do **not** (see BACKLOG.md S4 — to be added).
- 2FA: **not implemented**. Add via `spatie/laravel-2fa` or similar.

## Authorization

- Single source of truth: **Spatie permissions** (`role:*`, `permission:*`
  middleware on every admin route).
- Granular `*.view` / `*.manage` split on every module.
- Default roles:
  - `admin` — all permissions
  - `accountant` — orders, invoices, reports, expenses, chart of accounts,
    journal entries, purchase orders, POS
  - `driver` — orders + delivery.view only
  - `branch_staff` — POS operate, products, inventory, orders
- Customer endpoints are gated by `auth:sanctum` + `customer` middleware
  (`EnsureCustomerMiddleware`) — which guarantees the resolved principal
  is a `Customer`, not a `User` admin.

## Transport

- `AppServiceProvider::configureUrls()` forces HTTPS in production
  (`URL::forceScheme('https')`).
- CORS restricted to `FRONTEND_URL` env (see BACKLOG.md S3 — should
  support comma-separated origins).
- All admin routes are token-based — no CSRF needed for them.
- If you switch to SPA cookie auth (set `SANCTUM_STATEFUL_DOMAINS`),
  CSRF is wired automatically by Sanctum's `EnsureFrontendRequestsAreStateful`
  middleware (verify after config change).

## Rate limiting

| Endpoint | Limit (per minute per IP) | Env var |
| --- | --- | --- |
| `POST /api/orders` | 20 | `RATE_LIMIT_ORDERS` |
| `POST /api/auth/request-otp` | 5 | `RATE_LIMIT_OTP` |
| `POST /api/auth/verify-otp` | 5 | `RATE_LIMIT_OTP` |
| `POST /api/messages` | 30 | hard-coded |
| `POST /api/admin/login` | 10 | `RATE_LIMIT_LOGIN` |
| All other `/api/*` | 60 (api throttle) | hard-coded |

Backed by Laravel's `RateLimiter`, which uses the configured
`CACHE_STORE` (file in dev, **redis in production**).

## Data protection

- **At rest:** rely on host-managed disk encryption (LUKS, AWS EBS, etc.).
  No column-level encryption.
- **In transit:** TLS via Nginx (see DEPLOYMENT.md).
- **Tokens:** Sanctum tokens hashed at rest in `personal_access_tokens`.
  Token plaintext shown only at issuance.
- **Passwords:** bcrypt cost 12. No password rotation policy (admin must
  reset via direct DB or upcoming password-change endpoint).

## Audit logging

- Every admin model that uses `Auditable` trait writes to `audit_logs` on
  create/update/delete. Excludes `password`, `remember_token`, `api_token`.
- `EmployeeActivity::log()` records auth + business events.
- `AuditLogAdminController::index` + `export` expose the log to admins
  with the `audit_logs.view` / `audit_logs.export` permissions.

## Headers

Production Nginx config (in `docs/DEPLOYMENT.md`) sets:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**No CSP yet** (BACKLOG.md S1). Until then, rely on Next.js's auto-escaping
+ React's JSX escaping (no `dangerouslySetInnerHTML` anywhere in the
codebase as of 2026-06-22).

## File uploads

- Stored in `backend/storage/app/public`, symlinked to `public/storage`.
- No anti-virus scan. Validate MIME + size server-side.
- Image upload endpoints (`/admin/products/{id}/image`,
  `/admin/categories/{id}/image`, `/admin/offers/{id}/banner`,
  `/admin/suppliers/{id}/logo`) — confirm size/MIME limits in their
  controllers.

## Reporting vulnerabilities

Open a private GitHub Security Advisory or email `security@wadalmardi.com`
(replace with the real contact). Please do not file public issues for
security problems.

## Known limitations (and where to fix them)

| Item | Where | Severity |
| --- | --- | --- |
| OTP returned in response | `AuthController::requestOtp` | Critical for prod |
| No 2FA for admin | New feature | High |
| CORS single origin | `config/cors.php` | Medium |
| No CSP header | Nginx config | Medium |
| No failed-login audit | `AdminAuthController::login` | Medium |
| No CSRF for SPA mode | depends on SANCTUM_STATEFUL_DOMAINS | Low (only if SPA mode) |
| No rate-limit on `/api/coupons/validate` | `routes/api.php` | Low |