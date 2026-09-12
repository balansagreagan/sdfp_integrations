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
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('title')->unique(); // Lifeguard, Office Staff, Utility, Cashier, Supervisor
            $table->decimal('base_daily_rate', 10, 2)->default(400.00);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code', 20)->unique(); // e.g., EMP-001
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('contact_number', 30)->nullable();
            $table->foreignId('position_id')->constrained('positions')->onDelete('restrict');
            $table->decimal('daily_rate', 10, 2);
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('active'); // active, on_leave, terminated
            $table->date('hired_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
        Schema::dropIfExists('positions');
    }
};
