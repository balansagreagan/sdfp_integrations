<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->decimal('quantity_in_stock', 10, 2)->default(0)->change();
            $table->decimal('min_threshold', 10, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->integer('quantity_in_stock')->default(0)->change();
            $table->integer('min_threshold')->default(5)->change();
        });
    }
};
