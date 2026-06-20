<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    use Auditable;

    protected $fillable = [
        'type',
        'title',
        'title_en',
        'description',
        'description_en',
        'discount_value',
        'discount_unit',
        'max_discount',
        'scope',
        'scope_id',
        'banner_image',
        'banner_link',
        'starts_at',
        'ends_at',
        'is_active',
        'priority',
        'created_by_user_id',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'is_active' => 'boolean',
        'priority' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function isLive(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        $now = now();
        if ($this->starts_at && $this->starts_at->gt($now)) {
            return false;
        }
        if ($this->ends_at && $this->ends_at->lt($now)) {
            return false;
        }

        return true;
    }

    public function bannerImageUrl(): ?string
    {
        if (! $this->banner_image) {
            return null;
        }
        if (preg_match('/^https?:\/\//', $this->banner_image)) {
            return $this->banner_image;
        }

        $base = rtrim(config('app.url'), '/');
        $base = str_replace('http://', 'https://', $base);

        return $base.'/storage/'.ltrim($this->banner_image, '/');
    }

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

        return 'active';
    }
}
