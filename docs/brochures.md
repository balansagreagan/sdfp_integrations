# Brochure sales and coupon redemption

The programme follows the brochure supplied for this project: one brochure costs **PHP 499**, is transferable and non-refundable once signed and paid, and expires on **August 31, 2028**. The advertised PHP 1,393 value of the complimentary admission is not money collected.

## 1. Sell or register the physical brochure

Open **Bookings → Sell / register brochure** and use its printed card number.

- **Sell a new brochure:** record the purchaser, purchase/payment date and payment method after collecting the full PHP 499. The app issues the 18 printed coupon records and includes the sale once in Daily Sales, cash reconciliation, daily/monthly sales reports, dashboard receipts and the MySQL cash audit.
- **Previously purchased brochure:** record the original receipt/distributor reference and check only the coupons still physically present and unused. Confirm that the physical booklet was checked. This records **no new payment or revenue**. Unchecked coupons are unavailable, so previously used or missing coupons are not reissued.

Card numbers are unique and normalized to uppercase. The purchaser is recorded for reference; the brochure may be used by another guest because it is transferable. No purchase or unused coupons are invented for existing imported bookings whose card numbers were never supplied.

## 2. Reserve a coupon in a booking

In **New booking**, choose the registered card and a specific unused coupon. Enter the total people directly; brochure pricing does not require guessing adult/child counts or combine the coupon with separate child discounts. Package selection is suggested from the coupon, but the server validates it again.

| Printed coupon | Coupons per card | Application |
| --- | --- | --- |
| Free all-day play, 7 persons | 1 | One group visit of up to 7 people using Free Tickets Brochure. It is one-time use; unused places do not carry over. Food remains separate. |
| Buy 1 take 1 all-day play | 3 | All Day Pass; at least 2 people. One coupon deducts the price of one admission, not half of a larger group's total. |
| 10% water rides | 2 | Separately charged catalogue items categorized as water rides. |
| 5% SOAKED restaurant | 2 | Separately charged restaurant catalogue items. |
| Buy 1 take 1 drink bundles | 2 | One drink-bundle line with a whole-number quantity of at least 2. One bundle is complimentary. |
| 10% hotel accommodation | 2 | Separately charged hotel room catalogue items. |
| 10% tour packages | 2 | Day Tour package charge. |
| 10% 2 days / 1 night | 2 | 2D 1N package charge. |
| 10% ticket + meal | 2 | Ticket + Meal (1 person) package charge. |

One coupon is applied per booking transaction. Coupons do not stack with other promotions, with each other, or with included/free meal lines. Custom unclassified items are not eligible for service discounts. The same coupon cannot be reserved by another booking, and every coupon's status is visible in the card register.

The printed two-day advance-booking requirement is enforced for new coupon reservations. Visit and departure dates must fall within validity. The existing imported October bookings retain their historical details and are not retroactively charged PHP 499 or assigned an unprovided card number.

## 3. Redeem at the visit

A saved reservation marks the coupon **reserved**. At check-in/completion, staff must confirm the physical brochure and coupon were presented. An expired brochure is rejected. The coupon becomes **used** and cannot be used for another booking.

Cancelling a reservation releases an **unused, reserved** coupon. Cancelling after redemption does not return a used coupon or refund the brochure. A cancelled booking cannot reactivate a coupon that another booking has reserved or redeemed.

Food and service amounts are entered normally. A blank price remains pending rather than becoming free. **Edit food / confirm prices** recalculates the coupon against the revised eligible charges and prevents charges from falling below already recorded payments. The brochure's PHP 499 purchase is separate from the booking balance.

## Catalogue and deployment

**Packages & Rates** includes a **Brochure coupon category** for food/service items. Administrators may classify an item as restaurant, water rides, hotel, drink bundle, or ineligible. The printed ride/room rates and PHP 398 ticket-and-meal offer are initial catalogue data and do not overwrite existing edited prices. The drink-bundle selection and price were not specified in the supplied brochure, so its initial price remains to confirm.

For an existing hosting database, after pulling this update:

```sh
php artisan migrate --force
php artisan db:seed --class=BrochureCatalogueSeeder --force
npm ci
npm run build
```

On a fresh installation, `php artisan db:seed --force` also calls this catalogue seeder together with the previously confirmed booking/inventory seeders. No brochure sales are seeded.

Verification:

```sh
php vendor/phpunit/phpunit/phpunit --filter 'BrochureBookingTest|HostingSeedTest|CentralMonitoringTest'
node tests/smoke/brochure-browser.mjs
php tests/smoke/brochure-mysql.php
```

The browser check uses a separate SQLite database and headless Chrome. The MySQL check creates its own randomly named test database, runs all migrations and repeated seeding, verifies the brochure cash-audit receipt, tests rollback and removes that test database.
