# Wad Almardi Market — Testing Guide

Last updated: 2026-06-22.

## Layout

```
backend/
├── tests/
│   ├── TestCase.php
│   ├── Feature/
│   │   ├── OrderCheckoutTest.php    POST /api/orders + stock + coupons + loyalty
│   │   ├── CouponValidationTest.php POST /api/coupons/validate
│   │   └── AdminAuthTest.php        POST /api/admin/login + me + logout + permissions
│   └── Unit/                        (currently empty)
└── phpunit.xml                      defines Unit + Feature testsuites
```

Frontend has **no tests yet**. See BACKLOG.md Q6 — Vitest + Playwright are
the recommended next additions.

## Running

### All tests

```bash
cd backend
./vendor/bin/phpunit --testdox
```

### A single file / single test

```bash
./vendor/bin/phpunit --testdox --filter OrderCheckoutTest
./vendor/bin/phpunit --testdox --filter test_coupon_with_percent_discount_is_applied
```

### With coverage

```bash
XDEBUG_MODE=coverage ./vendor/bin/phpunit --coverage-text
```

## How the tests are structured

- All Feature tests use `RefreshDatabase`, so each test starts from an empty
  MySQL/SQLite database (full migrations run on every test).
- The `branches` migration auto-seeds a "Main Branch - Khartoum" — every
  test implicitly relies on `Branch::defaultId()` returning a real id.
- Fixtures are created inline with Eloquent (no factories). This is
  deliberate for v1 — explicit setup is easier to debug than magical
  factory chains.

## What each test covers

### `OrderCheckoutTest` (OrderController::store)

| Test | Asserts |
| --- | --- |
| `test_whatsapp_order_creates_order_returns_wa_link` | 201, `order_number`, correct totals, `whatsapp_url` starts with `https://wa.me/` |
| `test_cod_order_does_not_return_whatsapp_link` | 201, `whatsapp_url` is null, no delivery fee on pickup |
| `test_order_decrements_product_stock_and_writes_movement` | `products.stock -= qty`, `stock_movements` row with `type=out,reason=sale` |
| `test_order_creates_customer_when_phone_is_new` | `customers` row created with `total_orders=1` |
| `test_coupon_with_percent_discount_is_applied` | 10% off, coupon `used_count` increments, persisted on order |
| `test_free_shipping_coupon_zeroes_delivery_fee` | `delivery_fee=0`, total = subtotal |
| `test_inactive_coupon_is_ignored` | `discount_amount=0`, `coupon_code=null` |
| `test_redeeming_more_points_than_balance_clamps_to_balance` | clamped to balance, balance=0 after |
| `test_validation_fails_when_items_is_empty` | 422 + `items` field error |
| `test_validation_fails_when_payment_method_is_unknown` | 422 + `payment_method` field error |
| `test_inactive_product_cannot_be_ordered` | 404 (active scope excludes it) |

### `CouponValidationTest` (CouponController::validate)

| Test | Asserts |
| --- | --- |
| `test_valid_coupon_returns_discount_amount` | 200, returns `{code, discount}` |
| `test_code_is_case_insensitive` | lower-case input normalized |
| `test_unknown_code_returns_404` | 404 |
| `test_expired_coupon_returns_422` | arabic message |
| `test_exhausted_coupon_returns_422` | arabic message |
| `test_subtotal_below_minimum_returns_422` | arabic message |
| `test_first_order_segment_requires_zero_prior_orders` | targeting filter |
| `test_max_discount_caps_percent_coupons` | percentage capped by `max_discount` |
| `test_paused_coupon_returns_422` | `is_active=false` |
| `test_validation_fails_with_missing_fields` | 422 + `code,subtotal` errors |

### `AdminAuthTest` (AdminAuthController + permissions)

| Test | Asserts |
| --- | --- |
| `test_admin_can_login_with_seeded_credentials` | token returned, payload shape |
| `test_admin_login_with_wrong_password_returns_422` | validation error |
| `test_admin_login_with_unknown_email_returns_422` | validation error |
| `test_disabled_admin_cannot_login` | blocked when `is_active=false` |
| `test_login_records_employee_activity` | audit row |
| `test_me_endpoint_returns_authenticated_user` | round-trip |
| `test_me_endpoint_without_token_returns_401` | unauthenticated rejected |
| `test_logout_invalidates_token` | post-logout `me` → 401 |
| `test_driver_role_cannot_access_dashboard` | permission middleware blocks |
| `test_admin_can_access_dashboard` | full access |

## Writing new tests

1. Pick the controller under test.
2. Use the existing test as a template (`OrderCheckoutTest` for store-side,
   `AdminAuthTest` for admin side).
3. Use `RefreshDatabase` so you don't pollute the dev DB.
4. Don't mock — exercise the real Eloquent flow. Tests run fast enough on
   MySQL or SQLite.

### Test SQLite vs MySQL

`phpunit.xml` is configured for MySQL by default (matching production). To
switch to SQLite:

```xml
<!-- phpunit.xml -->
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

The CI pipeline (`backend.yml`) uses MySQL so production parity is checked.

## CI

GitHub Actions runs both PHP and JS pipelines on every push to `main`/`develop`:

- `.github/workflows/backend.yml` — `pint --test` + `phpunit`
- `.github/workflows/frontend.yml` — `npm run lint` + `tsc --noEmit` + `next build`

Both are required to pass before merging.

## Manual smoke test checklist

Before any release, exercise:

- [ ] `npm run dev` and `php artisan serve` boot cleanly
- [ ] Add to cart → checkout with WhatsApp → wa.me link opens correctly
- [ ] Add to cart → checkout with COD → success page
- [ ] Apply a `percent` coupon → see discount
- [ ] Apply a `free_shipping` coupon → see delivery = 0
- [ ] Login as admin → dashboard, products, orders pages load
- [ ] Open POS → cash session opens → sale posts → Z-report matches
- [ ] Logout from admin → `/admin/login` redirect happens
- [ ] Arabic ↔ English toggle in UI updates layout direction
- [ ] Mobile viewport (≤ 480px) — cart, checkout, admin login usable