<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PageAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Page::query();

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('title_ar', 'like', "%$q%")
                    ->orWhere('title_en', 'like', "%$q%")
                    ->orWhere('slug', 'like', "%$q%");
            });
        }

        $status = $request->string('status')->toString();
        if ($status === 'published') {
            $query->where('is_published', true);
        } elseif ($status === 'draft') {
            $query->where('is_published', false);
        }

        return response()->json([
            'data' => $query->latest('updated_at')->get(),
            'meta' => [
                'total' => Page::count(),
                'published' => Page::where('is_published', true)->count(),
                'draft' => Page::where('is_published', false)->count(),
            ],
        ]);
    }

    public function show(Page $page)
    {
        return response()->json(['data' => $page]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'slug' => 'required|string|max:120|alpha_dash|unique:pages,slug',
            'title_ar' => 'required|string|max:200',
            'title_en' => 'nullable|string|max:200',
            'body_ar' => 'nullable|string',
            'body_en' => 'nullable|string',
            'meta_description' => 'nullable|string|max:300',
            'is_published' => 'boolean',
        ]);

        $data['is_published'] = (bool) ($data['is_published'] ?? true);
        $data['published_at'] = $data['is_published'] ? now() : null;

        $page = Page::create($data);

        return response()->json(['data' => $page], 201);
    }

    public function update(Request $request, Page $page)
    {
        $data = $request->validate([
            'slug' => ['sometimes', 'string', 'max:120', 'alpha_dash', Rule::unique('pages', 'slug')->ignore($page->id)],
            'title_ar' => 'sometimes|string|max:200',
            'title_en' => 'nullable|string|max:200',
            'body_ar' => 'nullable|string',
            'body_en' => 'nullable|string',
            'meta_description' => 'nullable|string|max:300',
            'is_published' => 'boolean',
        ]);

        if (array_key_exists('is_published', $data)) {
            $data['published_at'] = $data['is_published'] ? ($page->published_at ?? now()) : null;
        }

        $page->update($data);

        return response()->json(['data' => $page->fresh()]);
    }

    public function destroy(Page $page)
    {
        $page->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
