<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', fn (Blueprint $table) => $table->string('address', 255)->nullable());
        Schema::table('ticket_types', function (Blueprint $table) {
            $table->string('category', 40)->default('admission');
            $table->string('variant_name', 100)->nullable();
            $table->unsignedInteger('min_pax')->default(1);
            $table->unsignedInteger('max_pax')->nullable();
            $table->unsignedInteger('included_pax')->nullable();
            $table->string('pricing_basis', 20)->default('per_person');
            $table->string('duration_label', 60)->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->nullable()->change();
        });
        Schema::table('bookings', function (Blueprint $table) {
            $table->date('visit_end_date')->nullable();
            $table->time('allocated_time_slot_end')->nullable()->change();
        });
        DB::table('bookings')->update(['visit_end_date' => DB::raw('playtime_date')]);
        Schema::table('booking_items', function (Blueprint $table) {
            $table->string('description', 255)->nullable();
            $table->string('pricing_basis', 20)->default('per_person');
        });
        Schema::create('booking_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->date('paid_on')->index();
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 30);
            $table->string('reference', 255)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        // Existing desk bookings were recorded as fully paid. Preserve their receipts.
        DB::table('bookings')->where('gross_amount', '>', 0)->orderBy('id')->chunkById(250, function ($bookings) {
            foreach ($bookings as $booking) {
                DB::table('booking_payments')->insert([
                    'booking_id' => $booking->id, 'paid_on' => $booking->transaction_date,
                    'amount' => $booking->gross_amount, 'payment_method' => $booking->payment_method,
                    'reference' => 'Existing desk booking', 'recorded_by' => $booking->recorded_by,
                    'created_at' => $booking->created_at, 'updated_at' => $booking->updated_at,
                ]);
            }
        });
        $now = now();
        foreach ([
            ['REG-2HR', 'Regular Pass (2 Hours)', 'admission', null, 149, 'per_person', 1, null, null, 2, '2 hours', null],
            ['ALL-DAY', 'All Day Pass', 'admission', null, 199, 'per_person', 1, null, null, null, 'All day', null],
            ['BILAO-5', 'Ticket + Bilao', 'ticket_bilao', '5 persons', 2199, 'per_booking', 1, null, 5, null, null, 'Boodle bundle for 5 persons.'],
            ['BILAO-10', 'Ticket + Bilao', 'ticket_bilao', '10 persons', 4299, 'per_booking', 1, null, 10, null, null, 'Boodle bundle for 10 persons.'],
            ['BILAO-15', 'Ticket + Bilao', 'ticket_bilao', '15 persons', 6399, 'per_booking', 1, null, 15, null, null, 'Boodle bundle for 15 persons.'],
            ['CAJUN-4', 'Ticket + Cajun', 'ticket_cajun', '4 persons', 1750, 'per_booking', 1, null, 4, null, null, 'Meals include rice and drinks. Booking required to check availability.'],
            ['CAJUN-8', 'Ticket + Cajun', 'ticket_cajun', '8 persons', 3199, 'per_booking', 1, null, 8, null, null, 'Meals include rice and drinks. Booking required to check availability.'],
            ['STK-4', 'Ticket + STK', 'ticket_stk', '4 persons', 1750, 'per_booking', 1, null, 4, null, null, 'Meals include rice and drinks. Booking required to check availability.'],
            ['STK-8', 'Ticket + STK', 'ticket_stk', '8 persons', 3199, 'per_booking', 1, null, 8, null, null, 'Meals include rice and drinks. Booking required to check availability.'],
            ['STK-FIESTA', 'STK Bilao Fiesta', 'ticket_stk', '6-7 persons', null, 'per_booking', 1, null, 7, null, null, 'Sinugba, Tinola and Kinilaw. Good for 6-7 persons. Price not provided.'],
            ['WATER-FUN', 'Water Fun Package', 'water_fun', null, 799, 'per_person', 1, null, null, null, 'All day', 'Unlimited floating playground, water rides and boodle lunch.'],
            ['DAY-TOUR-2-5', 'Day Tour Package', 'day_tour', '2-5 persons', 1299, 'per_person', 2, 5, null, null, 'Day tour', 'All-day waterpark, water ride (1 ride per 5-10 pax), lunch, SD Waterfalls and Caluya Shrine sightseeing and entrance fees, life vest and lifeguards.'],
            ['DAY-TOUR-6-13', 'Day Tour Package', 'day_tour', '6-13 persons', 1100, 'per_person', 6, 13, null, null, 'Day tour', 'All-day waterpark, water ride (1 ride per 5-10 pax), lunch, SD Waterfalls and Caluya Shrine sightseeing and entrance fees, life vest and lifeguards.'],
            ['DAY-TOUR-14-UP', 'Day Tour Package', 'day_tour', '14 persons and up', 999, 'per_person', 14, null, null, null, 'Day tour', 'All-day waterpark, water ride (1 ride per 5-10 pax), lunch, SD Waterfalls and Caluya Shrine sightseeing and entrance fees, life vest and lifeguards.'],
            ['OVERNIGHT', 'Overnight Package', 'overnight', null, 1600, 'per_person', 1, null, null, null, 'Overnight', 'Room, meals, floating playground, waterfalls, Caluya Shrine and swimming pool.'],
            ['2D-1N', '2D 1N Package', 'two_days_one_night', null, 2199, 'per_person', 1, null, null, null, '2 days / 1 night', 'Sapang Dalaga 2 days / 1 night package tour.'],
        ] as [$code, $name, $category, $variant, $price, $basis, $min, $max, $included, $hours, $duration, $description]) {
            DB::table('ticket_types')->insertOrIgnore([
                'code' => $code, 'name' => $name, 'category' => $category, 'variant_name' => $variant,
                'price' => $price, 'pricing_basis' => $basis, 'min_pax' => $min, 'max_pax' => $max,
                'included_pax' => $included, 'description' => $description,
                'duration_hours' => $hours, 'duration_label' => $duration,
                'is_active' => $price !== null, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        DB::table('ticket_types')->where('code', 'REG-2HR')->update(['price' => 149, 'duration_hours' => 2, 'duration_label' => '2 hours']);
        DB::table('ticket_types')->where('code', 'ALL-DAY')->update(['price' => 199, 'duration_hours' => null, 'duration_label' => 'All day']);
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_payments');
        Schema::table('booking_items', fn (Blueprint $table) => $table->dropColumn(['description', 'pricing_basis']));
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn('visit_end_date'));
        Schema::table('ticket_types', fn (Blueprint $table) => $table->dropColumn(['category', 'variant_name', 'pricing_basis', 'duration_label', 'description', 'min_pax', 'max_pax', 'included_pax']));
        Schema::table('guests', fn (Blueprint $table) => $table->dropColumn('address'));
    }
};
