<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('register')->default('main');
            $table->foreignId('opened_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->decimal('opening_cash', 12, 2)->default(0);
            $table->decimal('closing_cash_expected', 12, 2)->nullable();
            $table->decimal('closing_cash_counted', 12, 2)->nullable();
            $table->decimal('variance', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'opened_at']);
            $table->index('opened_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sessions');
    }
};
