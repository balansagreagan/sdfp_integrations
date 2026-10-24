<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_types', function (Blueprint $table) {
            $table->string('child_pricing', 20)->default('confirm');
            $table->decimal('child_price', 10, 2)->nullable();
        });
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('adult_count')->nullable();
            $table->unsignedInteger('child_count')->nullable();
            $table->decimal('child_unit_price', 10, 2)->nullable();
            $table->decimal('package_amount', 10, 2)->nullable();
            $table->string('pricing_status', 20)->default('complete');
            $table->time('food_serving_time')->nullable();
            $table->string('promotion_reference', 255)->nullable();
        });
        DB::table('bookings')->update(['package_amount' => DB::raw('subtotal_amount')]);
        Schema::table('booking_items', function (Blueprint $table) {
            $table->string('guest_type', 20)->default('all');
            $table->decimal('unit_price', 10, 2)->nullable()->change();
            $table->decimal('line_total', 10, 2)->nullable()->change();
        });
        Schema::create('add_on_items', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->string('unit', 30)->default('order');
            $table->decimal('price', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('booking_addons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('addon_item_id')->nullable()->constrained('add_on_items')->nullOnDelete();
            $table->string('name', 150);
            $table->decimal('quantity', 8, 2);
            $table->string('unit', 30)->default('order');
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->decimal('line_total', 10, 2)->nullable();
            $table->boolean('is_included')->default(false);
            $table->timestamps();
        });
        $now = now();
        foreach ([
            ['BILAO-BOODLE-1', 'Bilao Boodle 1', 1299, 'bilao'],
            ['TUNA-KINILAW', 'Tuna Kinilaw', 269, 'order'],
            ['TUNA-PANGA', 'Tuna Panga', 399, 'order'],
            ['CAJUN-MIX', 'Cajun Mix', 999, 'order'],
            ['TUNA-BELLY', 'Grilled Tuna Belly', null, 'order'],
            ['RICE', 'Rice', null, 'cup'],
            ['PINEAPPLE-JUICE', 'Pineapple Juice', null, 'cup'],
        ] as [$code, $name, $price, $unit]) {
            DB::table('add_on_items')->insert(['code' => $code, 'name' => $name, 'price' => $price,
                'unit' => $unit, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
        DB::table('ticket_types')->insertOrIgnore([
            'code' => 'FREE-BROCHURE', 'name' => 'Free Tickets Brochure', 'category' => 'admission',
            'price' => 0, 'pricing_basis' => 'per_person', 'min_pax' => 1, 'is_active' => true,
            'child_pricing' => 'same', 'description' => 'Complimentary admission using the free tickets brochure. Food add-ons are charged separately.',
            'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_addons');
        Schema::dropIfExists('add_on_items');
        Schema::table('booking_items', fn (Blueprint $table) => $table->dropColumn('guest_type'));
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['adult_count', 'child_count', 'child_unit_price', 'package_amount', 'pricing_status', 'food_serving_time', 'promotion_reference']));
        Schema::table('ticket_types', fn (Blueprint $table) => $table->dropColumn(['child_pricing', 'child_price']));
    }
};
