<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with('category');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('slug', 'like', "%$q%");
            });
        }

        if ($category = $request->string('category')->toString()) {
            $query->whereHas('category', fn ($c) => $c->where('slug', $category));
        }

        if (($status = $request->string('status')->toString()) !== '') {
            match ($status) {
                'in_stock' => $query->where('stock', '>=', 10)->where('is_active', true),
                'low_stock' => $query->where('stock', '<', 10)->where('stock', '>', 0),
                'out_of_stock' => $query->where('stock', 0),
                'inactive' => $query->where('is_active', false),
                default => null,
            };
        }

        $perPage = (int) $request->integer('per_page', 15);
        $sort = $request->string('sort', 'newest')->toString();
        match ($sort) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'name' => $query->orderBy('name_ar'),
            default => $query->latest(),
        };

        $paginator = $query->paginate($perPage);

        return ProductResource::collection($paginator);
    }

    public function show(Product $product)
    {
        return response()->json(['data' => new ProductResource($product->load('category', 'images'))]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name_en'] ?? $data['name_ar']);

        $product = Product::create($data);

        return response()->json(['data' => new ProductResource($product->load('category'))], 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validatedData($request, $product->id);
        if (isset($data['slug']) && $data['slug'] !== $product->slug) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $product->id);
        }
        $product->update($data);

        return response()->json(['data' => new ProductResource($product->load('category'))]);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'category_id' => 'required|integer|exists:categories,id',
            'slug' => 'nullable|string|max:160',
            'name_ar' => 'required|string|max:160',
            'name_en' => 'required|string|max:160',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'unit_ar' => 'nullable|string|max:80',
            'unit_en' => 'nullable|string|max:80',
            'image' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'is_featured' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base);
        $candidate = $slug;
        $i = 2;
        while (Product::where('slug', $candidate)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $slug.'-'.$i++;
        }

        return $candidate;
    }
}
