<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Employee;
use App\Models\InventoryItem;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ImportedBookingSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HostingSeedTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'session.driver' => 'array', 'cache.default' => 'array', 'monitoring.enabled' => false]);
        DB::purge('sqlite');
        foreach (glob(database_path('migrations/*.php')) as $migration) {
            // Match the isolated integration tests: MySQL reporting views are not used by seeders.
            if (! str_contains($migration, 'analytical_reporting_views')) {
                (require $migration)->up();
            }
        }
    }

    public function test_default_seeding_restores_confirmed_imports_on_a_fresh_database(): void
    {
        $this->seed(DatabaseSeeder::class);
        $entries = json_decode(file_get_contents(database_path('seeders/data/imported-bookings.json')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertDatabaseCount('bookings', 4);
        $this->assertDatabaseCount('booking_payments', 3);
        $this->assertDatabaseCount('wristband_allocations', 0);
        $this->assertDatabaseCount('expenses', 0);
        $this->assertDatabaseCount('daily_cash_reconciliations', 0);

        foreach ($entries as $entry) {
            $booking = Booking::with(['guest', 'items.ticketType', 'addons', 'payments'])->where('booking_reference', $entry['booking']['booking_reference'])->firstOrFail();
            $this->assertSame($entry['guest'], $booking->guest->only(array_keys($entry['guest'])));
            foreach ($entry['booking'] as $field => $value) {
                $actual = in_array($field, ['transaction_date', 'playtime_date', 'visit_end_date']) ? $booking->{$field}?->toDateString() : $booking->{$field};
                $this->assertSame($value, $actual, $field);
            }
            $this->assertCount(count($entry['items']), $booking->items);
            foreach ($entry['items'] as $index => $item) {
                $this->assertSame($item['ticket_code'], $booking->items[$index]->ticketType->code);
                unset($item['ticket_code']);
                $this->assertSame($item, $booking->items[$index]->only(array_keys($item)));
            }
            $this->assertSame($entry['addons'], $booking->addons->map(fn ($addon) => $addon->only(['name', 'quantity', 'unit', 'unit_price', 'line_total', 'is_included']))->all());
            $this->assertSame($entry['payments'], $booking->payments->map(fn ($payment) => [
                'paid_on' => $payment->paid_on->toDateString(), 'amount' => $payment->amount,
                'payment_method' => $payment->payment_method, 'reference' => $payment->reference,
            ])->all());
        }

        $this->assertSame('11700.00', number_format(DB::table('booking_payments')->sum('amount'), 2, '.', ''));
        foreach ([
            ['SDFP261023PV5A2J', '13377.00', 'partial'],
            ['SDFP26102319V9AQ', null, 'pending_quote'],
            ['SDFP261023AK15W8', '2095.00', 'partial'],
            ['SDFP261023N96PIF', '11200.00', 'partial'],
        ] as [$reference, $balance, $status]) {
            $booking = Booking::where('booking_reference', $reference)->firstOrFail();
            $this->assertSame($balance, $booking->balance_due);
            $this->assertSame($status, $booking->payment_status);
        }

        $inventory = json_decode(file_get_contents(database_path('seeders/data/imported-inventory.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(80, $inventory);
        foreach ($inventory as $item) {
            $this->assertSame($item, InventoryItem::where('item_code', $item['item_code'])->firstOrFail()->only(array_keys($item)));
        }
        $this->assertDatabaseHas('inventory_items', ['item_code' => 'SR-SURF-POWDER', 'quantity_in_stock' => 34, 'unit' => 'packs']);
        $this->assertDatabaseHas('inventory_items', ['item_code' => 'SR-GARBAGE-XL', 'quantity_in_stock' => 2, 'unit' => 'pcs']);
    }

    public function test_rerunning_seeders_preserves_operations_and_does_not_duplicate_receipts(): void
    {
        $this->seed(DatabaseSeeder::class);
        $booking = Booking::where('booking_reference', 'SDFP261023PV5A2J')->firstOrFail();
        $booking->update(['status' => 'checked_in', 'remarks' => 'Updated by hosting staff']);
        $booking->payments()->create(['paid_on' => '2026-10-24', 'amount' => '100.00', 'payment_method' => 'cash']);
        InventoryItem::where('item_code', 'SR-K-BROWN-SUGAR')->update(['quantity_in_stock' => '0.125', 'unit' => 'kg']);
        InventoryItem::where('item_code', 'SR-COKE-15')->update(['quantity_in_stock' => '1.000']);
        $employee = Employee::where('employee_code', 'SOK-001')->firstOrFail();
        $employee->update(['daily_rate' => '777.00']);
        $employee->user->update(['password' => Hash::make('hosting-new-password')]);

        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('bookings', 4);
        $this->assertDatabaseCount('booking_payments', 4);
        $this->assertSame('checked_in', $booking->fresh()->status);
        $this->assertSame('Updated by hosting staff', $booking->fresh()->remarks);
        $this->assertSame('13277.00', $booking->fresh()->balance_due);
        $this->assertSame('0.125', InventoryItem::where('item_code', 'SR-K-BROWN-SUGAR')->firstOrFail()->quantity_in_stock);
        $this->assertSame('1.000', InventoryItem::where('item_code', 'SR-COKE-15')->firstOrFail()->quantity_in_stock);
        $this->assertEquals(777, $employee->fresh()->daily_rate);
        $this->assertTrue(Hash::check('hosting-new-password', $employee->user->fresh()->password));
        $this->assertSame(80, InventoryItem::whereIn('item_code', array_column(json_decode(file_get_contents(database_path('seeders/data/imported-inventory.json')), true), 'item_code'))->count());
    }

    public function test_existing_import_markers_prevent_duplicate_bookings_with_different_references(): void
    {
        $this->seed(DatabaseSeeder::class);
        Booking::where('booking_reference', 'SDFP261023PV5A2J')->update(['booking_reference' => 'EXISTING-IMPORT']);
        $this->seed(ImportedBookingSeeder::class);
        $this->assertDatabaseCount('bookings', 4);
        $this->assertDatabaseCount('booking_payments', 3);
    }

    public function test_missing_package_rolls_back_all_imported_guests_bookings_and_receipts(): void
    {
        $this->seed(UserSeeder::class);
        DB::table('ticket_types')->where('code', 'OVERNIGHT')->delete();

        try {
            $this->seed(ImportedBookingSeeder::class);
            $this->fail('Seeding must fail when the overnight package is missing.');
        } catch (ModelNotFoundException) {
            $this->assertDatabaseCount('guests', 0);
            $this->assertDatabaseCount('bookings', 0);
            $this->assertDatabaseCount('booking_items', 0);
            $this->assertDatabaseCount('booking_addons', 0);
            $this->assertDatabaseCount('booking_payments', 0);
        }
    }
}
