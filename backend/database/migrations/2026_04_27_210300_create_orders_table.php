<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();
            $table->string('address_state')->nullable();
            $table->string('address_district')->nullable();
            $table->text('address_details')->nullable();
            $table->enum('delivery_method', ['delivery', 'pickup'])->default('delivery');
            $table->enum('payment_method', ['whatsapp', 'cod', 'bank_transfer'])->default('whatsapp');
            $table->enum('status', ['new', 'preparing', 'shipped', 'delivered', 'cancelled'])
                ->default('new');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('customer_phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
