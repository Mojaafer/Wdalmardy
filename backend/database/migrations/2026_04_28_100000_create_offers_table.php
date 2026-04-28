<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['banner', 'daily', 'weekly', 'percentage', 'fixed', 'free_shipping'])->default('percentage');
            $table->string('title');
            $table->string('title_en')->nullable();
            $table->text('description')->nullable();
            $table->text('description_en')->nullable();
            $table->decimal('discount_value', 12, 2)->default(0);
            $table->enum('discount_unit', ['percent', 'amount', 'free_shipping'])->default('percent');
            $table->decimal('max_discount', 12, 2)->nullable();
            $table->enum('scope', ['all', 'category', 'product'])->default('all');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->string('banner_image')->nullable();
            $table->string('banner_link')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['type', 'is_active']);
            $table->index(['starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
