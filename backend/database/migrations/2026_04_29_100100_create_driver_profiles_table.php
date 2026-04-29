<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('delivery_zones')->nullOnDelete();
            $table->enum('availability', ['available', 'on_delivery', 'off_duty'])->default('available');
            $table->string('vehicle')->nullable();
            $table->string('vehicle_plate')->nullable();
            $table->string('national_id')->nullable();
            $table->unsignedInteger('completed_orders')->default(0);
            $table->decimal('rating', 3, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('availability');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_profiles');
    }
};
