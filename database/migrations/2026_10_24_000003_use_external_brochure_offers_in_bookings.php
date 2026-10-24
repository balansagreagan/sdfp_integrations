<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('brochure_offer', 40)->nullable();
            $table->timestamp('brochure_presented_at')->nullable();
        });
        // Retain previously recorded booking offers, without requiring card registration.
        DB::table('bookings')->whereNotNull('brochure_coupon_id')->orderBy('id')->get()->each(function ($booking) {
            $coupon = DB::table('brochure_coupons')->find($booking->brochure_coupon_id);
            if ($coupon) {
                DB::table('bookings')->where('id', $booking->id)->update([
                    'brochure_offer' => $coupon->type, 'brochure_presented_at' => $coupon->redeemed_at,
                ]);
            }
        });
        DB::table('bookings')->whereNull('brochure_offer')->whereIn('id', DB::table('booking_items')
            ->join('ticket_types', 'ticket_types.id', '=', 'booking_items.ticket_type_id')
            ->where('ticket_types.code', 'FREE-BROCHURE')->select('booking_items.booking_id'))
            ->update(['brochure_offer' => 'free_all_day']);
        // Existing historical card records are retained; their external fees are no longer park receipts.
        (require __DIR__.'/2026_10_16_000002_use_booking_receipts_for_cash_reporting.php')->up();
    }

    public function down(): void
    {
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['brochure_offer', 'brochure_presented_at']));
        (require __DIR__.'/2026_10_24_000002_include_brochure_receipts_in_cash_audit.php')->up();
    }
};
