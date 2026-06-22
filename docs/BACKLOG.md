# Wad Almardi Market — Known Gaps & Backlog

Living document. Items here are real gaps found during the post-build audit
(written by Opus 4.8 + GLM-5.2); see `CHANGELOG.md` for what's already been
fixed.

Each item has a priority:
- **P0** — security, correctness, or money path. Fix before next deploy.
- **P1** — quality of life, missed features called out in PLAN.md.
- **P2** — polish, DX, nice-to-haves.

---

## P0 — Security & Correctness

### S1. No CSP / security headers
- **Where:** no `headers()` block in `backend/bootstrap/app.php`, no `next.config.mjs` `headers()`.
- **Risk:** XSS amplification, clickjacking.
- **Fix:** set `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, basic CSP.

### S2. No CSRF for storefront stateful auth
- **Where:** `SANCTUM_STATEFUL_DOMAINS` was missing from `.env.example` (now added), but no setup doc + no SPA cookie wiring on the frontend yet.
- **Risk:** if you flip to cookie-based Sanctum, CSRF protection must be wired (`/sanctum/csrf-cookie`).
- **Fix:** either commit to bearer-token auth (current state) or wire `credentials: 'include'` + CSRF in `lib/api.ts`.

### S3. CORS allows only one origin
- **Where:** `backend/config/cors.php:10` reads single `FRONTEND_URL`.
- **Risk:** breaks when running production admin + storefront on different origins.
- **Fix:** allow multiple origins (split by comma) or use a regex `allowed_origins_patterns`.

### S4. No audit log for failed logins
- **Where:** `backend/app/Http/Controllers/Api/Admin/AuthController::login` writes `auth.login` only on success.
- **Risk:** no record of brute-force attempts.
- **Fix:** write `auth.login.failed` with email + IP on ValidationException.

### S5. OTP codes returned in dev response
- **Where:** `backend/app/Http/Controllers/Api/AuthController::requestOtp` returns `otp` directly.
- **Risk:** production leak of OTP codes via API response.
- **Fix:** gate on `app()->environment(['local','testing'])`; in prod, send via SMS/WhatsApp and only return the message.

### S6. `AdminSeeder` overwrites passwords silently
- **Where:** `backend/database/seeders/AdminSeeder.php:109` uses `updateOrCreate` with bcrypt hash.
- **Risk:** running seeders against a partially-prod database resets admin password.
- **Fix:** only seed in non-production, or only create when missing (`firstOrCreate`).

### S7. WhatsApp message template hardcoded in OrderController
- **Where:** `backend/app/Http/Controllers/Api/OrderController.php:194-235`.
- **Risk:** changing copy needs code deploy.
- **Fix:** move to a `Setting` key or a `MessageTemplate` model with ar/en variants.

---

## P1 — Missing features called out in PLAN.md

### F1. Driver app (Phase 8)
- **Where:** `docs/PLAN.md:91-94`.
- **Status:** not started.
- **Notes:** `DriverAdminController` lets the admin assign drivers and view their list, but there is no driver-facing app/UI to receive assignments or push status updates / GPS.

### F2. Real-time order tracking
- **Where:** `docs/design/06-order-tracking.png` and `PLAN.md`.
- **Status:** now exists at `/[locale]/order-tracking/[orderId]` (added in CHANGELOG v1.1), but driver-pushed status + GPS pings remain missing.

### F3. Outbound WhatsApp notifications
- **Where:** `Order` model has `booted()` for in-app `AdminNotification`; nothing sends a WhatsApp message on status changes.
- **Fix:** add a `WhatsappSender` service + queue job that fires on `Order::updated` status change.

### F4. Customer-facing product reviews
- **Where:** `Product.rating` and `reviews_count` exist on the model; no `Review` model, no submission API, no storefront UI.
- **Fix:** add `reviews` table + endpoint + UI on product detail page.

### F5. Coupon "free shipping" UX
- **Where:** backend handles it; storefront checkout shows the discount line but the "free shipping" state isn't visually distinguished.
- **Fix:** show a "🚚 توصيل مجاني" badge when applied.

### F6. Wishlist / favorites
- **Where:** not modeled, no endpoints.
- **Status:** not in PLAN.md, but standard e-commerce expectation.

---

## P2 — Quality & DX

### Q1. `AppServiceProvider::boot()` was empty (now wired)
- Fixed in CHANGELOG v1.1. Add observers for `AdminNotification::fire()` fan-out when more notification channels exist.

### Q2. `bootstrap/cache/.gitignore` is included but not generated yet
- Make sure first `composer install --no-dev` creates it.

### Q3. POS offline-first
- **Where:** `docs/PLAN.md:85` mentions "offline-first cart".
- **Status:** not implemented.

### Q4. Image optimization in Next.js
- **Where:** `frontend/next.config.mjs` allows remote patterns but no AVIF/WebP.
- **Fix:** add `formats: ['image/avif', 'image/webp']`, `minimumCacheTTL`.

### Q5. a11y audit
- No axe / Lighthouse check on storefront pages. RTL handled; focus rings, `aria-*` not audited.

### Q6. Tests coverage is thin
- Current: `OrderCheckoutTest`, `CouponValidationTest`, `AdminAuthTest`. Missing: `ProductControllerTest`, `CustomerAuthTest` (OTP request/verify), `PosSaleAdminControllerTest`, `InventoryAdminControllerTest`, `LoyaltyAdminControllerTest`.

### Q7. No API contract docs
- All 80+ endpoints are documented only in `README.md` and `routes/api.php`. No OpenAPI/Swagger.

### Q8. `frontend/README.md` is stock boilerplate
- Replace with project-specific setup steps mirroring the root README.

### Q9. Currency formatting inconsistency
- `lib/format.ts` uses `ar-EG` and `ج.س`; `lib/utils.ts::formatPrice` uses `ar-EG` too. Some hardcoded strings in `frontend/src/components/Header.tsx` etc. still use `ar-SA`. Normalize to one locale.

### Q10. No git hooks
- Husky + lint-staged could run `pint`/`eslint` on commit.

---

## Items intentionally NOT on this backlog

- Payment gateway integration: `PLAN.md` calls this out as a separate workstream (Sudan-specific).
- Multi-currency: SDG is the only currency; no business requirement yet.
- PWA manifest: deferred to a follow-up — current responsive storefront is acceptable.
- Bulk import (CSV for products): not requested yet.