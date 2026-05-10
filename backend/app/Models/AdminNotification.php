<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function reads(): HasMany
    {
        return $this->hasMany(AdminNotificationRead::class, 'notification_id');
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

    public function scopeUnreadFor(Builder $q, ?int $userId): Builder
    {
        // a notification is unread for $userId iff there is no row in admin_notification_reads
        // for (notification_id, user_id). Works for both global and user-scoped notifications,
        // because read state is tracked per-user.
        return $q->whereDoesntHave('reads', function ($w) use ($userId) {
            $w->where('user_id', $userId);
        });
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

    /**
     * Whether the current ($userId) admin can see this notification at all.
     */
    public function isVisibleTo(?int $userId): bool
    {
        return $this->user_id === null || $this->user_id === $userId;
    }

    /**
     * Whether the current ($userId) admin owns this notification (i.e. it was scoped
     * specifically to them — not a global one).
     */
    public function isOwnedBy(?int $userId): bool
    {
        return $userId !== null && $this->user_id === $userId;
    }
}
