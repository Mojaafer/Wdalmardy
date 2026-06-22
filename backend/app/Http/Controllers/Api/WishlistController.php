<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $customer = $request->user();

        $products = $customer->wishlist()
            ->with('category')
            ->latest('wishlist.created_at')
            ->get();

        return response()->json(['data' => $products]);
    }

    public function toggle(Request $request, int $productId)
    {
        $customer = $request->user();
        $product = Product::findOrFail($productId);

        $exists = $customer->wishlist()->where('product_id', $productId)->exists();

        if ($exists) {
            $customer->wishlist()->detach($productId);
            $added = false;
        } else {
            $customer->wishlist()->attach($productId);
            $added = true;
        }

        return response()->json(['data' => ['added' => $added]]);
    }
}
