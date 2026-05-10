<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;

class BarcodeAdminController extends Controller
{
    /**
     * Lightweight summary for the admin barcodes screen.
     */
    public function summary(Request $request)
    {
        $total = Product::count();
        $withBarcode = Product::whereNotNull('barcode')->count();
        $duplicates = Product::query()
            ->select('barcode')
            ->whereNotNull('barcode')
            ->groupBy('barcode')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        return response()->json([
            'data' => [
                'total_products' => $total,
                'with_barcode' => $withBarcode,
                'without_barcode' => $total - $withBarcode,
                'duplicates' => $duplicates,
            ],
        ]);
    }

    /**
     * List products with their barcode (or lack of one) for the bulk-print screen.
     * Filters: q (name/barcode), missing=1 to only show products without a barcode.
     */
    public function index(Request $request)
    {
        $query = Product::query()->with('category');
        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('barcode', 'like', "%$q%");
            });
        }
        if ($request->boolean('missing')) {
            $query->whereNull('barcode');
        }
        $perPage = (int) $request->integer('per_page', 50);

        return ProductResource::collection($query->orderBy('name_ar')->paginate($perPage));
    }

    /**
     * Auto-generate a unique EAN-13 for any product that doesn't have one.
     * Returns the count of products that were updated.
     */
    public function generateMissing(Request $request)
    {
        $count = 0;
        Product::whereNull('barcode')->chunkById(200, function ($products) use (&$count) {
            foreach ($products as $product) {
                $product->barcode = $this->generateUniqueEan13();
                $product->save();
                $count++;
            }
        });

        return response()->json(['data' => ['generated' => $count]]);
    }

    /**
     * Find a single product by exact barcode match.
     */
    public function lookup(Request $request)
    {
        $code = $request->string('code')->toString();
        if ($code === '') {
            return response()->json(['data' => null]);
        }
        $product = Product::with('category')->where('barcode', $code)->first();

        return response()->json(['data' => $product ? new ProductResource($product) : null]);
    }

    /**
     * Generate a unique EAN-13 with a leading "200" (in-store / restricted prefix).
     * Loops until uniqueness is confirmed; bounded by a sanity ceiling.
     */
    private function generateUniqueEan13(): string
    {
        for ($i = 0; $i < 50; $i++) {
            $base = '200'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
            $code = $base.$this->ean13Checksum($base);
            if (! Product::where('barcode', $code)->exists()) {
                return $code;
            }
        }
        // Extremely unlikely fallback — append timestamp digits
        $base = substr('200'.str_pad((string) (microtime(true) * 1000), 9, '0', STR_PAD_LEFT), 0, 12);

        return $base.$this->ean13Checksum($base);
    }

    /**
     * EAN-13 check-digit: sum of (odd-position * 1) + (even-position * 3) over the
     * first 12 digits, then (10 − sum mod 10) mod 10.
     */
    private function ean13Checksum(string $first12): int
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $d = (int) $first12[$i];
            $sum += ($i % 2 === 0) ? $d : $d * 3;
        }

        return (10 - ($sum % 10)) % 10;
    }
}
