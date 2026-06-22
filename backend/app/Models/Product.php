<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use Auditable, HasFactory;

    protected $fillable = [
        'category_id',
        'slug',
        'barcode',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'image',
        'price',
        'compare_at_price',
        'unit_ar',
        'unit_en',
        'stock',
        'is_featured',
        'is_active',
        'sort_order',
        'rating',
        'reviews_count',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'rating' => 'decimal:2',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'stock' => 'integer',
        'reviews_count' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function branchStocks(): HasMany
    {
        return $this->hasMany(BranchProductStock::class);
    }

    /**
     * Available stock for a specific branch (the per-branch source of truth),
     * or the aggregate products.stock when no branch is given.
     */
    public function stockForBranch(?int $branchId = null): int
    {
        if (! $branchId) {
            return (int) $this->stock;
        }

        $row = $this->relationLoaded('branchStocks')
            ? $this->branchStocks->firstWhere('branch_id', $branchId)
            : BranchProductStock::where('product_id', $this->id)->where('branch_id', $branchId)->first();

        return $row ? (int) $row->stock : 0;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function imageUrl(): ?string
    {
        if (! $this->image) {
            return null;
        }
        if (preg_match('/^https?:\/\//', $this->image)) {
            return $this->image;
        }

        $base = rtrim(config('app.url'), '/');
        $base = str_replace('http://', 'https://', $base);

        return $base.'/storage/'.ltrim($this->image, '/');
    }
}
