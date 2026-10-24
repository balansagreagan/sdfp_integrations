<?php

namespace Tests\Integration;

use App\Models\Booking;
use App\Models\BookingPayment;
use App\Models\Guest;
use App\Models\InventoryItem;
use App\Models\MaintenanceReport;
use App\Models\User;
use App\Support\SalesSummary;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CentralMonitoringTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Every test gets a separate in-memory database. Existing MySQL reporting
        // views are unrelated to these modules and cannot be created on SQLite.
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'session.driver' => 'array', 'cache.default' => 'array', 'monitoring.enabled' => false]);
        DB::purge('sqlite');
        foreach (glob(database_path('migrations/*.php')) as $migration) {
            if (str_contains($migration, 'analytical_reporting_views')) {
                continue;
            }
            (require $migration)->up();
        }
        $this->withoutVite();
    }

    private function staff(array $pages): User
    {
        return User::factory()->create(['page_access' => $pages, 'status' => 'active']);
    }

    private function item(array $attributes = []): InventoryItem
    {
        return InventoryItem::create(array_merge([
            'item_code' => 'TEST-'.uniqid(), 'inventory_location' => 'park', 'name' => 'Test supply', 'category' => 'maintenance',
            'quantity_in_stock' => 2, 'min_threshold' => 10, 'unit' => 'pcs', 'unit_cost' => 5, 'condition_status' => 'good',
        ], $attributes));
    }

    private function booking(User $user, string $date, array $attributes = []): Booking
    {
        $guest = Guest::create(['full_name' => 'Report Guest', 'contact_number' => '09000000000']);

        return Booking::create(array_merge([
            'booking_reference' => 'TEST-'.uniqid(), 'guest_id' => $guest->id, 'transaction_date' => $date,
            'playtime_date' => $date, 'visit_end_date' => $date, 'allocated_time_slot_start' => '09:00', 'allocated_time_slot_end' => '11:00',
            'total_pax' => 2, 'subtotal_amount' => 100, 'gross_amount' => 100, 'payment_method' => 'cash',
            'status' => 'completed', 'recorded_by' => $user->id, 'pricing_status' => 'complete',
        ], $attributes));
    }

    public function test_inventory_uses_numeric_decimal_boundaries_and_exact_shortages(): void
    {
        foreach ([
            [0, 5, 'out_of_stock', 5.0], [2, 10, 'low_stock', 8.0], [10, 2, 'in_stock', 0.0],
            [5, 5, 'at_minimum', 0.0], [0.1, 0.3, 'low_stock', 0.2], [0, 0, 'out_of_stock', 0.0],
        ] as [$stock, $minimum, $status, $shortage]) {
            $item = $this->item(['quantity_in_stock' => $stock, 'min_threshold' => $minimum]);
            $this->assertSame($status, $item->stock_status);
            $this->assertEquals($shortage, $item->shortage_quantity);
            $this->assertEquals(round($shortage * 5, 2), $item->estimated_purchase_cost);
        }
        $this->assertNull($this->item(['unit_cost' => null])->estimated_purchase_cost);
        $this->assertEquals(0, $this->item(['unit_cost' => 0])->estimated_purchase_cost);
    }

    public function test_stock_updates_are_location_scoped_and_validate_precision(): void
    {
        $this->actingAs($this->staff(['inventory']));
        $restaurant = $this->item(['inventory_location' => 'soaked_restaurant']);
        $this->put('/inventory/'.$restaurant->id, ['quantity_in_stock' => 30, 'condition_status' => 'good'])->assertNotFound();
        $this->get('/soaked-inventory')->assertForbidden();
        $park = $this->item();
        $this->put('/inventory/'.$park->id, ['quantity_in_stock' => 2.25, 'min_threshold' => 5.5, 'unit_cost' => 12.5, 'condition_status' => 'good'])->assertSessionHasNoErrors();
        $this->assertEquals(3.25, $park->fresh()->shortage_quantity);
        $this->assertEquals(40.63, $park->fresh()->estimated_purchase_cost);
        foreach ([-1, 2.1234, 100000000] as $invalid) {
            $this->put('/inventory/'.$park->id, ['quantity_in_stock' => $invalid, 'condition_status' => 'good'])->assertSessionHasErrors('quantity_in_stock');
        }
        $this->get('/inventory')->assertOk()->assertInertia(fn (Assert $page) => $page->component('inventory/index')->has('items', 1)->where('items.0.stock_status', 'low_stock'));
    }

    public function test_inventory_preserves_eighth_bottle_counts_and_three_decimal_shortages(): void
    {
        $this->actingAs($this->staff(['soaked-inventory']));
        $this->post('/soaked-inventory', [
            'item_code' => 'EIGHTH-BOTTLE', 'name' => 'Kitchen Sprite', 'category' => 'beverages',
            'quantity_in_stock' => '0.125', 'min_threshold' => '0.126', 'unit' => 'bottles',
        ])->assertSessionHasNoErrors();
        $item = InventoryItem::where('item_code', 'EIGHTH-BOTTLE')->firstOrFail();
        $this->assertSame('0.125', $item->quantity_in_stock);
        $this->assertSame('low_stock', $item->stock_status);
        $this->assertEquals(0.001, $item->shortage_quantity);
        $this->put('/soaked-inventory/'.$item->id, [
            'quantity_in_stock' => '1.125', 'min_threshold' => '1.250', 'unit_cost' => '5.00',
        ])->assertSessionHasNoErrors();
        $this->assertSame('1.125', $item->fresh()->quantity_in_stock);
        $this->assertEquals(0.125, $item->fresh()->shortage_quantity);
        $this->assertEquals(0.63, $item->fresh()->estimated_purchase_cost);
        $this->put('/soaked-inventory/'.$item->id, [
            'quantity_in_stock' => '0.1255', 'min_threshold' => 1,
        ])->assertSessionHasErrors('quantity_in_stock');
    }

    public function test_sales_aggregate_payment_dates_separately_from_confirmed_booking_dates(): void
    {
        $user = $this->staff(['sales-reports']);
        $old = $this->booking($user, '2026-09-30');
        $this->booking($user, '2026-10-02', ['gross_amount' => 250]);
        $this->booking($user, '2026-10-02', ['gross_amount' => 900, 'pricing_status' => 'pending']);
        $this->booking($user, '2026-10-02', ['gross_amount' => 700, 'status' => 'cancelled']);
        BookingPayment::create(['booking_id' => $old->id, 'paid_on' => '2026-10-02', 'amount' => 40.25, 'payment_method' => 'cash', 'recorded_by' => $user->id]);
        BookingPayment::create(['booking_id' => $old->id, 'paid_on' => '2026-11-01', 'amount' => 59.75, 'payment_method' => 'cash', 'recorded_by' => $user->id]);
        $report = app(SalesSummary::class)->between(CarbonImmutable::parse('2026-10-01'), CarbonImmutable::parse('2026-10-31'));
        $this->assertCount(31, $report['days']);
        $this->assertSame('40.25', $report['totals']['receipts']);
        $this->assertSame('250.00', $report['totals']['confirmed_charges']);
        $this->assertSame(2, $report['totals']['bookings']);
        $this->assertSame(1, $report['totals']['pending_quotes']);
        BookingPayment::create(['booking_id' => $old->id, 'paid_on' => '2026-10-31', 'amount' => 10, 'payment_method' => 'cash', 'recorded_by' => $user->id]);
        $lastDay = app(SalesSummary::class)->between(CarbonImmutable::parse('2026-10-31'), CarbonImmutable::parse('2026-10-31'));
        $this->assertSame('10.00', $lastDay['totals']['receipts']);
        $this->actingAs($user)->get('/sales-reports?period=day&date=2026-10-02')->assertOk()->assertInertia(fn (Assert $page) => $page->component('sales-reports/index')->has('report.days', 1)->where('report.totals.receipts', '40.25'));
        $csv = $this->get('/sales-reports/export?period=month&month=2026-10')->assertOk()->streamedContent();
        $this->assertStringContainsString('40.25', $csv);
        $this->assertStringNotContainsString('59.75', $csv);
        $this->get('/reports')->assertForbidden();
        $this->get('/sales-reports?month=2026-13')->assertSessionHasErrors('month');
    }

    public function test_monitoring_does_not_expose_unassigned_locations_or_financial_data(): void
    {
        $user = $this->staff(['monitoring', 'inventory']);
        $this->item(['name' => 'Allowed stock']);
        $this->item(['name' => 'Private stock', 'inventory_location' => 'soaked_restaurant']);
        $this->actingAs($user)->get('/monitoring')->assertOk()->assertInertia(fn (Assert $page) => $page->component('monitoring/index')
            ->where('sales', null)->where('maintenance', null)->has('inventory.purchaseItems', 1)->where('inventory.purchaseItems.0.name', 'Allowed stock'));
        foreach (['/sales-reports', '/sales-reports/export', '/maintenance', '/user-access'] as $url) {
            $this->get($url)->assertForbidden();
        }
        $user->update(['status' => 'suspended']);
        $this->get('/monitoring')->assertForbidden();
    }

    public function test_maintenance_submission_assignment_resolution_and_history_are_authorized(): void
    {
        $reporter = $this->staff(['maintenance']);
        $worker = $this->staff(['maintenance']);
        $other = $this->staff(['maintenance']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($reporter)->post('/maintenance', ['asset_name' => 'Main slide', 'location' => 'park', 'description' => 'Loose anchor', 'priority' => 'urgent', 'reported_by' => $other->id, 'assigned_to' => $other->id, 'status' => 'resolved'])->assertSessionHasNoErrors();
        $report = MaintenanceReport::firstOrFail();
        $this->assertSame($reporter->id, $report->reported_by);
        $this->assertNull($report->assigned_to);
        $this->assertSame('open', $report->status);
        $this->actingAs($other)->get('/maintenance')->assertInertia(fn (Assert $page) => $page->has('reports.data', 0)->where('stats.open', 0));
        $this->put('/maintenance/'.$report->id, ['status' => 'resolved', 'resolution_notes' => 'Forged update'])->assertForbidden();
        $this->actingAs($admin)->put('/maintenance/'.$report->id, ['status' => 'open', 'assigned_to' => $worker->id, 'due_date' => '2026-10-20', 'priority' => 'urgent'])->assertSessionHasNoErrors();
        $this->actingAs($worker)->get('/maintenance')->assertInertia(fn (Assert $page) => $page->has('reports.data', 1));
        $this->put('/maintenance/'.$report->id, ['status' => 'resolved'])->assertSessionHasErrors('resolution_notes');
        $this->put('/maintenance/'.$report->id, ['status' => 'in_progress', 'assigned_to' => $other->id])->assertSessionHasErrors('assigned_to');
        $this->put('/maintenance/'.$report->id, ['status' => 'resolved', 'resolution_notes' => 'Anchor replaced and inspected.'])->assertSessionHasNoErrors();
        $this->assertSame('resolved', $report->fresh()->status);
        $this->assertNotNull($report->fresh()->resolved_at);
        $this->assertSame(3, $report->updates()->count());
        $this->actingAs($reporter)->get('/maintenance')->assertInertia(fn (Assert $page) => $page->where('reports.data.0.resolution_notes', 'Anchor replaced and inspected.'));
    }

    public function test_maintenance_rejects_inaccessible_equipment_and_invalid_assignees(): void
    {
        $staff = $this->staff(['maintenance']);
        $item = $this->item();
        $this->actingAs($staff)->post('/maintenance', ['asset_name' => $item->name, 'location' => 'park', 'inventory_item_id' => $item->id, 'description' => 'Broken', 'priority' => 'high'])->assertForbidden();
        $report = MaintenanceReport::create(['asset_name' => 'Gate', 'location' => 'park', 'description' => 'Broken hinge', 'reported_by' => $staff->id]);
        $noAccess = $this->staff([]);
        $this->actingAs(User::factory()->create(['role' => 'admin']))->put('/maintenance/'.$report->id, ['status' => 'open', 'assigned_to' => $noAccess->id])->assertStatus(422);
    }

    public function test_admin_can_grant_and_restore_pages_but_staff_cannot_escalate(): void
    {
        $staff = $this->staff(['inventory']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($staff)->put('/user-access/'.$staff->id, ['page_access' => ['reports']])->assertForbidden();
        $this->actingAs($admin)->put('/user-access/'.$staff->id, ['page_access' => ['monitoring', 'sales-reports']])->assertSessionHasNoErrors();
        $this->assertTrue($staff->fresh()->canAccessPage('sales-reports'));
        $this->assertFalse($staff->fresh()->canAccessPage('inventory'));
        $this->assertSame('/monitoring', $staff->fresh()->landingPath());
        $this->put('/user-access/'.$staff->id, ['page_access' => []])->assertSessionHasNoErrors();
        $this->assertSame([], $staff->fresh()->accessiblePages());
        $this->put('/user-access/'.$staff->id, ['page_access' => null])->assertSessionHasNoErrors();
        $this->assertNull($staff->fresh()->page_access);
        $this->assertTrue($staff->fresh()->canAccessPage('inventory'));
        $this->put('/user-access/'.$staff->id, ['page_access' => ['user-access']])->assertSessionHasErrors('page_access.0');
    }

    public function test_login_and_lifeguard_defaults_respect_assigned_pages(): void
    {
        $lifeguard = User::factory()->create(['role' => 'lifeguard']);
        $this->actingAs($lifeguard)->get('/maintenance')->assertOk();
        $this->get('/monitoring')->assertOk()->assertInertia(fn (Assert $page) => $page->where('sales', null)->where('inventory', null));
        $this->get('/sales-reports')->assertForbidden();
        auth()->logout();
        $custom = $this->staff(['sales-reports']);
        $this->post('/login', ['email' => $custom->email, 'password' => 'password'])->assertRedirect('/sales-reports');
        $this->post('/confirm-password', ['password' => 'password'])->assertRedirect('/sales-reports');
        $this->get('/verify-email')->assertRedirect('/sales-reports');
        auth()->logout();
        $custom->update(['status' => 'inactive']);
        $this->post('/login', ['email' => $custom->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
