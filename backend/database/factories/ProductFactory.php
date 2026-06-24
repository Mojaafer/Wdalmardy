<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'slug' => fake()->unique()->slug(),
            'name_ar' => fake('ar_SA')->word(),
            'name_en' => fake()->word(),
            'price' => fake()->randomFloat(2, 10, 5000),
            'stock' => fake()->numberBetween(1, 100),
            'is_active' => true,
        ];
    }
}
