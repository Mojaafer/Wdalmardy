<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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
        ];
    }

    public function backup()
    {
        // export DB-as-JSON (simple snapshot for MVP — not a SQL dump)
        $payload = [
            'generated_at' => now()->toIso8601String(),
            'settings' => Setting::all(),
            'products_count' => DB::table('products')->count(),
            'orders_count' => DB::table('orders')->count(),
            'customers_count' => DB::table('customers')->count(),
            'invoices_count' => DB::table('invoices')->count(),
        ];

        $filename = 'backup-'.now()->format('Ymd-His').'.json';

        return response()->json($payload)
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }
}
