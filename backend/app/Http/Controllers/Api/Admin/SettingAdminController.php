<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SettingAdminController extends Controller
{
    /**
     * Returns all settings grouped, plus the catalog of known keys with their types/groups.
     */
    public function index()
    {
        $rows = Setting::all();
        $byKey = [];
        foreach ($rows as $r) {
            $byKey[$r->key] = [
                'value' => Setting::cast($r->value, $r->type),
                'type' => $r->type,
                'group' => $r->group,
            ];
        }

        return response()->json([
            'data' => $byKey,
            'catalog' => $this->catalog(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|max:80',
            'settings.*.value' => 'nullable',
            'settings.*.type' => 'nullable|in:string,text,integer,boolean,json',
            'settings.*.group' => 'nullable|string|max:40',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['settings'] as $row) {
                Setting::set(
                    $row['key'],
                    $row['value'] ?? null,
                    $row['type'] ?? 'string',
                    $row['group'] ?? 'general',
                );
            }
        });

        Cache::forget('settings.all');

        return $this->index();
    }

    private function catalog(): array
    {
        // canonical list of keys that the admin UI is expected to surface
        return [
            // brand
            ['key' => 'store_name', 'type' => 'string', 'group' => 'brand', 'label' => 'اسم المتجر'],
            ['key' => 'store_tagline', 'type' => 'string', 'group' => 'brand', 'label' => 'الشعار/العبارة'],
            ['key' => 'store_email', 'type' => 'string', 'group' => 'brand', 'label' => 'البريد الإلكتروني'],
            ['key' => 'store_phone', 'type' => 'string', 'group' => 'brand', 'label' => 'هاتف المتجر'],
            ['key' => 'store_whatsapp', 'type' => 'string', 'group' => 'brand', 'label' => 'رقم واتساب الطلبات (مثال: 249123456789)'],
            ['key' => 'store_address', 'type' => 'string', 'group' => 'brand', 'label' => 'العنوان'],
            ['key' => 'currency_code', 'type' => 'string', 'group' => 'brand', 'label' => 'رمز العملة (ISO)'],
            ['key' => 'currency_symbol', 'type' => 'string', 'group' => 'brand', 'label' => 'رمز العملة المعروض'],
            ['key' => 'hero_image', 'type' => 'string', 'group' => 'brand', 'label' => 'صورة الهيرو (الرئيسية)'],
            // delivery
            ['key' => 'default_delivery_fee', 'type' => 'integer', 'group' => 'delivery', 'label' => 'رسوم التوصيل الافتراضية (ج.س)'],
            ['key' => 'free_delivery_threshold', 'type' => 'integer', 'group' => 'delivery', 'label' => 'الحد الأدنى للتوصيل المجاني (ج.س، 0 لإلغاء)'],
            ['key' => 'low_stock_threshold', 'type' => 'integer', 'group' => 'delivery', 'label' => 'حد تنبيه نفاد المخزون'],
            // payment
            ['key' => 'payment_cod_enabled', 'type' => 'boolean', 'group' => 'payment', 'label' => 'تفعيل الدفع عند الاستلام'],
            ['key' => 'payment_bank_enabled', 'type' => 'boolean', 'group' => 'payment', 'label' => 'تفعيل التحويل البنكي'],
            ['key' => 'payment_bank_details', 'type' => 'text', 'group' => 'payment', 'label' => 'تفاصيل الحساب البنكي'],
            ['key' => 'payment_bok_enabled', 'type' => 'boolean', 'group' => 'payment', 'label' => 'تفعيل بنكك (BOK)'],
            ['key' => 'payment_mokash_enabled', 'type' => 'boolean', 'group' => 'payment', 'label' => 'تفعيل محفظة موكاش'],
            // notifications
            ['key' => 'notify_new_order', 'type' => 'boolean', 'group' => 'notifications', 'label' => 'إشعار عند طلب جديد'],
            ['key' => 'notify_low_stock', 'type' => 'boolean', 'group' => 'notifications', 'label' => 'إشعار عند نفاد المخزون'],
            ['key' => 'notify_new_message', 'type' => 'boolean', 'group' => 'notifications', 'label' => 'إشعار عند رسالة جديدة'],
            // system
            ['key' => 'maintenance_mode', 'type' => 'boolean', 'group' => 'general', 'label' => 'وضع الصيانة'],
            ['key' => 'maintenance_message', 'type' => 'text', 'group' => 'general', 'label' => 'رسالة الصيانة'],
            // backups
            ['key' => 'backup_enabled', 'type' => 'boolean', 'group' => 'backup', 'label' => 'تفعيل النسخ الاحتياطي المجدول'],
            ['key' => 'backup_frequency', 'type' => 'string', 'group' => 'backup', 'label' => 'التكرار (daily / weekly / monthly)'],
            ['key' => 'backup_time', 'type' => 'string', 'group' => 'backup', 'label' => 'وقت التشغيل اليومي'],
            ['key' => 'backup_retention_days', 'type' => 'integer', 'group' => 'backup', 'label' => 'مدة الاحتفاظ بالأيام'],
            ['key' => 'backup_destination', 'type' => 'string', 'group' => 'backup', 'label' => 'الوجهة (local أو s3)'],
        ];
    }

    public function uploadHeroImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        $file = $request->file('image');
        $filename = 'hero_'.time().'.'.$file->extension();
        $file->storeAs('public/hero', $filename);

        $path = 'hero/'.$filename;
        Setting::set('hero_image', $path, 'string', 'brand');

        return response()->json([
            'data' => [
                'value' => $path,
                'type' => 'string',
                'group' => 'brand',
                'url' => config('app.url').'/storage/'.$path,
            ],
        ]);
    }

    public function deleteHeroImage()
    {
        $current = Setting::get('hero_image');
        if ($current) {
            Storage::disk('public')->delete($current);
            Setting::set('hero_image', null, 'string', 'brand');
        }

        return response()->json(['data' => ['ok' => true]]);
    }

    public function backup(Request $request)
    {
        $payload = $this->backupPayload();
        $filename = 'backup-'.now()->format('Ymd-His').'.json';

        if ($request->boolean('store')) {
            Storage::disk('local')->put('backups/'.$filename, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return response()->json([
                'data' => [
                    'filename' => $filename,
                    'path' => 'storage/app/backups/'.$filename,
                    'size' => Storage::disk('local')->size('backups/'.$filename),
                    'created_at' => now()->toIso8601String(),
                ],
            ]);
        }

        return response()->json($payload)
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    public function backups()
    {
        $files = collect(Storage::disk('local')->files('backups'))
            ->filter(fn ($path) => str_ends_with($path, '.json'))
            ->sortByDesc(fn ($path) => Storage::disk('local')->lastModified($path))
            ->values()
            ->map(fn ($path) => [
                'filename' => basename($path),
                'path' => 'storage/app/'.$path,
                'size' => Storage::disk('local')->size($path),
                'created_at' => date(DATE_ATOM, Storage::disk('local')->lastModified($path)),
            ]);

        return response()->json(['data' => $files]);
    }

    private function backupPayload(): array
    {
        return [
            'generated_at' => now()->toIso8601String(),
            'settings' => Setting::all(),
            'products_count' => DB::table('products')->count(),
            'orders_count' => DB::table('orders')->count(),
            'customers_count' => DB::table('customers')->count(),
            'invoices_count' => DB::table('invoices')->count(),
        ];
    }
}
