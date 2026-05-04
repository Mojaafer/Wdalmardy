<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group'];

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('settings.all'));
        static::deleted(fn () => Cache::forget('settings.all'));
    }

    public static function all_keyed(): array
    {
        return Cache::remember('settings.all', 300, function () {
            return static::query()->get()->mapWithKeys(function ($s) {
                return [$s->key => static::cast($s->value, $s->type)];
            })->all();
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::all_keyed()[$key] ?? $default;
    }

    public static function set(string $key, mixed $value, string $type = 'string', string $group = 'general'): self
    {
        $row = static::firstOrNew(['key' => $key]);
        $row->type = $type;
        $row->group = $group;
        $row->value = match ($type) {
            'json' => is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE),
            'boolean' => $value ? '1' : '0',
            default => $value === null ? null : (string) $value,
        };
        $row->save();

        return $row;
    }

    public static function cast(?string $raw, string $type): mixed
    {
        if ($raw === null) {
            return null;
        }

        return match ($type) {
            'integer' => (int) $raw,
            'boolean' => in_array(strtolower($raw), ['1', 'true', 'yes', 'on'], true),
            'json' => json_decode($raw, true),
            default => $raw,
        };
    }
}
