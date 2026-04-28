<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmployeeActivity;
use App\Models\Offer;
use Illuminate\Http\Request;

class OfferAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Offer::query()->orderByDesc('priority')->orderByDesc('id');

        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }
        if ($status = $request->string('status')->toString()) {
            // Handled in PHP since "status" is computed.
        }
        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%$q%")
                    ->orWhere('title_en', 'like', "%$q%");
            });
        }

        $offers = $query->paginate((int) $request->integer('per_page', 50));

        $items = $offers->getCollection()->map(fn (Offer $o) => $this->serialize($o));
        if ($status) {
            $items = $items->filter(fn ($it) => $it['status'] === $status)->values();
        }

        return response()->json([
            'data' => $items,
            'meta' => [
                'total' => $offers->total(),
                'per_page' => $offers->perPage(),
                'current_page' => $offers->currentPage(),
                'last_page' => $offers->lastPage(),
            ],
            'stats' => $this->stats(),
        ]);
    }

    public function stats(): array
    {
        $all = Offer::all();
        $by = fn (string $s) => $all->filter(fn ($o) => $o->status() === $s)->count();

        return [
            'total' => $all->count(),
            'active' => $by('active'),
            'scheduled' => $by('scheduled'),
            'expired' => $by('expired'),
            'paused' => $by('paused'),
        ];
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['created_by_user_id'] = $request->user()?->id;

        $offer = Offer::create($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'offer.created',
            'أضاف عرض "'.$offer->title.'"',
            ['offer_id' => $offer->id, 'type' => $offer->type],
        );

        return response()->json(['data' => $this->serialize($offer)], 201);
    }

    public function show(Offer $offer)
    {
        return response()->json(['data' => $this->serialize($offer)]);
    }

    public function update(Request $request, Offer $offer)
    {
        $data = $this->validatedData($request);
        $offer->update($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'offer.updated',
            'عدّل عرض "'.$offer->title.'"',
            ['offer_id' => $offer->id],
        );

        return response()->json(['data' => $this->serialize($offer->fresh())]);
    }

    public function destroy(Request $request, Offer $offer)
    {
        EmployeeActivity::log(
            (int) $request->user()->id,
            'offer.deleted',
            'حذف عرض "'.$offer->title.'"',
            ['offer_id' => $offer->id],
        );
        $offer->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function toggle(Request $request, Offer $offer)
    {
        $offer->update(['is_active' => ! $offer->is_active]);
        EmployeeActivity::log(
            (int) $request->user()->id,
            'offer.toggled',
            ($offer->is_active ? 'فعّل' : 'أوقف').' عرض "'.$offer->title.'"',
            ['offer_id' => $offer->id, 'is_active' => $offer->is_active],
        );

        return response()->json(['data' => $this->serialize($offer)]);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'type' => 'required|in:banner,daily,weekly,percentage,fixed,free_shipping',
            'title' => 'required|string|max:200',
            'title_en' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'description_en' => 'nullable|string',
            'discount_value' => 'required|numeric|min:0',
            'discount_unit' => 'required|in:percent,amount,free_shipping',
            'max_discount' => 'nullable|numeric|min:0',
            'scope' => 'required|in:all,category,product',
            'scope_id' => 'nullable|integer',
            'banner_image' => 'nullable|string|max:500',
            'banner_link' => 'nullable|string|max:500',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_active' => 'sometimes|boolean',
            'priority' => 'sometimes|integer',
        ]);
    }

    private function serialize(Offer $o): array
    {
        return [
            'id' => $o->id,
            'type' => $o->type,
            'title' => $o->title,
            'title_en' => $o->title_en,
            'description' => $o->description,
            'description_en' => $o->description_en,
            'discount_value' => (float) $o->discount_value,
            'discount_unit' => $o->discount_unit,
            'max_discount' => $o->max_discount ? (float) $o->max_discount : null,
            'scope' => $o->scope,
            'scope_id' => $o->scope_id,
            'banner_image' => $o->banner_image,
            'banner_link' => $o->banner_link,
            'starts_at' => $o->starts_at?->toIso8601String(),
            'ends_at' => $o->ends_at?->toIso8601String(),
            'is_active' => (bool) $o->is_active,
            'priority' => (int) $o->priority,
            'status' => $o->status(),
            'is_live' => $o->isLive(),
            'created_at' => $o->created_at?->toIso8601String(),
        ];
    }
}
