<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class PosSession extends Model
{
    public const STATUSES = ['open', 'closed'];

    protected $fillable = [
        'register',
        'opened_by',
        'closed_by',
        'status',
        'opening_cash',
        'closing_cash_expected',
        'closing_cash_counted',
        'variance',
        'notes',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opening_cash' => 'decimal:2',
        'closing_cash_expected' => 'decimal:2',
        'closing_cash_counted' => 'decimal:2',
        'variance' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'open',
        'register' => 'main',
    ];

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(PosSale::class, 'session_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Cash drawer expected = opening_cash + sum(amount_paid - change_given) for cash sales.
     */
    public function expectedCash(): float
    {
        $cashIn = (float) $this->sales()
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum(DB::raw('amount_paid - change_given'));

        return (float) $this->opening_cash + $cashIn;
    }
}
