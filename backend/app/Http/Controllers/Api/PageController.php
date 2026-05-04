<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;

class PageController extends Controller
{
    public function index()
    {
        $pages = Page::published()
            ->orderBy('title_ar')
            ->get(['slug', 'title_ar', 'title_en', 'meta_description']);

        return response()->json(['data' => $pages]);
    }

    public function show(string $slug)
    {
        $page = Page::published()->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $page]);
    }
}
