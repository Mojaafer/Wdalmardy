<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use Auditable;

    protected $fillable = [
        'name_ar',
        'name_en',
        'code',
        'manager_name',
        'phone',
        'address',
        'city',
        'status',
        'is_main',
        'sort_order',
    ];

    protected $casts = [
        'is_main' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function productStocks(): HasMany
    {
        return $this->hasMany(BranchProductStock::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function posSales(): HasMany
    {
        return $this->hasMany(PosSale::class);
    }

    public static function defaultId(): ?int
    {
        return static::query()
            ->where('is_main', true)
            ->orderBy('id')
            ->value('id')
            ?? static::query()->orderBy('id')->value('id');
    }
}
