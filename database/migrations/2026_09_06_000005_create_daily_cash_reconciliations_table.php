<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('daily_cash_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->date('reconciliation_date')->unique();
            $table->decimal('opening_cash_float', 10, 2)->default(0.00);
            $table->decimal('total_cash_sales', 10, 2)->default(0.00);
            $table->decimal('total_digital_sales', 10, 2)->default(0.00);
            $table->decimal('total_cash_expenses', 10, 2)->default(0.00);
            $table->decimal('expected_cash_on_hand', 10, 2)->default(0.00);
            $table->decimal('actual_cash_counted', 10, 2)->default(0.00);
            $table->decimal('cash_variance', 10, 2)->default(0.00);
            $table->string('status', 30)->default('open'); // open, submitted, verified, discrepancy
            $table->text('remarks')->nullable();
            $table->foreignId('closed_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_cash_reconciliations');
    }
};
