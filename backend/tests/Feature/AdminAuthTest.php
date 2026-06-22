<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AdminSeeder::class);
    }

    public function test_admin_can_login_with_seeded_credentials(): void
    {
        $res = $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ]);

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user' => ['id', 'name', 'email', 'roles', 'permissions'],
                ],
            ]);

        $token = $res->json('data.token');
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function test_admin_login_with_wrong_password_returns_422(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'wrong-password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_login_with_unknown_email_returns_422(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'ghost@example.com',
            'password' => 'whatever',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_disabled_admin_cannot_login(): void
    {
        User::where('email', 'admin@wadalmardi.com')
            ->update(['is_active' => false]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_records_employee_activity(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ])->assertOk();

        $user = User::where('email', 'admin@wadalmardi.com')->first();

        $this->assertDatabaseHas('employee_activities', [
            'user_id' => $user->id,
            'action' => 'auth.login',
        ]);
    }

    public function test_me_endpoint_returns_authenticated_user(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ])->json('data.token');

        $this->getJson('/api/admin/me', [
            'Authorization' => "Bearer {$token}",
        ])
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@wadalmardi.com')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_me_endpoint_without_token_returns_401(): void
    {
        $this->getJson('/api/admin/me')
            ->assertStatus(401);
    }

    public function test_logout_invalidates_token(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ])->json('data.token');

        $this->postJson('/api/admin/logout', [], [
            'Authorization' => "Bearer {$token}",
        ])->assertOk();

        // The PHP process keeps the auth guard's resolved user across HTTP
        // calls in a single test. Drop the cached guard so the next request
        // is forced to re-authenticate from the (now deleted) bearer token.
        auth()->forgetGuards();

        $this->getJson('/api/admin/me', [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(401);
    }

    public function test_driver_role_cannot_access_dashboard(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'driver@wadalmardi.com',
            'password' => 'password',
        ])->json('data.token');

        $this->getJson('/api/admin/dashboard', [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(403);
    }

    public function test_admin_can_access_dashboard(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@wadalmardi.com',
            'password' => 'password',
        ])->json('data.token');

        $this->getJson('/api/admin/dashboard', [
            'Authorization' => "Bearer {$token}",
        ])->assertOk();
    }
}
