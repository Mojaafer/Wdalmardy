<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeActivity extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'description',
        'context',
        'ip_address',
        'user_agent',
        'occurred_at',
    ];

    protected $casts = [
        'context' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function log(int $userId, string $action, string $description, array $context = []): self
    {
        $request = request();

        return static::create([
            'user_id' => $userId,
            'action' => $action,
            'description' => $description,
            'context' => $context ?: null,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'occurred_at' => now(),
        ]);
    }
}
