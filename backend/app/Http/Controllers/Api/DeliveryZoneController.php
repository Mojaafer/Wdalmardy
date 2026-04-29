<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;

class DeliveryZoneController extends Controller
{
    public function index()
    {
        $zones = DeliveryZone::active()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name_ar', 'name_en', 'fee', 'estimated_minutes']);

        return response()->json([
            'data' => $zones->map(fn ($z) => [
                'id' => $z->id,
                'name_ar' => $z->name_ar,
                'name_en' => $z->name_en,
                'fee' => (float) $z->fee,
                'estimated_minutes' => (int) $z->estimated_minutes,
            ]),
        ]);
    }
}
