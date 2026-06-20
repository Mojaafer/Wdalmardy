<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAuditSession extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'cadence',
        'status',
        'started_by',
        'closed_by',
        'started_at',
        'closed_at',
        'notes',
        'accuracy_rate',
        'total_variance',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'closed_at' => 'datetime',
        'accuracy_rate' => 'decimal:2',
        'total_variance' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryAuditItem::class, 'session_id');
    }
}
