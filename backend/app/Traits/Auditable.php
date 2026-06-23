<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    protected static array $auditHidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    public static function bootAuditable()
    {
        static::created(function (Model $model) {
            $model->logAudit('created');
        });

        static::updated(function (Model $model) {
            $model->logAudit('updated');
        });

        static::deleted(function (Model $model) {
            $model->logAudit('deleted');
        });
    }

    protected function logAudit(string $event)
    {
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return;
        }

        $oldValues = [];
        $newValues = [];

        if ($event === 'updated') {
            $oldValues = array_intersect_key($this->getOriginal(), $this->getDirty());
            $newValues = $this->getDirty();
        } elseif ($event === 'created') {
            $newValues = $this->getAttributes();
        } elseif ($event === 'deleted') {
            $oldValues = $this->getAttributes();
        }

        try {
            $userId = auth()->id();
        } catch (\Throwable) {
            $userId = null;
        }

        AuditLog::create([
            'user_id' => $userId,
            'event' => $event,
            'auditable_type' => static::class,
            'auditable_id' => $this->getKey(),
            'old_values' => empty($oldValues) ? null : $this->filterAuditValues($oldValues),
            'new_values' => empty($newValues) ? null : $this->filterAuditValues($newValues),
            'url' => request()->fullUrl(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    protected function filterAuditValues(array $values): array
    {
        return collect($values)
            ->reject(fn ($value, $key) => in_array($key, static::$auditHidden, true))
            ->all();
    }
}
