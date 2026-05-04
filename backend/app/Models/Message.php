<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Message extends Model
{
    public const STATUSES = ['new', 'open', 'replied', 'closed'];

    public const SOURCES = ['contact_form', 'manual', 'whatsapp', 'order'];

    protected static function booted(): void
    {
        static::created(function (Message $message) {
            if ($message->source === 'manual') {
                return; // admin-created notes shouldn't notify the admin
            }
            AdminNotification::fire(
                type: 'message_new',
                title: 'رسالة جديدة من '.($message->name ?: 'عميل'),
                body: Str::limit($message->subject ?: $message->body, 80),
                payload: ['message_id' => $message->id, 'subject' => $message->subject],
                link: '/admin/messages?focus='.$message->id,
            );
        });
    }

    protected $fillable = [
        'subject',
        'name',
        'phone',
        'email',
        'body',
        'source',
        'status',
        'order_id',
        'assigned_to',
        'replied_at',
    ];

    protected $casts = [
        'replied_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(MessageReply::class)->orderBy('created_at');
    }
}
