<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\DeliveryZone;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected Category $category;

    protected Product $product;

    protected DeliveryZone $zone;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        // Branches table is seeded by its migration; default branch exists.
        $this->branch = Branch::firstOrFail();
        $this->assertNotNull(Branch::defaultId(), 'Default branch should be seeded by the branches migration');

        $this->category = Category::create([
            'slug' => 'rice',
            'name_ar' => 'أرز',
            'name_en' => 'Rice',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'slug' => 'rice-5kg',
            'name_ar' => 'أرز 5 كجم',
            'name_en' => 'Rice 5kg',
            'price' => 25000,
            'stock' => 100,
            'is_active' => true,
            'is_featured' => false,
        ]);

        // StockMovement::record keeps products.stock as the SUM of per-branch
        // stocks, so a fresh branch row must be seeded with the test stock
        // before ordering can subtract from it.
        BranchProductStock::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 0,
            'low_stock_threshold' => 10,
        ]);

        $this->zone = DeliveryZone::create([
            'name_ar' => 'الخرطوم',
            'name_en' => 'Khartoum',
            'fee' => 1500,
            'estimated_minutes' => 60,
            'is_active' => true,
        ]);
    }

    public function test_whatsapp_order_creates_order_returns_wa_link(): void
    {
        $payload = [
            'customer_name' => 'محمد أحمد',
            'customer_phone' => '+249912345678',
            'delivery_method' => 'delivery',
            'payment_method' => 'whatsapp',
            'delivery_zone_id' => $this->zone->id,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ];

        $res = $this->postJson('/api/orders', $payload);

        $res->assertCreated()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonStructure([
                'data' => [
                    'order_number',
                    'subtotal',
                    'delivery_fee',
                    'total',
                    'whatsapp_url',
                ],
            ]);

        $wa = $res->json('data.whatsapp_url');
        $this->assertNotNull($wa);
        $this->assertStringStartsWith('https://wa.me/', $wa);

        // Subtotal 2 × 25,000 = 50,000 + delivery 1,500 = 51,500
        $this->assertEquals(50000.0, (float) $res->json('data.subtotal'));
        $this->assertEquals(1500.0, (float) $res->json('data.delivery_fee'));
        $this->assertEquals(51500.0, (float) $res->json('data.total'));
    }

    public function test_cod_order_does_not_return_whatsapp_link(): void
    {
        $payload = [
            'customer_name' => 'سارة',
            'customer_phone' => '+249912345679',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
        ];

        $res = $this->postJson('/api/orders', $payload);

        $res->assertCreated();
        $this->assertNull($res->json('data.whatsapp_url'));
        // Pickup = no delivery fee
        $this->assertEquals(0.0, (float) $res->json('data.delivery_fee'));
    }

    public function test_order_decrements_product_stock_and_writes_movement(): void
    {
        $initialStock = $this->product->stock;

        $this->postJson('/api/orders', [
            'customer_name' => 'علي',
            'customer_phone' => '+249900000001',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 3],
            ],
        ])->assertCreated();

        $this->product->refresh();
        $this->assertEquals($initialStock - 3, $this->product->stock);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'type' => 'out',
            'reason' => 'sale',
            'quantity' => -3,
            'reference_type' => 'order',
        ]);
    }

    public function test_order_creates_customer_when_phone_is_new(): void
    {
        $this->assertDatabaseMissing('customers', ['phone' => '+249911111111']);

        $this->postJson('/api/orders', [
            'customer_name' => 'عميل جديد',
            'customer_phone' => '+249911111111',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('customers', [
            'phone' => '+249911111111',
            'name' => 'عميل جديد',
            'total_orders' => 1,
        ]);
    }

    public function test_coupon_with_percent_discount_is_applied(): void
    {
        $coupon = Coupon::create([
            'code' => 'SAVE10',
            'type' => 'percent',
            'value' => 10,
            'min_order_amount' => 10000,
            'is_active' => true,
            'max_uses' => 100,
            'used_count' => 0,
        ]);

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249922222222',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'coupon_code' => 'save10', // lowercase → uppercased by server
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2], // 50,000
            ],
        ]);

        $res->assertCreated();
        $this->assertEquals(5000.0, (float) $res->json('data.discount_amount'));
        $this->assertEquals(45000.0, (float) $res->json('data.total'));

        $coupon->refresh();
        $this->assertEquals(1, $coupon->used_count);
        $this->assertDatabaseHas('orders', [
            'coupon_code' => 'SAVE10',
            'discount_amount' => 5000,
        ]);
    }

    public function test_free_shipping_coupon_zeroes_delivery_fee(): void
    {
        Coupon::create([
            'code' => 'FREESHIP',
            'type' => 'free_shipping',
            'value' => 0,
            'min_order_amount' => 1000,
            'is_active' => true,
        ]);

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249933333333',
            'delivery_method' => 'delivery',
            'payment_method' => 'cod',
            'delivery_zone_id' => $this->zone->id,
            'coupon_code' => 'FREESHIP',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
        ]);

        $res->assertCreated();
        $this->assertEquals(0.0, (float) $res->json('data.delivery_fee'));
        $this->assertEquals(25000.0, (float) $res->json('data.total'));
    }

    public function test_inactive_coupon_is_ignored(): void
    {
        Coupon::create([
            'code' => 'OFF',
            'type' => 'percent',
            'value' => 50,
            'min_order_amount' => 0,
            'is_active' => false,
        ]);

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249944444444',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'coupon_code' => 'OFF',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);

        $res->assertCreated();
        $this->assertEquals(0.0, (float) $res->json('data.discount_amount'));
        $this->assertNull($res->json('data.coupon_code'));
    }

    public function test_redeeming_more_points_than_balance_clamps_to_balance(): void
    {
        $customer = Customer::create([
            'phone' => '+249955555555',
            'name' => 'موفّر',
            'loyalty_points' => 100,
            'lifetime_points' => 5000,
        ]);

        // LOYALTY_REDEEM_VALUE = 10, REWARD_CAP_PCT = 0.5
        // Subtotal 50,000 → cap is 25,000 / 10 = 2,500 points
        // balance 100 → effectively clamped to 100
        $res = $this->postJson('/api/orders', [
            'customer_name' => 'موفّر',
            'customer_phone' => '+249955555555',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'redeem_points' => 9999,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);

        $res->assertCreated();
        $this->assertEquals(100, (int) $res->json('data.points_redeemed'));
        $this->assertEquals(1000.0, (float) $res->json('data.points_discount'));

        $customer->refresh();
        $this->assertEquals(0, $customer->loyalty_points, 'Points should be fully consumed');
    }

    public function test_validation_fails_when_items_is_empty(): void
    {
        $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249966666666',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'items' => [],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }

    public function test_validation_fails_when_payment_method_is_unknown(): void
    {
        $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249977777777',
            'delivery_method' => 'pickup',
            'payment_method' => 'bitcoin',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method']);
    }

    public function test_inactive_product_cannot_be_ordered(): void
    {
        $inactive = Product::create([
            'category_id' => $this->category->id,
            'slug' => 'retired',
            'name_ar' => 'مُعتزل',
            'name_en' => 'Retired',
            'price' => 1000,
            'stock' => 50,
            'is_active' => false,
        ]);

        $this->postJson('/api/orders', [
            'customer_name' => 'محمد',
            'customer_phone' => '+249988888888',
            'delivery_method' => 'pickup',
            'payment_method' => 'cod',
            'items' => [
                ['product_id' => $inactive->id, 'quantity' => 1],
            ],
        ])->assertStatus(404); // active() scope excludes it → findOrFail throws
    }
}
