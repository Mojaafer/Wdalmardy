<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Models\EmployeeActivity;
use Illuminate\Http\Request;

class DeliveryZoneAdminController extends Controller
{
    public function index()
    {
        $zones = DeliveryZone::orderBy('sort_order')->orderBy('id')->get();

        return response()->json([
            'data' => $zones->map(fn (DeliveryZone $z) => $this->serialize($z)),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $zone = DeliveryZone::create($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'zone.created',
            'أضاف منطقة توصيل "'.$zone->name_ar.'"',
            ['zone_id' => $zone->id],
        );

        return response()->json(['data' => $this->serialize($zone)], 201);
    }

    public function update(Request $request, DeliveryZone $zone)
    {
        $data = $this->validatedData($request);
        $zone->update($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'zone.updated',
            'عدل منطقة توصيل "'.$zone->name_ar.'"',
            ['zone_id' => $zone->id],
        );

        return response()->json(['data' => $this->serialize($zone->fresh())]);
    }

    public function destroy(Request $request, DeliveryZone $zone)
    {
        EmployeeActivity::log(
            (int) $request->user()->id,
            'zone.deleted',
            'حذف منطقة توصيل "'.$zone->name_ar.'"',
            ['zone_id' => $zone->id],
        );
        $zone->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name_ar' => 'required|string|max:120',
            'name_en' => 'nullable|string|max:120',
            'fee' => 'required|numeric|min:0',
            'estimated_minutes' => 'nullable|integer|min:1|max:1440',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
            'notes' => 'nullable|string|max:500',
        ]);
    }

    private function serialize(DeliveryZone $z): array
    {
        return [
            'id' => $z->id,
            'name_ar' => $z->name_ar,
            'name_en' => $z->name_en,
            'fee' => (float) $z->fee,
            'estimated_minutes' => (int) $z->estimated_minutes,
            'is_active' => (bool) $z->is_active,
            'sort_order' => (int) $z->sort_order,
            'notes' => $z->notes,
            'orders_count' => $z->orders()->count(),
        ];
    }
}
