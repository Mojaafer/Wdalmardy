<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // current redeemable balance (earned - redeemed +/- adjustments)
            $table->integer('loyalty_points')->default(0)->after('total_spent');
            // monotonic counter — used for tier calculation so spending doesn't downgrade tier
            $table->integer('lifetime_points')->default(0)->after('loyalty_points');
            $table->index('loyalty_points');
            $table->index('lifetime_points');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['loyalty_points']);
            $table->dropIndex(['lifetime_points']);
            $table->dropColumn(['loyalty_points', 'lifetime_points']);
        });
    }
};
