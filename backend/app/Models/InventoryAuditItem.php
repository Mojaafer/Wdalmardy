<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAuditItem extends Model
{
    protected $fillable = [
        'session_id',
        'product_id',
        'expected_qty',
        'counted_qty',
        'variance',
        'status',
        'notes',
    ];

    protected $casts = [
        'expected_qty' => 'integer',
        'counted_qty' => 'integer',
        'variance' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(InventoryAuditSession::class, 'session_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
