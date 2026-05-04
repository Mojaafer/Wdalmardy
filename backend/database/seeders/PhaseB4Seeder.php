<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class PhaseB4Seeder extends Seeder
{
    public function run(): void
    {
        // brand
        Setting::set('store_name', 'ود المرضي ماركت', 'string', 'brand');
        Setting::set('store_tagline', 'سوبر ماركت — السودان', 'string', 'brand');
        Setting::set('store_email', 'info@wadalmardi.com', 'string', 'brand');
        Setting::set('store_phone', '+249123456789', 'string', 'brand');
        Setting::set('store_whatsapp', '249123456789', 'string', 'brand');
        Setting::set('store_address', 'الخرطوم - السودان', 'string', 'brand');
        Setting::set('currency_code', 'SDG', 'string', 'brand');
        Setting::set('currency_symbol', 'ج.س', 'string', 'brand');

        // delivery
        Setting::set('default_delivery_fee', 1500, 'integer', 'delivery');
        Setting::set('free_delivery_threshold', 0, 'integer', 'delivery'); // 0 = disabled
        Setting::set('low_stock_threshold', 10, 'integer', 'delivery');

        // payment
        Setting::set('payment_cod_enabled', true, 'boolean', 'payment');
        Setting::set('payment_bank_enabled', false, 'boolean', 'payment');
        Setting::set('payment_bank_details', '', 'text', 'payment');
        Setting::set('payment_bok_enabled', false, 'boolean', 'payment');
        Setting::set('payment_mokash_enabled', false, 'boolean', 'payment');

        // notifications
        Setting::set('notify_new_order', true, 'boolean', 'notifications');
        Setting::set('notify_low_stock', true, 'boolean', 'notifications');
        Setting::set('notify_new_message', true, 'boolean', 'notifications');

        // system
        Setting::set('maintenance_mode', false, 'boolean', 'general');
        Setting::set('maintenance_message', 'المتجر تحت الصيانة، نعود قريباً.', 'text', 'general');
    }
}
