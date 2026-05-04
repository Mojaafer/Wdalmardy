<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminNotification extends Model
{
    protected $fillable = [
        'type', 'title', 'body', 'payload', 'link', 'user_id', 'read_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser(Builder $q, ?int $userId): Builder
    {
        // returns global notifications + ones targeted to this user
        return $q->where(function ($w) use ($userId) {
            $w->whereNull('user_id');
            if ($userId) {
                $w->orWhere('user_id', $userId);
            }
        });
    }

    public function scopeUnread(Builder $q): Builder
    {
        return $q->whereNull('read_at');
    }

    public static function fire(string $type, string $title, ?string $body = null, ?array $payload = null, ?string $link = null, ?int $userId = null): self
    {
        return static::create([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'payload' => $payload,
            'link' => $link,
            'user_id' => $userId,
        ]);
    }
}
