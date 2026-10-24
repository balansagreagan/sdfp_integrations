<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('inventory_location', 50)->default('park')->after('item_code');
            $table->decimal('unit_cost', 10, 2)->nullable()->after('unit');
            $table->index('inventory_location');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropIndex(['inventory_location']);
            $table->dropColumn(['inventory_location', 'unit_cost']);
        });
    }
};
