<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class JournalEntry extends Model
{
    protected $fillable = [
        'entry_number',
        'description',
        'date',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function nextNumber(?Carbon $for = null): string
    {
        $for ??= now();
        $prefix = 'JE-'.$for->format('ymd');

        return DB::transaction(function () use ($prefix) {
            $last = static::where('entry_number', 'like', $prefix.'-%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('entry_number');

            $next = 1;
            if ($last && preg_match('/-(\d+)$/', $last, $m)) {
                $next = ((int) $m[1]) + 1;
            }

            return sprintf('%s-%03d', $prefix, $next);
        });
    }
}
