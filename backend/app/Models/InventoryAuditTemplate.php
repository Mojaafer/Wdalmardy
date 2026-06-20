<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryAuditTemplate extends Model
{
    protected $fillable = [
        'name',
        'cadence',
        'scope',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
