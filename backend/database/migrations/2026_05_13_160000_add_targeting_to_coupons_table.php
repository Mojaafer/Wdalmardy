<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->string('customer_segment')->default('all')->after('applies_to');
            $table->json('geo_regions')->nullable()->after('customer_segment');
            $table->json('product_ids')->nullable()->after('geo_regions');
            $table->string('seasonal_tag')->nullable()->after('product_ids');
            $table->boolean('vip_only')->default(false)->after('seasonal_tag');
            $table->index(['customer_segment', 'vip_only']);
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropIndex(['customer_segment', 'vip_only']);
            $table->dropColumn([
                'customer_segment',
                'geo_regions',
                'product_ids',
                'seasonal_tag',
                'vip_only',
            ]);
        });
    }
};
