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
        Schema::table('payroll_lines', function (Blueprint $table) {
            $table->decimal('additions_total', 10, 2)->default(0.00)->after('gross_pay');
        });

        Schema::create('payroll_additions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_line_id')->constrained('payroll_lines')->cascadeOnDelete();
            $table->string('addition_type', 50); // others, allowance, bonus
            $table->string('description', 255)->nullable();
            $table->decimal('amount', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_additions');
        
        Schema::table('payroll_lines', function (Blueprint $table) {
            $table->dropColumn('additions_total');
        });
    }
};
