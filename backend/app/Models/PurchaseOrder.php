<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class PurchaseOrder extends Model
{
    public const STATUSES = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];

    protected $fillable = [
        'po_number',
        'supplier_id',
        'status',
        'subtotal',
        'tax_amount',
        'total',
        'notes',
        'created_by',
        'received_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'received_at' => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function nextNumber(?Carbon $for = null): string
    {
        $for ??= now();
        $prefix = 'PO-'.$for->format('ymd');

        return DB::transaction(function () use ($prefix) {
            $last = static::where('po_number', 'like', $prefix.'-%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('po_number');

            $next = 1;
            if ($last && preg_match('/-(\d+)$/', $last, $m)) {
                $next = ((int) $m[1]) + 1;
            }

            return sprintf('%s-%03d', $prefix, $next);
        });
    }
}
