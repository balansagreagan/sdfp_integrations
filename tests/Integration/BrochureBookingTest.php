<?php

namespace Tests\Integration;

use App\Models\AddOnItem;
use App\Models\Booking;
use App\Models\Brochure;
use App\Models\BrochureCoupon;
use App\Models\TicketType;
use App\Models\User;
use App\Support\ReceiptLedger;
use App\Support\SalesSummary;
use Carbon\CarbonImmutable;
use Database\Seeders\BrochureCatalogueSeeder;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BrochureBookingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-10-24 10:00:00'));
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'session.driver' => 'array', 'cache.default' => 'array', 'monitoring.enabled' => false]);
        DB::purge('sqlite');
        foreach (glob(database_path('migrations/*.php')) as $migration) {
            if (! str_contains($migration, 'analytical_reporting_views')) {
                (require $migration)->up();
            }
        }
        $this->seed(BrochureCatalogueSeeder::class);
        $this->withoutVite();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    private function brochure(string $card = 'CARD-001', string $source = 'sold'): Brochure
    {
        $this->post('/bookings/brochures', [
            'card_number' => $card, 'guest_name' => 'Purchaser', 'contact_number' => '09123456789',
            'source' => $source, 'purchased_on' => '2026-10-24', 'payment_method' => 'cash', 'reference' => 'Original distributor receipt 001',
            'unused_coupons' => ['restaurant:1'], 'coupons_verified' => true,
        ])->assertRedirect()->assertSessionHasNoErrors();

        return Brochure::where('card_number', $card)->firstOrFail();
    }

    private function payload(?BrochureCoupon $coupon, string $code = 'FREE-BROCHURE', int $pax = 7): array
    {
        return [
            'guest_name' => 'Visiting guest', 'contact_number' => '09999999999', 'address' => 'Dipolog',
            'playtime_date' => '2026-10-26', 'visit_end_date' => '2026-10-26', 'allocated_time_slot_start' => '09:00',
            'ticket_type_id' => TicketType::where('code', $code)->firstOrFail()->id,
            'quantity' => $pax, 'package_quantity' => 1, 'status' => 'confirmed', 'assign_wristbands' => false,
            'brochure_coupon_id' => $coupon?->id, 'addons' => [],
        ];
    }

    private function coupon(Brochure $brochure, string $type): BrochureCoupon
    {
        return $brochure->coupons()->where('type', $type)->where('state', 'unused')->firstOrFail();
    }

    private function addon(string $scope, string $price = '1000.00', string $quantity = '1'): array
    {
        $item = AddOnItem::create(['code' => 'TEST-'.AddOnItem::count(), 'name' => 'Confirmed service', 'price' => $price, 'unit' => 'order', 'is_active' => true, 'brochure_scope' => $scope]);

        return ['addon_item_id' => $item->id, 'name' => $item->name, 'quantity' => $quantity, 'unit' => 'order', 'unit_price' => $price, 'is_included' => false];
    }

    public function test_sale_issues_the_exact_printed_coupons_and_receipts_count_sale_only_once(): void
    {
        $brochure = $this->brochure();
        $this->assertSame('499.00', $brochure->amount_paid);
        $this->assertSame('2028-08-31', $brochure->expires_on->toDateString());
        $this->assertSame(18, $brochure->coupons()->count());
        $this->assertSame(['bogo_all_day' => 3, 'bogo_drinks' => 2, 'free_all_day' => 1, 'hotel' => 2, 'restaurant' => 2, 'ticket_meal' => 2, 'tour' => 2, 'two_days_one_night' => 2, 'water_rides' => 2], $brochure->coupons->groupBy('type')->map->count()->sortKeys()->all());
        $previous = $this->brochure('CARD-002', 'previous');
        $this->assertSame(1, $previous->coupons()->where('state', 'unused')->count());
        $this->assertSame(17, $previous->coupons()->where('state', 'unavailable')->count());
        $alreadyUsed = $previous->coupons()->where('type', 'free_all_day')->firstOrFail();
        $this->post('/bookings', $this->payload($alreadyUsed))->assertSessionHasErrors('brochure_coupon_id');
        $this->assertSame(499.0, ReceiptLedger::total('2026-10-24'));
        $this->assertSame(0.0, ReceiptLedger::total('2026-10-24', 'digital'));
        $summary = app(SalesSummary::class)->between(CarbonImmutable::parse('2026-10-24'), CarbonImmutable::parse('2026-10-24'));
        $this->assertSame('499.00', $summary['totals']['receipts']);
        $this->assertSame(1, $summary['totals']['payment_count']);
        $this->get('/daily-sales')->assertInertia(fn (Assert $page) => $page->where('summary.cashSales', 499)->has('salesTransactions', 1));
        $this->post('/bookings/brochures', ['card_number' => ' card-001 ', 'guest_name' => 'Again', 'contact_number' => '0999', 'source' => 'sold', 'purchased_on' => '2026-10-24', 'payment_method' => 'cash'])->assertSessionHasErrors('card_number');
        $this->assertSame(499.0, ReceiptLedger::total('2026-10-24'));
    }

    public function test_transferred_free_coupon_reserves_once_for_seven_people_without_recharging_brochure(): void
    {
        $brochure = $this->brochure();
        $coupon = $this->coupon($brochure, 'free_all_day');
        $payload = $this->payload($coupon);
        $this->post('/bookings', $payload)->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('0.00', $booking->gross_amount);
        $this->assertSame(7, $booking->total_pax);
        $this->assertNull($booking->adult_count);
        $this->assertSame('0.00', $booking->amount_paid);
        $this->assertSame('reserved', $coupon->fresh()->state);
        $this->assertSame(499.0, ReceiptLedger::total('2026-10-24'));
        $this->post('/bookings', $payload)->assertSessionHasErrors('brochure_coupon_id');
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_missing_coupon_over_capacity_late_booking_and_expired_visits_are_rejected(): void
    {
        $brochure = $this->brochure();
        $coupon = $this->coupon($brochure, 'free_all_day');
        $this->post('/bookings', $this->payload(null))->assertSessionHasErrors('brochure_coupon_id');
        $this->post('/bookings', $this->payload($coupon, pax: 8))->assertSessionHasErrors('brochure_coupon_id');
        $this->post('/bookings', array_replace($this->payload($coupon), ['playtime_date' => '2026-10-25', 'visit_end_date' => '2026-10-25']))->assertSessionHasErrors('brochure_coupon_id');
        $this->post('/bookings', array_replace($this->payload($coupon), ['playtime_date' => '2028-09-01', 'visit_end_date' => '2028-09-01']))->assertSessionHasErrors('brochure_coupon_id');
        $this->assertDatabaseCount('bookings', 0);
        $this->assertSame('unused', $coupon->fresh()->state);
    }

    public function test_physical_coupon_is_required_and_used_coupons_are_not_restored_on_cancellation(): void
    {
        $coupon = $this->coupon($this->brochure(), 'free_all_day');
        $this->post('/bookings', $this->payload($coupon))->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->travelTo(CarbonImmutable::parse('2026-10-26 09:00:00'));
        $this->patch('/bookings/'.$booking->id.'/status', ['status' => 'checked_in'])->assertSessionHasErrors('brochure_coupon_id');
        $this->patch('/bookings/'.$booking->id.'/status', ['status' => 'checked_in', 'coupon_presented' => true])->assertSessionHasNoErrors();
        $this->assertSame('used', $coupon->fresh()->state);
        $this->patch('/bookings/'.$booking->id.'/status', ['status' => 'cancelled'])->assertSessionHasNoErrors();
        $this->assertSame('used', $coupon->fresh()->state);
    }

    public function test_cancelled_reservation_releases_unused_coupon_and_cannot_steal_it_back(): void
    {
        $coupon = $this->coupon($this->brochure(), 'free_all_day');
        $this->post('/bookings', $this->payload($coupon))->assertSessionHasNoErrors();
        $original = Booking::firstOrFail();
        $this->patch('/bookings/'.$original->id.'/status', ['status' => 'cancelled'])->assertSessionHasNoErrors();
        $this->assertSame('unused', $coupon->fresh()->state);
        $this->post('/bookings', $this->payload($coupon))->assertSessionHasNoErrors();
        $reservedFor = $coupon->fresh()->booking_id;
        $this->patch('/bookings/'.$original->id.'/status', ['status' => 'cancelled'])->assertSessionHasNoErrors();
        $this->assertSame($reservedFor, $coupon->fresh()->booking_id);
        $this->assertSame('reserved', $coupon->fresh()->state);
        $this->patch('/bookings/'.$original->id.'/status', ['status' => 'confirmed'])->assertSessionHasErrors('brochure_coupon_id');
        $this->assertSame('cancelled', $original->fresh()->status);
    }

    public function test_buy_one_take_one_admission_gives_exactly_one_free_person(): void
    {
        $coupon = $this->coupon($this->brochure(), 'bogo_all_day');
        $this->post('/bookings', $this->payload($coupon, 'ALL-DAY', 4))->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('796.00', $booking->subtotal_amount);
        $this->assertSame('199.00', $booking->discount_amount);
        $this->assertSame('597.00', $booking->gross_amount);
    }

    public function test_percentage_coupons_discount_only_matching_services_and_recalculate_on_edit(): void
    {
        $coupon = $this->coupon($this->brochure(), 'restaurant');
        $food = $this->addon('restaurant');
        $ride = $this->addon('water_rides', '1300.00');
        $payload = [...$this->payload($coupon, 'ALL-DAY', 1), 'addons' => [$food, $ride]];
        $this->post('/bookings', $payload)->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('50.00', $booking->discount_amount);
        $this->assertSame('2449.00', $booking->gross_amount);
        $food['quantity'] = '2';
        $this->put('/bookings/'.$booking->id.'/addons', ['addons' => [$food, $ride]])->assertSessionHasNoErrors();
        $this->assertSame('100.00', $booking->fresh()->discount_amount);
        $this->assertSame('3399.00', $booking->fresh()->gross_amount);
    }

    public function test_discount_cannot_apply_to_included_or_custom_food_and_bogo_drinks_is_one_pair(): void
    {
        $brochure = $this->brochure();
        $food = $this->addon('restaurant');
        $this->post('/bookings', [...$this->payload($this->coupon($brochure, 'restaurant'), 'ALL-DAY', 1), 'addons' => [[...$food, 'is_included' => true]]])->assertSessionHasErrors('brochure_coupon_id');
        $this->post('/bookings', [...$this->payload($this->coupon($brochure, 'water_rides'), 'ALL-DAY', 1), 'addons' => [$food]])->assertSessionHasErrors('brochure_coupon_id');
        $drink = $this->addon('drink_bundle', '300.00', '4');
        $this->post('/bookings', [...$this->payload($this->coupon($brochure, 'bogo_drinks'), 'ALL-DAY', 1), 'addons' => [$drink]])->assertSessionHasNoErrors();
        $this->assertSame('300.00', Booking::firstOrFail()->discount_amount);
        $this->assertSame('1099.00', Booking::firstOrFail()->gross_amount);
    }

    public function test_package_coupon_applies_to_its_package_and_not_other_charges(): void
    {
        $coupon = $this->coupon($this->brochure(), 'ticket_meal');
        $this->post('/bookings', [...$this->payload($coupon, 'TICKET-MEAL', 2), 'addons' => [$this->addon('restaurant', '100.00')]])->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('79.60', $booking->discount_amount);
        $this->assertSame('816.40', $booking->gross_amount);
    }

    public function test_remaining_printed_percentage_coupons_use_their_correct_charge_scopes(): void
    {
        $brochure = $this->brochure();
        foreach ([
            ['water_rides', 'ALL-DAY', 1, [$this->addon('water_rides', '1300.00')], '130.00', '1369.00'],
            ['hotel', 'ALL-DAY', 1, [$this->addon('hotel', '3999.00')], '399.90', '3798.10'],
            ['tour', 'DAY-TOUR-2-5', 2, [], '259.80', '2338.20'],
            ['two_days_one_night', '2D-1N', 2, [], '439.80', '3958.20'],
        ] as [$type, $code, $pax, $addons, $discount, $gross]) {
            $payload = [...$this->payload($this->coupon($brochure, $type), $code, $pax), 'addons' => $addons];
            if ($type === 'two_days_one_night') {
                $payload['visit_end_date'] = '2026-10-27';
            }
            $this->post('/bookings', $payload)->assertSessionHasNoErrors();
            $booking = Booking::latest('id')->firstOrFail();
            $this->assertSame($discount, $booking->discount_amount, $type);
            $this->assertSame($gross, $booking->gross_amount, $type);
        }
    }

    public function test_old_brochure_requires_verification_and_can_register_with_no_unused_coupons(): void
    {
        $data = ['card_number' => 'OLD-001', 'guest_name' => 'Old purchaser', 'contact_number' => '09123456789',
            'source' => 'previous', 'purchased_on' => '2026-10-01', 'reference' => 'Original receipt', 'unused_coupons' => []];
        $this->post('/bookings/brochures', $data)->assertSessionHasErrors('coupons_verified');
        $this->assertDatabaseCount('brochures', 0);
        $this->post('/bookings/brochures', [...$data, 'coupons_verified' => true])->assertSessionHasNoErrors();
        $this->assertSame(0.0, ReceiptLedger::total('2026-10-01'));
        $this->assertSame(18, BrochureCoupon::where('state', 'unavailable')->count());
    }

    public function test_lifeguards_and_staff_without_booking_access_cannot_issue_brochures(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'lifeguard']))->post('/bookings/brochures', [])->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'staff', 'page_access' => []]))->post('/bookings/brochures', [])->assertForbidden();
        $this->assertDatabaseCount('brochures', 0);
    }
}
