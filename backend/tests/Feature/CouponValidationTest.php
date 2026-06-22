<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_coupon_returns_discount_amount(): void
    {
        Coupon::create([
            'code' => 'WELCOME20',
            'type' => 'percent',
            'value' => 20,
            'min_order_amount' => 5000,
            'is_active' => true,
        ]);

        $res = $this->postJson('/api/coupons/validate', [
            'code' => 'WELCOME20',
            'subtotal' => 10000,
            'shipping' => 1500,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.code', 'WELCOME20')
            ->assertJsonPath('data.discount', 2000);
    }

    public function test_code_is_case_insensitive(): void
    {
        Coupon::create([
            'code' => 'FALLBACK',
            'type' => 'fixed',
            'value' => 1000,
            'min_order_amount' => 0,
            'is_active' => true,
        ]);

        $res = $this->postJson('/api/coupons/validate', [
            'code' => 'fallback',
            'subtotal' => 5000,
            'shipping' => 0,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.code', 'FALLBACK')
            ->assertJsonPath('data.discount', 1000);
    }

    public function test_unknown_code_returns_404(): void
    {
        $this->postJson('/api/coupons/validate', [
            'code' => 'NOPE',
            'subtotal' => 1000,
            'shipping' => 0,
        ])->assertStatus(404);
    }

    public function test_expired_coupon_returns_422(): void
    {
        Coupon::create([
            'code' => 'OLDSCHOOL',
            'type' => 'percent',
            'value' => 50,
            'min_order_amount' => 0,
            'is_active' => true,
            'starts_at' => now()->subDays(30),
            'ends_at' => now()->subDay(),
        ]);

        $this->postJson('/api/coupons/validate', [
            'code' => 'OLDSCHOOL',
            'subtotal' => 10000,
            'shipping' => 0,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'انتهت صلاحية الكوبون.');
    }

    public function test_exhausted_coupon_returns_422(): void
    {
        Coupon::create([
            'code' => 'GONE',
            'type' => 'percent',
            'value' => 50,
            'min_order_amount' => 0,
            'is_active' => true,
            'max_uses' => 10,
            'used_count' => 10,
        ]);

        $this->postJson('/api/coupons/validate', [
            'code' => 'GONE',
            'subtotal' => 10000,
            'shipping' => 0,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'استُنفد عدد مرات استخدام الكوبون.');
    }

    public function test_subtotal_below_minimum_returns_422(): void
    {
        Coupon::create([
            'code' => 'BIGONLY',
            'type' => 'percent',
            'value' => 10,
            'min_order_amount' => 50000,
            'is_active' => true,
        ]);

        $this->postJson('/api/coupons/validate', [
            'code' => 'BIGONLY',
            'subtotal' => 4999,
            'shipping' => 0,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'الحد الأدنى للطلب 50,000 ج.س لاستخدام هذا الكوبون.');
    }

    public function test_first_order_segment_requires_zero_prior_orders(): void
    {
        $existing = Customer::create([
            'phone' => '+249900000000',
            'name' => 'Returning',
            'total_orders' => 3,
        ]);

        Coupon::create([
            'code' => 'NEWONLY',
            'type' => 'percent',
            'value' => 15,
            'min_order_amount' => 1000,
            'is_active' => true,
            'customer_segment' => 'first_order',
        ]);

        $this->postJson('/api/coupons/validate', [
            'code' => 'NEWONLY',
            'subtotal' => 5000,
            'shipping' => 0,
            'customer_phone' => $existing->phone,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'هذا الكوبون لا ينطبق على بيانات هذا الطلب.');
    }

    public function test_max_discount_caps_percent_coupons(): void
    {
        Coupon::create([
            'code' => 'CAP50',
            'type' => 'percent',
            'value' => 50, // 50% of 100,000 = 50,000
            'max_discount' => 5000,
            'min_order_amount' => 0,
            'is_active' => true,
        ]);

        $res = $this->postJson('/api/coupons/validate', [
            'code' => 'CAP50',
            'subtotal' => 100000,
            'shipping' => 0,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.discount', 5000);
    }

    public function test_paused_coupon_returns_422(): void
    {
        Coupon::create([
            'code' => 'PAUSED',
            'type' => 'fixed',
            'value' => 500,
            'min_order_amount' => 0,
            'is_active' => false,
        ]);

        $this->postJson('/api/coupons/validate', [
            'code' => 'PAUSED',
            'subtotal' => 5000,
            'shipping' => 0,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'الكوبون غير مفعّل.');
    }

    public function test_validation_fails_with_missing_fields(): void
    {
        $this->postJson('/api/coupons/validate', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['code', 'subtotal']);
    }
}
