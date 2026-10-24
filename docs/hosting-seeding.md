# Seed the confirmed imports on hosting

After installing the application and configuring the hosting MySQL connection in `.env`, run:

```sh
php artisan migrate --force
php artisan db:seed --force
```

Use `migrate`, not `migrate:fresh`, when keeping an existing database. No database dump or copies of the external `booking-imports` and `inventory-imports` folders are required.

`DatabaseSeeder` calls these seeders automatically:

- `ImportedBookingSeeder`: four confirmed reservations for October 24, 2026, including the October 24–25 overnight reservation. It preserves original booking references, guests, visit dates and times, package line prices, meal requests, dietary/activity notes, and three October 23 GCash deposits totaling PHP 11,700. The brochure booking's unquoted food and balance remain pending. No wristbands or future payments are invented.
- `ImportedInventorySeeder`: 80 confirmed SOAKED inventory items from the October 17 counts and October 18 purchases. It includes the final quantity and unit clarifications (including 34 packs of Surf powder and 2 individual XL garbage bags), decimal quantities, and source notes. These are final dated balances, not purchases to add repeatedly. Later consumption is not included.

The portable data lives in `database/seeders/data/imported-bookings.json` and `database/seeders/data/imported-inventory.json`. It was checked against the original import manifests and confirmed local records. Local database IDs are replaced with lookups by package code and guest contact when seeding.

Rerunning the imported-data seeders does not duplicate bookings or deposits, add purchases again, overwrite existing stock, or restore older details over staff edits. Existing booking references/import markers and inventory item codes are preserved. An unmarked booking for the same guest and visit date causes an error for review rather than creating a duplicate. Booking creation and its lines/payments are committed together in a transaction.

The older September `SoakedInventorySeeder` now also only creates missing items, so it does not reset edited stock on a later `db:seed` run. `SoakedStaffSeeder` creates missing staff/accounts, attendance and payroll records without resetting changed passwords or operational edits. Other pre-existing setup seeders still run; this is a portable snapshot of the confirmed imports, not continuous synchronization of every local database record. New setup accounts use preset passwords; change them before using the hosted application.

Sample bookings, expenses, and cash reconciliations are excluded from the default seed run. On a disposable development database only, add those separately after the default seed:

```sh
php artisan db:seed --class=DemoTransactionSeeder
```

Regression checks:

```sh
php vendor/phpunit/phpunit/phpunit --filter HostingSeedTest
```

These checks use a separate in-memory SQLite database and all table/catalog migrations. The pre-existing MySQL-only reporting-view migration is excluded, following the project's integration-test convention. They verify every imported field, corrected stock, balances, duplicate prevention, and preservation of later staff edits.
