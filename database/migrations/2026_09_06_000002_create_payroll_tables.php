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
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period_code', 50)->unique(); // e.g. PR-2026-W36
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 30)->default('draft'); // draft, prepared, reviewed, approved, disbursed
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('prepared_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('attendance_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->date('work_date');
            $table->string('am_status', 30)->default('present'); // present, absent, half_day, day_off
            $table->string('pm_status', 30)->default('present'); // present, absent, half_day, day_off
            $table->decimal('ot_hours', 4, 2)->default(0.00);
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'work_date']);
        });

        Schema::create('payroll_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->decimal('daily_rate_snapshot', 10, 2);
            $table->decimal('days_worked', 4, 2)->default(0.00);
            $table->decimal('total_ot_hours', 5, 2)->default(0.00);
            $table->decimal('hourly_ot_rate', 10, 2)->default(0.00);
            $table->decimal('gross_pay', 10, 2)->default(0.00);
            $table->decimal('deductions_total', 10, 2)->default(0.00);
            $table->decimal('net_pay', 10, 2)->default(0.00);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'employee_id']);
        });

        Schema::create('payroll_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_line_id')->constrained('payroll_lines')->cascadeOnDelete();
            $table->string('deduction_type', 50); // cash_advance, uniform, sss, philhealth, pagibig, other
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
        Schema::dropIfExists('payroll_deductions');
        Schema::dropIfExists('payroll_lines');
        Schema::dropIfExists('attendance_shifts');
        Schema::dropIfExists('payroll_periods');
    }
};
