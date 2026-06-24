<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;
    private Product $product;
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::factory()->create();
        $this->product = Product::factory()->create(['price' => 100, 'stock' => 10]);
        $this->order = Order::create([
            'order_number' => 'ORD-TEST-001',
            'customer_id' => $this->customer->id,
            'customer_name' => 'Test',
            'customer_phone' => '249123456789',
            'status' => 'new',
            'subtotal' => 100,
            'total' => 100,
            'delivery_fee' => 0,
            'payment_method' => 'cod',
            'delivery_method' => 'pickup',
        ]);
    }

    public function test_customer_can_cancel_new_order(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->postJson("/api/auth/orders/{$this->order->id}/cancel");

        $res->assertOk();
        $this->assertDatabaseHas('orders', [
            'id' => $this->order->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_cannot_cancel_non_new_order(): void
    {
        $this->order->update(['status' => 'preparing']);
        $token = $this->customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->postJson("/api/auth/orders/{$this->order->id}/cancel");

        $res->assertStatus(422);
    }

    public function test_unauthenticated_cannot_cancel(): void
    {
        $res = $this->postJson("/api/auth/orders/{$this->order->id}/cancel");

        $res->assertStatus(401);
    }

    public function test_cannot_cancel_another_customers_order(): void
    {
        $other = Customer::factory()->create();
        $token = $other->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->postJson("/api/auth/orders/{$this->order->id}/cancel");

        $res->assertStatus(404);
    }
}
