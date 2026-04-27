<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::active()
            ->withCount(['products' => fn ($q) => $q->active()])
            ->orderBy('sort_order')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function show(string $slug)
    {
        $category = Category::active()
            ->where('slug', $slug)
            ->with(['products' => fn ($q) => $q->active()->with('category')])
            ->firstOrFail();

        return new CategoryResource($category);
    }
}
