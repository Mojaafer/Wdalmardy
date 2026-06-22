<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::query()->withCount('products')->orderBy('sort_order')->orderBy('id');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('slug', 'like', "%$q%");
            });
        }

        return CategoryResource::collection($query->paginate((int) $request->integer('per_page', 50)));
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? ($data['name_en'] ?? $data['name_ar']));

        $category = Category::create($data);

        return response()->json(['data' => new CategoryResource($category)], 201);
    }

    public function show(Category $category)
    {
        return response()->json(['data' => new CategoryResource($category->loadCount('products'))]);
    }

    public function update(Request $request, Category $category)
    {
        $data = $this->validatedData($request, $category->id);
        if (isset($data['slug']) && $data['slug'] !== $category->slug) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $category->id);
        }
        $category->update($data);

        return response()->json(['data' => new CategoryResource($category)]);
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function uploadImage(Request $request, Category $category)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        if ($category->image && ! str_starts_with($category->image, 'http')) {
            Storage::disk('public')->delete($category->image);
        }

        $file = $request->file('image');
        $filename = 'cat_'.$category->id.'_'.time().'.'.$file->extension();
        $file->storeAs('categories', $filename, 'public');

        $category->update(['image' => 'categories/'.$filename]);

        return response()->json(['data' => new CategoryResource($category->fresh())]);
    }

    public function deleteImage(Category $category)
    {
        if ($category->image && ! str_starts_with($category->image, 'http')) {
            Storage::disk('public')->delete($category->image);
        }

        $category->update(['image' => null]);

        return response()->json(['data' => new CategoryResource($category->fresh())]);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:categories,id',
        ]);

        foreach ($validated['order'] as $index => $id) {
            Category::where('id', $id)->update(['sort_order' => $index + 1]);
        }

        return response()->json(['data' => ['ok' => true]]);
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'slug' => 'nullable|string|max:120',
            'name_ar' => 'required|string|max:120',
            'name_en' => 'required|string|max:120',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'image' => 'nullable|string|max:500',
            'sort_order' => 'sometimes|integer',
            'is_active' => 'sometimes|boolean',
        ]);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base);
        $candidate = $slug;
        $i = 2;
        while (Category::where('slug', $candidate)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $slug.'-'.$i++;
        }

        return $candidate;
    }
}
