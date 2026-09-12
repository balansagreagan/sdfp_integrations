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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_code', 30)->unique(); // e.g. LV-ADULT-M, INF-SLIDE-01
            $table->string('name', 150);
            $table->string('category', 50); // safety_gear, inflatables, counter_supplies, maintenance, first_aid
            $table->integer('quantity_in_stock')->default(0);
            $table->integer('min_threshold')->default(5);
            $table->string('unit', 30)->default('pcs'); // pcs, rolls, sets, boxes
            $table->string('condition_status', 30)->default('good'); // good, needs_repair, damaged
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
