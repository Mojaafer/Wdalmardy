<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;
    private Customer $otherCustomer;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::factory()->create();
        $this->otherCustomer = Customer::factory()->create();
        $this->product = Product::factory()->create();
    }

    public function test_public_can_list_approved_reviews(): void
    {
        Review::create([
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'rating' => 5,
            'comment' => 'Great!',
            'is_approved' => true,
        ]);
        Review::create([
            'product_id' => $this->product->id,
            'customer_id' => $this->otherCustomer->id,
            'rating' => 2,
            'comment' => 'Not good',
            'is_approved' => false,
        ]);

        $res = $this->getJson("/api/products/{$this->product->id}/reviews");

        $res->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_authenticated_customer_can_submit_review(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 4,
            'comment' => 'Nice product',
        ]);

        $res->assertCreated();
        $this->assertDatabaseHas('reviews', [
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'rating' => 4,
        ]);
    }

    public function test_duplicate_review_returns_422(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 4,
        ])->assertCreated();

        $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 3,
        ])->assertStatus(422);
    }

    public function test_rating_required(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $res = $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'comment' => 'No rating',
        ]);

        $res->assertStatus(422);
    }

    public function test_rating_must_be_1_to_5(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 6,
        ])->assertStatus(422);

        $this->withToken($token)->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 0,
        ])->assertStatus(422);
    }

    public function test_unauthenticated_cannot_submit_review(): void
    {
        $res = $this->postJson("/api/auth/products/{$this->product->id}/reviews", [
            'rating' => 4,
        ]);

        $res->assertStatus(401);
    }
}
