<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $branchId = DB::table('branches')->where('is_main', true)->value('id')
            ?? DB::table('branches')->value('id');

        Schema::create('branch_product_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('stock')->default(0);
            $table->integer('reserved_stock')->default(0);
            $table->integer('low_stock_threshold')->default(10);
            $table->timestamps();

            $table->unique(['branch_id', 'product_id']);
            $table->index(['branch_id', 'stock']);
        });

        if ($branchId) {
            $now = now();
            DB::table('products')->orderBy('id')->chunk(200, function ($products) use ($branchId, $now) {
                $rows = [];
                foreach ($products as $product) {
                    $rows[] = [
                        'branch_id' => $branchId,
                        'product_id' => $product->id,
                        'stock' => (int) $product->stock,
                        'reserved_stock' => 0,
                        'low_stock_threshold' => 10,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                DB::table('branch_product_stocks')->insert($rows);
            });
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id');
            $table->index('branch_id');
        });
        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id');
            $table->index('branch_id');
        });
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id');
            $table->index('branch_id');
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id');
            $table->index('branch_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id');
            $table->index('branch_id');
        });

        if ($branchId) {
            DB::table('orders')->whereNull('branch_id')->update(['branch_id' => $branchId]);
            DB::table('pos_sessions')->whereNull('branch_id')->update(['branch_id' => $branchId]);
            DB::table('pos_sales')->whereNull('branch_id')->update(['branch_id' => $branchId]);
            DB::table('stock_movements')->whereNull('branch_id')->update(['branch_id' => $branchId]);
            DB::table('users')->whereNull('branch_id')->update(['branch_id' => $branchId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['branch_id']);
            $table->dropColumn('branch_id');
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['branch_id']);
            $table->dropColumn('branch_id');
        });
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->dropIndex(['branch_id']);
            $table->dropColumn('branch_id');
        });
        Schema::table('pos_sessions', function (Blueprint $table) {
            $table->dropIndex(['branch_id']);
            $table->dropColumn('branch_id');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['branch_id']);
            $table->dropColumn('branch_id');
        });
        Schema::dropIfExists('branch_product_stocks');
    }
};
