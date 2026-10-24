<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brochures', function (Blueprint $table) {
            $table->id();
            $table->string('card_number', 60)->unique();
            $table->foreignId('guest_id')->constrained()->restrictOnDelete();
            $table->date('purchased_on');
            $table->date('expires_on');
            $table->string('source', 20);
            $table->decimal('price', 10, 2);
            $table->decimal('amount_paid', 10, 2);
            $table->string('payment_method', 30)->nullable();
            $table->string('reference', 255)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('brochure_coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brochure_id')->constrained()->restrictOnDelete();
            $table->string('type', 40);
            $table->unsignedTinyInteger('number');
            $table->string('state', 20)->default('unused');
            $table->foreignId('booking_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->unique(['brochure_id', 'type', 'number']);
            $table->timestamps();
        });
        Schema::table('bookings', fn (Blueprint $table) => $table->foreignId('brochure_coupon_id')->nullable()->constrained()->nullOnDelete());
        Schema::table('add_on_items', fn (Blueprint $table) => $table->string('brochure_scope', 30)->default('other'));
        Schema::table('booking_addons', fn (Blueprint $table) => $table->string('brochure_scope', 30)->default('other'));
        DB::table('add_on_items')->whereIn('code', ['BILAO-BOODLE-1', 'TUNA-KINILAW', 'TUNA-PANGA', 'CAJUN-MIX', 'TUNA-BELLY', 'RICE', 'PINEAPPLE-JUICE'])->update(['brochure_scope' => 'restaurant']);
    }

    public function down(): void
    {
        Schema::table('booking_addons', fn (Blueprint $table) => $table->dropColumn('brochure_scope'));
        Schema::table('add_on_items', fn (Blueprint $table) => $table->dropColumn('brochure_scope'));
        Schema::table('bookings', fn (Blueprint $table) => $table->dropConstrainedForeignId('brochure_coupon_id'));
        Schema::dropIfExists('brochure_coupons');
        Schema::dropIfExists('brochures');
    }
};
