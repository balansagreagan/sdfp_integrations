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
        Schema::create('guests', function (Blueprint $table) {
            $table->id();
            $table->string('full_name', 150);
            $table->string('contact_number', 30);
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique(); // REG-2HR, ALL-DAY, KIDDIE-2HR, HALF-DAY
            $table->string('name', 100);
            $table->integer('duration_hours')->nullable();
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_reference', 50)->unique(); // e.g. SDFP1002390
            $table->foreignId('guest_id')->constrained('guests')->restrictOnDelete();
            $table->date('transaction_date');
            $table->date('playtime_date');
            $table->time('allocated_time_slot_start');
            $table->time('allocated_time_slot_end');
            $table->integer('total_pax')->default(1);
            $table->decimal('subtotal_amount', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('gross_amount', 10, 2)->default(0.00);
            $table->string('payment_method', 30)->default('cash'); // cash, gcash, bank_transfer, maya
            $table->string('status', 30)->default('confirmed'); // confirmed, checked_in, completed, cancelled, weather_hold
            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['playtime_date', 'status']);
            $table->index('transaction_date');
        });

        Schema::create('booking_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('ticket_type_id')->constrained('ticket_types')->restrictOnDelete();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->timestamps();
        });

        Schema::create('wristband_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('color', 30); // BLUE, ORANGE, GREEN, PINK
            $table->string('series_code', 50)->default('NEW WB NUMBERS');
            $table->integer('start_number');
            $table->integer('end_number');
            $table->integer('total_allocated');
            $table->text('remarks')->nullable(); // e.g., '4843-4847 BLUE NEW WB NUMBERS'
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wristband_allocations');
        Schema::dropIfExists('booking_items');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('ticket_types');
        Schema::dropIfExists('guests');
    }
};
