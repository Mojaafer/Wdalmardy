<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_otp_returns_code(): void
    {
        $res = $this->postJson('/api/auth/request-otp', [
            'phone' => '249123456789',
        ]);

        $res->assertOk()
            ->assertJsonStructure(['data' => ['otp', 'expires_in_minutes']]);
    }

    public function test_request_otp_creates_customer(): void
    {
        $this->postJson('/api/auth/request-otp', [
            'phone' => '249987654321',
        ]);

        $this->assertDatabaseHas('customers', ['phone' => '249987654321']);
    }

    public function test_verify_otp_returns_token(): void
    {
        $phone = '249111222333';
        $this->postJson('/api/auth/request-otp', ['phone' => $phone]);
        $customer = Customer::where('phone', $phone)->first();
        $code = $customer->otp_code;

        $res = $this->postJson('/api/auth/verify-otp', [
            'phone' => $phone,
            'code' => $code,
        ]);

        $res->assertOk()->assertJsonStructure(['data' => ['token', 'customer']]);
    }

    public function test_verify_otp_with_wrong_code_returns_422(): void
    {
        $phone = '249111222333';
        $this->postJson('/api/auth/request-otp', ['phone' => $phone]);

        $res = $this->postJson('/api/auth/verify-otp', [
            'phone' => $phone,
            'code' => '0000',
        ]);

        $res->assertStatus(422);
    }

    public function test_blocked_customer_cannot_login(): void
    {
        $customer = Customer::factory()->create(['is_blocked' => true]);

        $res = $this->postJson('/api/auth/request-otp', [
            'phone' => $customer->phone,
        ]);

        $res->assertStatus(422);
    }

    public function test_me_returns_authenticated_customer(): void
    {
        $customer = Customer::factory()->create();
        $token = $customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->getJson('/api/auth/me');

        $res->assertOk()->assertJsonPath('data.phone', $customer->phone);
    }

    public function test_me_without_token_returns_401(): void
    {
        $res = $this->getJson('/api/auth/me');
        $res->assertStatus(401);
    }

    public function test_logout_invalidates_token(): void
    {
        $customer = Customer::factory()->create();
        $token = $customer->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $customer->id]);

        // The PHP process keeps the auth guard's resolved user across HTTP
        // calls in a single test. Drop the cached guard so the next request
        // is forced to re-authenticate from the (now deleted) bearer token.
        auth()->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_update_profile(): void
    {
        $customer = Customer::factory()->create(['name' => 'Old Name']);
        $token = $customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->putJson('/api/auth/profile', [
            'name' => 'New Name',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'New Name',
        ]);
    }

    public function test_request_otp_validates_phone_required(): void
    {
        $res = $this->postJson('/api/auth/request-otp', []);
        $res->assertStatus(422);
    }
}
