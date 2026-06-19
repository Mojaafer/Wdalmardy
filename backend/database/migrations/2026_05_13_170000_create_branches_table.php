<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name_ar');
            $table->string('name_en')->nullable();
            $table->string('code')->unique();
            $table->string('manager_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('status')->default('active');
            $table->boolean('is_main')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['status', 'is_main']);
        });

        DB::table('branches')->insert([
            'name_ar' => 'الفرع الرئيسي - الخرطوم',
            'name_en' => 'Main Branch - Khartoum',
            'code' => 'main-khartoum',
            'manager_name' => 'أحمد المدير',
            'phone' => '+249 11 123 4567',
            'address' => 'شارع النيل - الخرطوم',
            'city' => 'الخرطوم',
            'status' => 'active',
            'is_main' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
