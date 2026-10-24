<?php
// Reuses the isolated database and regression checks; never writes to the application database.
require __DIR__.'/booking-packages.php';
// Keep legacy manual child quotes covered; the age-based policy has its own regression checks.
$ticket('WATER-FUN')->update(['child_pricing' => 'confirm']);
$foodRow = function (string $code, $quantity = 1, $price = 'catalog', $included = false) {
    $item = App\Models\AddOnItem::where('code', $code)->firstOrFail();
    return ['addon_item_id' => $item->id, 'name' => $item->name, 'quantity' => $quantity,
        'unit' => $item->unit, 'unit_price' => $price === 'catalog' ? $item->price : $price, 'is_included' => $included];
};
$mariaData = [...$base, 'guest_name' => 'Banawan, Maria Clarinda', 'contact_number' => '09129637159',
    'address' => 'Mobod, Oroquieta City', 'playtime_date' => '2026-10-11', 'visit_end_date' => '2026-10-11',
    'allocated_time_slot_start' => '10:00', 'ticket_type_id' => $ticket('FREE-BROCHURE')->id, 'quantity' => 7,
    'promotion_reference' => 'FREE TICKETS BROCHURE',
    'addons' => [$foodRow('BILAO-BOODLE-1'), $foodRow('TUNA-KINILAW'), $foodRow('TUNA-PANGA')]];
$controller->store($request($mariaData));
$maria = App\Models\Booking::latest('id')->firstOrFail();
check($maria->gross_amount === '1967.00' && $maria->balance_due === '1967.00', 'Free admission must still charge 1967 for food');
check($maria->package_amount === '0.00' && $maria->addons()->count() === 3 && $maria->payments()->count() === 0, 'Free tickets are explicit, food and receipts separate');
check($maria->adult_count === null && $maria->child_count === null, 'Unknown adult/child counts must not be invented');
$shielaData = [...$base, 'guest_name' => 'Shiela Marie Gadiano', 'contact_number' => '09067143929', 'address' => 'Pagadian City',
    'playtime_date' => '2026-10-10', 'visit_end_date' => '2026-10-10', 'allocated_time_slot_start' => '08:00',
    'ticket_type_id' => $ticket('WATER-FUN')->id, 'quantity' => 5, 'adult_count' => 4, 'child_count' => 1,
    'food_serving_time' => '11:00', 'addons' => [$foodRow('CAJUN-MIX'), $foodRow('TUNA-BELLY'), $foodRow('RICE', 2), $foodRow('PINEAPPLE-JUICE', 2)]];
$controller->store($request($shielaData));
$shiela = App\Models\Booking::latest('id')->firstOrFail();
check($shiela->gross_amount === '4195.00' && $shiela->package_amount === '3196.00', 'Known charges must be 4 adults at799 plus Cajun999');
check($shiela->pricing_status === 'pending' && $shiela->balance_due === null && $shiela->payment_status === 'pending_quote', 'Unpriced children/food must never appear free or fully paid');
check($shiela->child_unit_price === null && $shiela->items()->where('guest_type', 'child')->first()->unit_price === null, 'The child quote must remain pending');
check($shiela->addons()->whereNull('unit_price')->count() === 3 && $shiela->food_serving_time === '11:00', 'Serving time and three unpriced food lines must be kept');
check($shiela->total_pax === 5 && $shiela->adult_count === 4 && $shiela->child_count === 1, 'Adult/child counts must be saved');
$props = $view($controller);
check($props['stats']['pendingPricingCount'] === 1, 'Pending quote count must be shown');
fails(fn () => $controller->store($request([...$shielaData, 'quantity' => 6])), 'adult_count');
fails(fn () => $controller->store($request([...$shielaData, 'payment_amount' => 4196])), 'payment_amount');
fails(fn () => $controller->recordPayment($request(['amount' => 4196, 'paid_on' => '2026-10-16', 'payment_method' => 'cash']), $shiela), 'amount');
$controller->recordPayment($request(['amount' => 1000, 'paid_on' => '2026-10-16', 'payment_method' => 'cash']), $shiela);
check($shiela->fresh()->known_balance_due === '3195.00' && $shiela->fresh()->balance_due === null, 'Deposits reduce known charges without claiming a final balance');
// Test-only quoted prices, never used as actual customer prices.
$confirmed = ['child_unit_price' => 400, 'food_serving_time' => '11:30',
    'addons' => [$foodRow('CAJUN-MIX'), $foodRow('TUNA-BELLY', 1, 450), $foodRow('RICE', 2, 25), $foodRow('PINEAPPLE-JUICE', 2, 40)]];
