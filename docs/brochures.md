# Brochure offers in bookings

Brochures are purchased **outside this system**. The app does not sell brochures, register cards or manage their remaining coupon inventory. The external PHP 499 purchase is not added to booking charges, Daily Sales, reports or cash reconciliation.

## Enter a booking

1. Open **Bookings > New booking**.
2. Choose **Brochure offer > Offer used**, or leave **No brochure offer** for a regular booking.
3. Enter guest details, visit dates, arrival time and total people. Brochure offers use the person count directly, without guessing adult/child counts. The matching ticket/package is suggested automatically.
4. Add food and other services separately. Leave an unknown price blank so the final total remains pending. Mark an included/free item explicitly as included.
5. Save the reservation. At check-in, confirm that staff verified the physical brochure coupon.

No card registration or proof of the external PHP 499 payment is required by the app. Staff check the physical coupon's validity, prior use and any card reference outside the system. Use the optional **Promotion / brochure reference** field when a reference is available.

For Esterlodie's example: select **Free all-day play - up to 7 persons**, enter **7 guests**, and add **Food & others upon arrival** as a custom add-on with a blank price. Admission is zero; food and the final balance remain pending. No PHP 499 charge or brochure-sale receipt is created. This reservation is already in the hosting seed data, so avoid creating it again.

## Offers

| Offer | Calculation |
| --- | --- |
| Free all-day play | Complimentary admission for up to 7 people in one visit; food is separate. |
| Buy 1 take 1 all-day play | All Day Pass for at least 2 people; one admission is complimentary. |
| 10% water rides | Separately charged catalogue items categorized as water rides. |
| 5% SOAKED restaurant | Separately charged restaurant catalogue items. |
| Buy 1 take 1 drink bundles | One drink-bundle line with a whole-number quantity of at least 2; one bundle is complimentary. |
| 10% hotel accommodation | Separately charged hotel room catalogue items. |
| 10% tour packages | Day Tour package charge. |
| 10% 2 days / 1 night | 2D 1N package charge. |
| 10% ticket + meal | Ticket + Meal (1 person) package charge. |

Select one offer per booking transaction. Included meals, custom unclassified items and unrelated services do not receive an additional percentage discount. The printed expiry (August 31, 2028) and two-day advance-booking requirement apply to new offer bookings. Historical imported bookings retain their original details.

**Edit food / confirm prices** recalculates the matching discount and final balance. Only actual booking payments enter sales and cash totals.

In **Packages & Rates**, administrators classify catalogue items using **Brochure coupon category**. Printed ride/room rates and the PHP 398 ticket-and-meal offer are initial catalogue data; existing edited prices are preserved. The drink-bundle selection and price were not supplied, so that price remains to confirm.

## Hosting update

After pulling the update:

```sh
php artisan migrate --force
php artisan db:seed --class=BrochureCatalogueSeeder --force
npm ci
npm run build
```

On a fresh installation, the normal `db:seed --force` includes the catalogue and previously confirmed booking/inventory data. No brochure sales are seeded. The upgrade retains previously recorded booking offers and historical data while excluding external brochure fees from park receipts.

Verification:

```sh
php vendor/phpunit/phpunit/phpunit --filter 'BrochureBookingTest|HostingSeedTest|CentralMonitoringTest'
node tests/smoke/brochure-browser.mjs
php tests/smoke/brochure-mysql.php
```
