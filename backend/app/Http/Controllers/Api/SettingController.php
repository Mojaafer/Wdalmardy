<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;

class SettingController extends Controller
{
    /**
     * Public-facing subset of settings used by the storefront.
     */
    public function public_index()
    {
        $all = Setting::all_keyed();

        $publicKeys = [
            'store_name', 'store_tagline', 'store_email', 'store_phone',
            'store_whatsapp', 'store_address', 'currency_code', 'currency_symbol',
            'maintenance_mode', 'maintenance_message',
            'free_delivery_threshold',
            'payment_cod_enabled', 'payment_bank_enabled', 'payment_bank_details',
            'payment_bok_enabled', 'payment_mokash_enabled',
            'hero_image',
        ];

        $public = [];
        foreach ($publicKeys as $k) {
            if (array_key_exists($k, $all)) {
                $public[$k] = $all[$k];
            }
        }

        return response()->json(['data' => $public]);
    }
}
