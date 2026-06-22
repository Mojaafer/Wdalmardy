<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use Auditable;

    public function logoUrl(): ?string
    {
        if (!$this->logo) return null;
        if (str_starts_with($this->logo, 'http')) return $this->logo;
        return config('app.url') . '/storage/' . $this->logo;
    }

    protected $fillable = [
        'name',
        'contact_person',
        'business_type',
        'email',
        'phone',
        'address',
        'tax_number',
        'logo',
        'registered_at',
        'status',
        'performance_rating',
        'total_purchases',
        'current_balance',
        'orders_count',
        'last_order_at',
        'notes',
    ];

    protected $casts = [
        'registered_at' => 'date',
        'last_order_at' => 'date',
        'performance_rating' => 'decimal:1',
        'total_purchases' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'orders_count' => 'integer',
    ];
}
