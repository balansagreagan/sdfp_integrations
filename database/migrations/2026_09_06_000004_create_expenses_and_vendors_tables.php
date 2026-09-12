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
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique(); // PLDT, Aquastar, Shell
            $table->string('contact_person', 100)->nullable();
            $table->string('contact_number', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number', 100); // e.g. Johanna Montealto Voucher, V-2026-001
            $table->date('expense_date');
            $table->foreignId('category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('payee_name', 150);
            $table->text('description');
            $table->decimal('amount', 10, 2);
            $table->string('disbursement_method', 30)->default('cash_drawer'); // cash_drawer, petty_cash, bank_transfer, gcash
            $table->string('receipt_reference', 100)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index('expense_date');
            $table->index('disbursement_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('expense_categories');
    }
};