$controller->updateAddons($request($confirmed, 'PUT'), $shiela);
$shiela->refresh();
check($shiela->pricing_status === 'complete' && $shiela->gross_amount === '5175.00' && $shiela->balance_due === '4175.00', 'Confirming child and food quotes must calculate the final total');
check($shiela->food_serving_time === '11:30' && $shiela->items()->where('guest_type', 'adult')->first()->unit_price === '799.00', 'Quote editing must preserve sold adult rates');
$controller->recordPayment($request(['amount' => 4175, 'paid_on' => '2026-10-16', 'payment_method' => 'cash']), $shiela);
fails(fn () => $controller->updateAddons($request(['child_unit_price' => 0, 'addons' => [], 'food_serving_time' => '11:00'], 'PUT'), $shiela), 'addons');
check($shiela->fresh()->gross_amount === '5175.00' && $shiela->addons()->count() === 4 && $shiela->items()->where('guest_type', 'child')->first()->unit_price === '400.00', 'A failed price edit must roll back package/food changes');
$water = $ticket('WATER-FUN');
$water->update(['child_pricing' => 'same']);
$controller->store($request([...$shielaData, 'addons' => []]));
check(App\Models\Booking::latest('id')->first()->gross_amount === '3995.00', 'Same child pricing must charge all five at799');
$water->update(['child_pricing' => 'custom', 'child_price' => 300]);
$controller->store($request([...$shielaData, 'addons' => []]));
check(App\Models\Booking::latest('id')->first()->gross_amount === '3496.00', 'Configured child price must be applied');
$controller->store($request([...$shielaData, 'addons' => [], 'child_unit_price' => 0]));
check(App\Models\Booking::latest('id')->first()->gross_amount === '3196.00' && App\Models\Booking::latest('id')->first()->pricing_status === 'complete', 'An explicitly free child must remain distinct from an unknown rate');
$controller->store($request([...$mariaData, 'addons' => [$foodRow('RICE', '2.50', '20.25'), $foodRow('PINEAPPLE-JUICE', 2, null, true)]]));
$fractional = App\Models\Booking::latest('id')->first();
check($fractional->gross_amount === '50.63' && $fractional->pricing_status === 'complete', 'Food quantities must round to cents and included items must cost zero');
$catalogController = app(App\Http\Controllers\AddOnItemController::class);
$catalogController->store($request(['code' => 'NEW-FOOD', 'name' => 'New Food', 'unit' => 'order', 'price' => null, 'is_active' => true]));
$catalog = App\Models\AddOnItem::where('code', 'NEW-FOOD')->firstOrFail();
check($catalog->price === null, 'Catalog must allow unpriced food');
$catalogController->update($request(['name' => 'Updated Food', 'unit' => 'order', 'price' => 250, 'is_active' => false], 'PUT'), $catalog);
fails(fn () => $controller->store($request([...$mariaData, 'addons' => [$foodRow('NEW-FOOD')]])), 'addons.0.addon_item_id');
$original = App\Models\AddOnItem::where('code', 'BILAO-BOODLE-1')->firstOrFail();
$original->update(['price' => 1500]);
check($maria->addons()->where('addon_item_id', $original->id)->first()->unit_price === '1299.00', 'Catalog price edits must preserve sold food prices');
echo "Booking food: both samples, adult/child policies, pending quotes, serving time, paid food with free tickets, later quote confirmation, receipt limits, rollback, included food, quantity rounding and catalog changes passed\n";
