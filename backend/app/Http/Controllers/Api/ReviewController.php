<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function index(int $productId)
    {
        $product = Product::findOrFail($productId);
        $reviews = $product->reviews()
            ->where('is_approved', true)
            ->with('customer:id,name')
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'customer_name' => $r->customer?->name ?? '—',
                'created_at' => $r->created_at->diffForHumans(),
            ]);

        return response()->json(['data' => $reviews]);
    }

    public function store(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);
        $customer = $request->user();

        if ($product->reviews()->where('customer_id', $customer->id)->exists()) {
            throw ValidationException::withMessages([
                'review' => ['لقد قمت بتقييم هذا المنتج بالفعل.'],
            ]);
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = $product->reviews()->create([
            'customer_id' => $customer->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        return response()->json(['data' => $review], 201);
    }
}
