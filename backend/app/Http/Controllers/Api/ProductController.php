<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'category' => 'nullable|string',
            'q' => 'nullable|string|max:100',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'sort' => 'nullable|in:default,price_asc,price_desc,newest,best_selling',
            'featured' => 'nullable|boolean',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:60',
        ]);

        $query = Product::active()->with('category');

        if (! empty($validated['category'])) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $validated['category']));
        }

        if (! empty($validated['q'])) {
            $term = $validated['q'];
            $query->where(function ($q) use ($term) {
                $q->where('name_ar', 'like', "%{$term}%")
                    ->orWhere('name_en', 'like', "%{$term}%");
            });
        }

        if (isset($validated['min_price'])) {
            $query->where('price', '>=', $validated['min_price']);
        }

        if (isset($validated['max_price'])) {
            $query->where('price', '<=', $validated['max_price']);
        }

        if (! empty($validated['featured'])) {
            $query->featured();
        }

        match ($validated['sort'] ?? 'default') {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest' => $query->orderByDesc('created_at'),
            'best_selling' => $query->orderByDesc('reviews_count'),
            default => $query->orderBy('sort_order')->orderByDesc('id'),
        };

        $perPage = $validated['per_page'] ?? 12;

        return ProductResource::collection($query->paginate($perPage));
    }

    public function show(string $slug)
    {
        $product = Product::active()
            ->with(['category', 'images'])
            ->where('slug', $slug)
            ->firstOrFail();

        $related = Product::active()
            ->with('category')
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->limit(8)
            ->get();

        return response()->json([
            'data' => new ProductResource($product),
            'related' => ProductResource::collection($related),
        ]);
    }
}
