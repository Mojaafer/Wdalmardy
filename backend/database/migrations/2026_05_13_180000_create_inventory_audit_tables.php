<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_audit_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cadence')->default('weekly');
            $table->string('scope')->default('all');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_audit_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('name');
            $table->string('cadence')->default('weekly');
            $table->string('status')->default('open');
            $table->unsignedBigInteger('started_by')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('accuracy_rate', 5, 2)->default(0);
            $table->integer('total_variance')->default(0);
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index('started_at');
        });

        Schema::create('inventory_audit_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('inventory_audit_sessions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('expected_qty')->default(0);
            $table->integer('counted_qty')->nullable();
            $table->integer('variance')->default(0);
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['session_id', 'product_id']);
            $table->index(['status', 'variance']);
        });

        DB::table('inventory_audit_templates')->insert([
            [
                'name' => 'جرد يومي سريع',
                'cadence' => 'daily',
                'scope' => 'low_stock',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'جرد أسبوعي كامل',
                'cadence' => 'weekly',
                'scope' => 'all',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'جرد شهري للمخزون',
                'cadence' => 'monthly',
                'scope' => 'all',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_audit_items');
        Schema::dropIfExists('inventory_audit_sessions');
        Schema::dropIfExists('inventory_audit_templates');
    }
};
