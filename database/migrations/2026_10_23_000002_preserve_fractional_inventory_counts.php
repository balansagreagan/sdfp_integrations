<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->decimal('quantity_in_stock', 11, 3)->default(0)->change();
            $table->decimal('min_threshold', 11, 3)->default(0)->change();
        });
    }

    public function down(): void
    {
        if (DB::table('inventory_items')->whereRaw('quantity_in_stock * 100 <> ROUND(quantity_in_stock * 100) OR min_threshold * 100 <> ROUND(min_threshold * 100)')->exists()) {
            throw new RuntimeException('Inventory has three-decimal quantities; refusing to round them during rollback.');
        }
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->decimal('quantity_in_stock', 10, 2)->default(0)->change();
            $table->decimal('min_threshold', 10, 2)->default(0)->change();
        });
    }
};
