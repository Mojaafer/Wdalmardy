<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(),
            'name_ar' => fake('ar_SA')->word(),
            'name_en' => fake()->word(),
            'is_active' => true,
        ];
    }
}
