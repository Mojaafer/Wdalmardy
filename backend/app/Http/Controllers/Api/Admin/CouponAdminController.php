<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\EmployeeActivity;
use Illuminate\Http\Request;

class CouponAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Coupon::query()->orderByDesc('id');

        if ($q = $request->string('q')->toString()) {
            $query->where('code', 'like', "%$q%");
        }

        $coupons = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $coupons->getCollection()->map(fn (Coupon $c) => $this->serialize($c)),
            'meta' => [
                'total' => $coupons->total(),
                'per_page' => $coupons->perPage(),
                'current_page' => $coupons->currentPage(),
                'last_page' => $coupons->lastPage(),
            ],
            'stats' => $this->stats(),
        ]);
    }

    public function stats(): array
    {
        $all = Coupon::all();
        $by = fn (string $s) => $all->filter(fn ($c) => $c->status() === $s)->count();

        return [
            'total' => $all->count(),
            'active' => $by('active'),
            'expired' => $by('expired'),
            'exhausted' => $by('exhausted'),
            'targeted' => $all->filter(fn ($c) => ($c->customer_segment ?? 'all') !== 'all' || $c->vip_only)->count(),
            'top_coupons' => $all->sortByDesc('used_count')->take(5)->values()->map(fn ($c) => [
                'code' => $c->code,
                'used_count' => (int) $c->used_count,
                'status' => $c->status(),
            ]),
        ];
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['code'] = strtoupper($data['code']);
        $data['created_by_user_id'] = $request->user()?->id;
        $coupon = Coupon::create($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'coupon.created',
            'أنشأ كوبون "'.$coupon->code.'"',
            ['coupon_id' => $coupon->id],
        );

        return response()->json(['data' => $this->serialize($coupon)], 201);
    }

    public function update(Request $request, Coupon $coupon)
    {
        $data = $this->validatedData($request, $coupon->id);
        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }
        $coupon->update($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'coupon.updated',
            'عدّل كوبون "'.$coupon->code.'"',
            ['coupon_id' => $coupon->id],
        );

        return response()->json(['data' => $this->serialize($coupon->fresh())]);
    }

    public function destroy(Request $request, Coupon $coupon)
    {
        EmployeeActivity::log(
            (int) $request->user()->id,
            'coupon.deleted',
            'حذف كوبون "'.$coupon->code.'"',
            ['coupon_id' => $coupon->id],
        );
        $coupon->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $rules = [
            'code' => 'required|string|max:60|regex:/^[A-Za-z0-9_-]+$/',
            'type' => 'required|in:percent,fixed,free_shipping',
            'value' => 'required|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'max_uses_per_customer' => 'nullable|integer|min:1',
            'applies_to' => 'sometimes|in:all,new_customers',
            'customer_segment' => 'sometimes|in:all,first_order,returning,region,seasonal,product,vip',
            'geo_regions' => 'nullable|array',
            'geo_regions.*' => 'string|max:80',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer|exists:products,id',
            'seasonal_tag' => 'nullable|string|max:80',
            'vip_only' => 'sometimes|boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_active' => 'sometimes|boolean',
        ];

        $rules['code'] .= '|unique:coupons,code'.($ignoreId ? ','.$ignoreId : '');

        return $request->validate($rules);
    }

    private function serialize(Coupon $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'type' => $c->type,
            'value' => (float) $c->value,
            'max_discount' => $c->max_discount ? (float) $c->max_discount : null,
            'min_order_amount' => (float) $c->min_order_amount,
            'max_uses' => $c->max_uses,
            'used_count' => (int) $c->used_count,
            'max_uses_per_customer' => $c->max_uses_per_customer,
            'applies_to' => $c->applies_to,
            'customer_segment' => $c->customer_segment,
            'geo_regions' => $c->geo_regions ?? [],
            'product_ids' => $c->product_ids ?? [],
            'seasonal_tag' => $c->seasonal_tag,
            'vip_only' => (bool) $c->vip_only,
            'starts_at' => $c->starts_at?->toIso8601String(),
            'ends_at' => $c->ends_at?->toIso8601String(),
            'is_active' => (bool) $c->is_active,
            'status' => $c->status(),
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }
}
