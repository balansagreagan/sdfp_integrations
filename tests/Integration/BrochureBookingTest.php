<?php

namespace Tests\Integration;

use App\Models\AddOnItem;
use App\Models\Booking;
use App\Models\Guest;
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

    private function payload(?string $offer = 'free_all_day', string $code = 'FREE-BROCHURE', int $pax = 7): array
    {
        return [
            'guest_name' => 'Visiting guest', 'contact_number' => '09999999999', 'address' => 'Dipolog',
            'playtime_date' => '2026-10-26', 'visit_end_date' => '2026-10-26', 'allocated_time_slot_start' => '09:00',
            'ticket_type_id' => TicketType::where('code', $code)->firstOrFail()->id,
            'quantity' => $pax, 'package_quantity' => 1, 'status' => 'confirmed', 'assign_wristbands' => false,
            'brochure_offer' => $offer, 'addons' => [],
        ];
    }

    private function addon(string $scope, string $price = '1000.00', string $quantity = '1'): array
    {
        $item = AddOnItem::create(['code' => 'TEST-'.AddOnItem::count(), 'name' => 'Confirmed service', 'price' => $price, 'unit' => 'order', 'is_active' => true, 'brochure_scope' => $scope]);

        return ['addon_item_id' => $item->id, 'name' => $item->name, 'quantity' => $quantity, 'unit' => 'order', 'unit_price' => $price, 'is_included' => false];
    }

    public function test_free_admission_needs_only_an_offer_and_seven_guests_without_registration(): void
    {
        $this->post('/bookings', $this->payload())->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('free_all_day', $booking->brochure_offer);
        $this->assertSame(7, $booking->total_pax);
        $this->assertNull($booking->adult_count);
        $this->assertSame('0.00', $booking->gross_amount);
        $this->assertDatabaseCount('brochures', 0);
        $this->assertDatabaseCount('brochure_coupons', 0);
        $this->get('/bookings')->assertInertia(fn (Assert $page) => $page->missing('brochures')->has('brochureOffers')->where('bookings.0.brochure_offer', 'free_all_day'));
        $this->post('/bookings/brochures', [])->assertNotFound();
    }

    public function test_brochure_fees_are_external_and_only_food_payments_enter_sales(): void
    {
        $guest = Guest::create(['full_name' => 'Historical purchaser', 'contact_number' => 'ARCHIVED']);
        DB::table('brochures')->insert(['card_number' => 'OLD-001', 'guest_id' => $guest->id, 'purchased_on' => '2026-10-24', 'expires_on' => '2028-08-31', 'source' => 'sold', 'price' => 499, 'amount_paid' => 499, 'payment_method' => 'cash']);
        $this->assertSame(0.0, ReceiptLedger::total('2026-10-24'));
        $payload = [...$this->payload(), 'addons' => [$this->addon('restaurant', '100.00')], 'payment_amount' => '100.00', 'paid_on' => '2026-10-24', 'payment_method' => 'cash'];
        $this->post('/bookings', $payload)->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('0.00', $booking->package_amount);
        $this->assertSame('100.00', $booking->gross_amount);
        $this->assertSame('100.00', $booking->amount_paid);
        $this->assertSame(100.0, ReceiptLedger::total('2026-10-24'));
        $summary = app(SalesSummary::class)->between(CarbonImmutable::parse('2026-10-24'), CarbonImmutable::parse('2026-10-24'));
        $this->assertSame('100.00', $summary['totals']['receipts']);
        $this->assertSame('100.00', $summary['totals']['confirmed_charges']);
        $this->get('/daily-sales')->assertInertia(fn (Assert $page) => $page->where('summary.cashSales', 100)->has('salesTransactions', 1));
        $this->assertDatabaseCount('brochures', 1);
    }

    public function test_food_upon_arrival_remains_unpriced_and_no_brochure_purchase_is_created(): void
    {
        $this->post('/bookings', [...$this->payload(), 'addons' => [['name' => 'Food & others upon arrival', 'quantity' => 1, 'unit' => 'request', 'unit_price' => null, 'is_included' => false]]])->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('pending', $booking->pricing_status);
        $this->assertNull($booking->balance_due);
        $this->assertSame('0.00', $booking->amount_paid);
        $this->assertSame('pending_quote', $booking->payment_status);
        $this->assertDatabaseCount('brochures', 0);
    }

    public function test_printed_guest_limit_advance_booking_and_expiry_are_validated(): void
    {
        $this->post('/bookings', $this->payload(pax: 8))->assertSessionHasErrors('brochure_offer');
        $this->post('/bookings', array_replace($this->payload(), ['playtime_date' => '2026-10-25', 'visit_end_date' => '2026-10-25']))->assertSessionHasErrors('brochure_offer');
        $this->post('/bookings', array_replace($this->payload(), ['playtime_date' => '2028-09-01', 'visit_end_date' => '2028-09-01']))->assertSessionHasErrors('brochure_offer');
        $this->post('/bookings', $this->payload('not-an-offer'))->assertSessionHasErrors('brochure_offer');
        $this->assertDatabaseCount('bookings', 0);
        $this->post('/bookings', $this->payload(null))->assertSessionHasNoErrors();
        $this->assertSame('free_all_day', Booking::firstOrFail()->brochure_offer);
    }

    public function test_check_in_records_physical_coupon_verification(): void
    {
        $this->post('/bookings', $this->payload())->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->travelTo(CarbonImmutable::parse('2026-10-26 09:00:00'));
        $this->patch('/bookings/'.$booking->id.'/status', ['status' => 'checked_in'])->assertSessionHasErrors('brochure_offer');
        $this->patch('/bookings/'.$booking->id.'/status', ['status' => 'checked_in', 'brochure_presented' => true])->assertSessionHasNoErrors();
        $this->assertNotNull($booking->fresh()->brochure_presented_at);
    }

    public function test_buy_one_take_one_admission_gives_exactly_one_free_person(): void
    {
        $coupon = 'bogo_all_day';
        $this->post('/bookings', $this->payload($coupon, 'ALL-DAY', 4))->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('796.00', $booking->subtotal_amount);
        $this->assertSame('199.00', $booking->discount_amount);
        $this->assertSame('597.00', $booking->gross_amount);
    }

    public function test_percentage_coupons_discount_only_matching_services_and_recalculate_on_edit(): void
    {
        $coupon = 'restaurant';
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
        $food = $this->addon('restaurant');
        $this->post('/bookings', [...$this->payload('restaurant', 'ALL-DAY', 1), 'addons' => [[...$food, 'is_included' => true]]])->assertSessionHasErrors('brochure_offer');
        $this->post('/bookings', [...$this->payload('water_rides', 'ALL-DAY', 1), 'addons' => [$food]])->assertSessionHasErrors('brochure_offer');
        $drink = $this->addon('drink_bundle', '300.00', '4');
        $this->post('/bookings', [...$this->payload('bogo_drinks', 'ALL-DAY', 1), 'addons' => [$drink]])->assertSessionHasNoErrors();
        $this->assertSame('300.00', Booking::firstOrFail()->discount_amount);
        $this->assertSame('1099.00', Booking::firstOrFail()->gross_amount);
    }

    public function test_package_coupon_applies_to_its_package_and_not_other_charges(): void
    {
        $coupon = 'ticket_meal';
        $this->post('/bookings', [...$this->payload($coupon, 'TICKET-MEAL', 2), 'addons' => [$this->addon('restaurant', '100.00')]])->assertSessionHasNoErrors();
        $booking = Booking::firstOrFail();
        $this->assertSame('79.60', $booking->discount_amount);
        $this->assertSame('816.40', $booking->gross_amount);
    }

    public function test_remaining_printed_percentage_coupons_use_their_correct_charge_scopes(): void
    {
        foreach ([
            ['water_rides', 'ALL-DAY', 1, [$this->addon('water_rides', '1300.00')], '130.00', '1369.00'],
            ['hotel', 'ALL-DAY', 1, [$this->addon('hotel', '3999.00')], '399.90', '3798.10'],
            ['tour', 'DAY-TOUR-2-5', 2, [], '259.80', '2338.20'],
            ['two_days_one_night', '2D-1N', 2, [], '439.80', '3958.20'],
        ] as [$type, $code, $pax, $addons, $discount, $gross]) {
            $payload = [...$this->payload($type, $code, $pax), 'addons' => $addons];
            if ($type === 'two_days_one_night') {
                $payload['visit_end_date'] = '2026-10-27';
            }
            $this->post('/bookings', $payload)->assertSessionHasNoErrors();
            $booking = Booking::latest('id')->firstOrFail();
            $this->assertSame($discount, $booking->discount_amount, $type);
            $this->assertSame($gross, $booking->gross_amount, $type);
        }
    }

    public function test_users_without_booking_access_cannot_apply_offers(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'lifeguard']))->post('/bookings', $this->payload())->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'staff', 'page_access' => []]))->post('/bookings', $this->payload())->assertForbidden();
        $this->assertDatabaseCount('bookings', 0);
    }
}
