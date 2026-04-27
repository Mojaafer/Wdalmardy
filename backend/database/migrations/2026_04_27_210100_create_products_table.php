<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('image')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('compare_at_price', 12, 2)->nullable();
            $table->string('unit_ar')->nullable();
            $table->string('unit_en')->nullable();
            $table->integer('stock')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->decimal('rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'category_id']);
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
