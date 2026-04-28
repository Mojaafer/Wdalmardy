<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('business_type')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('tax_number')->nullable();
            $table->string('logo')->nullable();
            $table->date('registered_at')->nullable();
            $table->enum('status', ['active', 'paused', 'archived'])->default('active');
            $table->decimal('performance_rating', 3, 1)->default(0);
            $table->decimal('total_purchases', 14, 2)->default(0);
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->integer('orders_count')->default(0);
            $table->date('last_order_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
