<?php
require __DIR__.'/booking-food.php';
foreach (['REG-2HR', 'ALL-DAY', 'WATER-FUN', 'OVERNIGHT', '2D-1N'] as $code) $ticket($code)->update(['child_pricing' => 'age_based']);
$policyCreate = function ($code, array $ages, int $adultCount = 1, array $extra = []) use ($base, $ticket, $controller, $request) {
    $controller->store($request([...$base, 'ticket_type_id' => $ticket($code)->id,
        'adult_count' => $adultCount, 'child_count' => count($ages), 'quantity' => $adultCount + count($ages),
        'visit_end_date' => in_array($code, ['OVERNIGHT', '2D-1N']) ? '2026-12-06' : '2026-12-05',
        'child_ages' => $ages, ...$extra]));
    return App\Models\Booking::latest('id')->firstOrFail();
};
foreach ([
    ['REG-2HR', 0, '0.00'], ['REG-2HR', 3, '0.00'], ['REG-2HR', 4, null], ['REG-2HR', 5, '149.00'],
    ['WATER-FUN', 0, '0.00'], ['WATER-FUN', 4, '0.00'], ['WATER-FUN', 5, '399.50'], ['WATER-FUN', 8, '399.50'], ['WATER-FUN', 9, '799.00'],
    ['OVERNIGHT', 5, '0.00'], ['OVERNIGHT', 6, '850.00'], ['OVERNIGHT', 10, '850.00'], ['OVERNIGHT', 11, '1700.00'],
    ['2D-1N', 5, '0.00'], ['2D-1N', 6, '1099.50'], ['2D-1N', 10, '1099.50'], ['2D-1N', 11, '2199.00'],
] as [$code, $age, $price]) {
    // The legacy suite changed the Overnight rate to1700; use its current regular price.
    $booking = $policyCreate($code, [$age]);
    $child = $booking->items()->where('guest_type', 'child')->firstOrFail();
    check($child->unit_price === $price, "$code age $age must follow its policy");
    check($child->guest_age === $age && $booking->child_ages === [$age], 'Child ages must be saved');
    check(($booking->pricing_status === 'pending') === ($price === null), 'Only unknown rates may leave the quote pending');
}
$mixed = $policyCreate('WATER-FUN', [4, 5, 8, 9, null]);
check($mixed->gross_amount === '2397.00' && $mixed->balance_due === null, 'Mixed-age children need independent quotes; unknown age remains pending');
check($mixed->items()->where('guest_type', 'child')->count() === 5, 'Each different age/unknown group must retain its charge');
$sameAge = $policyCreate('WATER-FUN', [5, 5, 5]);
check($sameAge->items()->where('guest_type', 'child')->count() === 1 && $sameAge->gross_amount === '1997.50', 'Same-age children should group while charging each child correctly');
$allChildren = $policyCreate('WATER-FUN', [4, 5], 0);
check($allChildren->gross_amount === '399.50', 'An all-child group must calculate without an adult row');
$overridden = $policyCreate('WATER-FUN', [8], 1, ['child_unit_price' => 0]);
check($overridden->gross_amount === '1198.50', 'A posted manual price must not bypass an age policy');
$unknown = $policyCreate('WATER-FUN', [null]);
check($unknown->pricing_status === 'pending' && $unknown->child_unit_price === null, 'A missing age must never be assigned a rate');
fails(fn () => $policyCreate('WATER-FUN', [-1]), 'child_ages.0');
fails(fn () => $policyCreate('WATER-FUN', [18]), 'child_ages.0');
fails(fn () => $policyCreate('WATER-FUN', ['5.5']), 'child_ages.0');
fails(fn () => $policyCreate('WATER-FUN', [4], 1, ['child_ages' => []]), 'child_ages');
$water = $ticket('WATER-FUN');
$water->update(['price' => 900, 'child_pricing' => 'same']);
$controller->updateAddons($request(['child_ages' => [5], 'addons' => []], 'PUT'), $unknown);
$unknown->refresh();
check($unknown->gross_amount === '1198.50' && $unknown->balance_due === '1198.50', 'Confirming age must use the sold policy and799 price, even after catalog changes');
check($unknown->items()->where('guest_type', 'child')->first()->guest_age === 5, 'Updated age must be retained');
$controller->recordPayment($request(['amount' => 1198.50, 'paid_on' => '2026-10-16', 'payment_method' => 'cash']), $unknown);
fails(fn () => $controller->updateAddons($request(['child_ages' => [4], 'addons' => []], 'PUT'), $unknown), 'addons');
check($unknown->fresh()->child_ages === [5] && $unknown->items()->where('guest_type', 'child')->first()->unit_price === '399.50', 'An age edit below paid charges must roll back completely');
// Verify migration attaches an age policy to an existing unresolved quote, preserving its adult price.
$shiela->update(['pricing_status' => 'pending', 'child_unit_price' => null, 'child_policy' => null, 'child_ages' => null]);
$shiela->items()->where('guest_type', 'child')->update(['unit_price' => null, 'line_total' => null]);
// Run only the migration data selection after recreating its new columns in an isolated database.
(require dirname(__DIR__, 2).'/database/migrations/2026_10_16_000004_add_age_based_child_policies.php')->down();
(require dirname(__DIR__, 2).'/database/migrations/2026_10_16_000004_add_age_based_child_policies.php')->up();
$shiela->refresh();
check($shiela->child_ages === [null] && $shiela->child_policy['regular_price'] == 799, 'Existing pending bookings must get policy and unknown age using their saved adult rate');
echo "Child policies: all cutoff ages, ticket age4 pending, mixed children, cent-accurate half rates, unknown ages, validation, price-override protection, historical rates, payment rollback and pending-booking migration passed\n";
