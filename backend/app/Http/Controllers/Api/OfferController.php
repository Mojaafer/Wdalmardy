<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use Illuminate\Http\Request;

class OfferController extends Controller
{
    public function active(Request $request)
    {
        $offers = Offer::where('is_active', true)
            ->where(function ($q) {
                $now = now();
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) {
                $now = now();
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            })
            ->orderByDesc('priority')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $offers->map(fn (Offer $o) => [
                'id' => $o->id,
                'type' => $o->type,
                'title' => $o->title,
                'title_en' => $o->title_en,
                'description' => $o->description,
                'description_en' => $o->description_en,
                'discount_value' => (float) $o->discount_value,
                'discount_unit' => $o->discount_unit,
                'banner_image' => $o->banner_image,
                'banner_link' => $o->banner_link ?? '/ar/store',
                'ends_at' => $o->ends_at?->toIso8601String(),
            ]),
        ]);
    }
}
