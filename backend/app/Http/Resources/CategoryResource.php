<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
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
            'image' => $this->image,
            'is_active' => (bool) $this->is_active,
            'sort_order' => $this->sort_order,
            'products_count' => $this->whenCounted('products'),
            'products' => ProductResource::collection($this->whenLoaded('products')),
        ];
    }
}
