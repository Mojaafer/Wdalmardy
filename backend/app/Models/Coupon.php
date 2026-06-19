<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use Auditable;

    protected $fillable = [
        'code',
        'type',
        'value',
        'max_discount',
        'min_order_amount',
        'max_uses',
        'used_count',
        'max_uses_per_customer',
        'applies_to',
        'customer_segment',
        'geo_regions',
        'product_ids',
        'seasonal_tag',
        'vip_only',
        'starts_at',
        'ends_at',
        'is_active',
        'created_by_user_id',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'is_active' => 'boolean',
        'vip_only' => 'boolean',
        'geo_regions' => 'array',
        'product_ids' => 'array',
        'used_count' => 'integer',
        'max_uses' => 'integer',
        'max_uses_per_customer' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function status(): string
    {
        if (! $this->is_active) {
            return 'paused';
        }
        $now = now();
        if ($this->starts_at && $this->starts_at->gt($now)) {
            return 'scheduled';
        }
        if ($this->ends_at && $this->ends_at->lt($now)) {
            return 'expired';
        }
        if ($this->max_uses && $this->used_count >= $this->max_uses) {
            return 'exhausted';
        }

        return 'active';
    }

    public function isUsable(float $subtotal): bool
    {
        return $this->status() === 'active' && $subtotal >= (float) $this->min_order_amount;
    }

    public function matchesTarget(?Customer $customer = null, ?string $region = null, array $productIds = []): bool
    {
        if ($this->vip_only && (! $customer || (int) $customer->lifetime_points < 10000)) {
            return false;
        }

        return match ($this->customer_segment ?? 'all') {
            'first_order' => $customer ? (int) $customer->total_orders === 0 : true,
            'returning' => $customer ? (int) $customer->total_orders > 0 : false,
            'region' => empty($this->geo_regions) || ($region && in_array($region, $this->geo_regions, true)),
            'seasonal' => ! empty($this->seasonal_tag),
            'product' => empty($this->product_ids) || count(array_intersect($this->product_ids, $productIds)) > 0,
            'vip' => $customer && (int) $customer->lifetime_points >= 10000,
            default => true,
        };
    }

    public function calculateDiscount(float $subtotal, float $shipping = 0): float
    {
        if (! $this->isUsable($subtotal)) {
            return 0;
        }
        $discount = match ($this->type) {
            'percent' => $subtotal * ((float) $this->value / 100),
            'fixed' => (float) $this->value,
            'free_shipping' => $shipping,
            default => 0,
        };
        if ($this->max_discount && $discount > (float) $this->max_discount) {
            $discount = (float) $this->max_discount;
        }

        return round($discount, 2);
    }
}
