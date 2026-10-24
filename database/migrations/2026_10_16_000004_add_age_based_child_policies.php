<?php

use App\Support\ChildPolicy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->json('child_ages')->nullable();
            $table->json('child_policy')->nullable();
        });
        Schema::table('booking_items', fn (Blueprint $table) => $table->unsignedTinyInteger('guest_age')->nullable());
        DB::table('ticket_types')->whereIn('category', array_keys(ChildPolicy::definitions()))
            ->where('pricing_basis', 'per_person')->where('code', '!=', 'FREE-BROCHURE')
            ->update(['child_pricing' => 'age_based']);

        // Attach the new rules only to unresolved child quotes. Completed quotes retain their saved prices.
        $pending = DB::table('bookings')->where('pricing_status', 'pending')->where('child_count', '>', 0)->whereNull('child_unit_price')->get();
        foreach ($pending as $booking) {
            $child = DB::table('booking_items')->where('booking_id', $booking->id)->where('guest_type', 'child')->whereNull('unit_price')->first();
            $ticket = $child ? DB::table('ticket_types')->where('id', $child->ticket_type_id)->first() : null;
            if (!$ticket || $ticket->child_pricing !== 'age_based') continue;
            $policy = ChildPolicy::definitions()[$ticket->category] ?? null;
            if ($policy) $policy['regular_price'] = DB::table('booking_items')->where('booking_id', $booking->id)->where('guest_type', 'adult')->value('unit_price') ?? $ticket->price;
            if ($policy) DB::table('bookings')->where('id', $booking->id)->update([
                'child_ages' => json_encode(array_fill(0, $booking->child_count, null)), 'child_policy' => json_encode($policy),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ticket_types')->where('child_pricing', 'age_based')->update(['child_pricing' => 'confirm']);
        Schema::table('booking_items', fn (Blueprint $table) => $table->dropColumn('guest_age'));
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['child_ages', 'child_policy']));
    }
};
