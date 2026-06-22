<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Branch;
use App\Models\BranchProductStock;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductAdminController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->integer('branch_id') ?: null;
        $query = Product::query()->with('category');

        // Eager-load the branch rows so ProductResource can expose per-branch
        // availability without N+1 queries.
        if ($branchId) {
            $query->with(['branchStocks' => fn ($q) => $q->where('branch_id', $branchId)]);
        }

        if ($barcode = $request->string('barcode')->toString()) {
            $query->where('barcode', $barcode);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('slug', 'like', "%$q%")
                    ->orWhere('barcode', 'like', "%$q%");
            });
        }

        if ($category = $request->string('category')->toString()) {
            $query->whereHas('category', fn ($c) => $c->where('slug', $category));
        }

        if (($status = $request->string('status')->toString()) !== '') {
            if ($branchId && in_array($status, ['in_stock', 'low_stock', 'out_of_stock'], true)) {
                // Filter against the per-branch row via a whereHas.
                $query->whereHas('branchStocks', function ($bs) use ($branchId, $status) {
                    $bs->where('branch_id', $branchId);
                    match ($status) {
                        'in_stock' => $bs->where('stock', '>=', 10),
                        'low_stock' => $bs->where('stock', '<', 10)->where('stock', '>', 0),
                        'out_of_stock' => $bs->where('stock', 0),
                        default => null,
                    };
                });
                if ($status === 'in_stock') {
                    $query->where('is_active', true);
                }
            } else {
                match ($status) {
                    'in_stock' => $query->where('stock', '>=', 10)->where('is_active', true),
                    'low_stock' => $query->where('stock', '<', 10)->where('stock', '>', 0),
                    'out_of_stock' => $query->where('stock', 0),
                    'inactive' => $query->where('is_active', false),
                    default => null,
                };
            }
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

        // Seed a per-branch stock row at the main branch for the new product so
        // it doesn't appear out-of-stock everywhere (the initial `stock` value
        // from the create form is assigned to the main branch).
        $mainBranchId = Branch::defaultId();
        if ($mainBranchId) {
            BranchProductStock::create([
                'branch_id' => $mainBranchId,
                'product_id' => $product->id,
                'stock' => (int) $data['stock'],
                'reserved_stock' => 0,
                'low_stock_threshold' => 10,
            ]);
        }

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

    public function uploadImage(Request $request, Product $product)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,webp|max:2048',
        ]);

        if ($product->image && ! str_starts_with($product->image, 'http')) {
            Storage::disk('public')->delete($product->image);
        }

        $path = $request->file('image')->store('products', 'public');
        $product->update(['image' => $path]);

        return response()->json(['data' => new ProductResource($product->load('category'))]);
    }

    public function deleteImage(Request $request, Product $product)
    {
        if ($product->image && ! str_starts_with($product->image, 'http')) {
            Storage::disk('public')->delete($product->image);
        }
        $product->update(['image' => null]);

        return response()->json(['data' => new ProductResource($product->load('category'))]);
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $rules = [
            'category_id' => 'required|integer|exists:categories,id',
            'slug' => 'nullable|string|max:160',
            'barcode' => [
                'nullable',
                'string',
                'max:32',
                'regex:/^[0-9A-Za-z-]+$/',
                $ignoreId
                    ? Rule::unique('products', 'barcode')->ignore($ignoreId)
                    : Rule::unique('products', 'barcode'),
            ],
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
        ];

        return $request->validate($rules);
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
