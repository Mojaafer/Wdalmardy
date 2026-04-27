<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => [
                'ar' => $this->name_ar,
                'en' => $this->name_en,
            ],
            'description' => [
                'ar' => $this->description_ar,
                'en' => $this->description_en,
            ],
            'unit' => [
                'ar' => $this->unit_ar,
                'en' => $this->unit_en,
            ],
            'image' => $this->image,
            'images' => $this->whenLoaded('images', fn () => $this->images->pluck('url')),
            'price' => (float) $this->price,
            'compare_at_price' => $this->compare_at_price !== null ? (float) $this->compare_at_price : null,
            'discount_percent' => $this->compare_at_price && $this->compare_at_price > $this->price
                ? (int) round((($this->compare_at_price - $this->price) / $this->compare_at_price) * 100)
                : 0,
            'stock' => $this->stock,
            'in_stock' => $this->stock > 0,
            'is_featured' => $this->is_featured,
            'rating' => (float) $this->rating,
            'reviews_count' => $this->reviews_count,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'slug' => $this->category->slug,
                'name' => [
                    'ar' => $this->category->name_ar,
                    'en' => $this->category->name_en,
                ],
            ]),
        ];
    }
}
