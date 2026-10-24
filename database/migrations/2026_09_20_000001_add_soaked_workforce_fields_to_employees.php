<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('work_area', 30)->default('park')->after('employee_code');
            $table->string('soaked_assignment', 100)->nullable()->after('work_area');
            $table->time('scheduled_start_time')->nullable()->after('soaked_assignment');
            $table->time('scheduled_end_time')->nullable()->after('scheduled_start_time');
            $table->index('work_area');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['work_area']);
            $table->dropColumn(['work_area', 'soaked_assignment', 'scheduled_start_time', 'scheduled_end_time']);
        });
    }
};
