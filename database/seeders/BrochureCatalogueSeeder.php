<?php

namespace Database\Seeders;

use App\Models\AddOnItem;
use App\Models\TicketType;
use Illuminate\Database\Seeder;

class BrochureCatalogueSeeder extends Seeder
{
    public function run(): void
    {
        TicketType::firstOrCreate(['code' => 'TICKET-MEAL'], [
            'name' => 'Ticket + Meal (Chicken or Pork Inasal)', 'category' => 'ticket_meal', 'price' => '398.00',
            'pricing_basis' => 'per_person', 'min_pax' => 1, 'child_pricing' => 'same', 'is_active' => true,
            'description' => 'Ticket + meal for one person, as printed in the brochure. Chicken or pork inasal.',
        ]);
        foreach (['BANANA-BOAT' => 'Banana Boat (10 persons)', 'DRAGON-BOAT' => 'Dragon Boat (10 persons)', 'BANANA-SLIDER' => 'Banana Slider (8 persons)', 'DISCO-BOAT' => 'Disco Boat (6 persons)', 'WAGON' => 'Wagon (6 persons)'] as $code => $name) {
            AddOnItem::firstOrCreate(['code' => $code], ['name' => $name, 'unit' => '30-minute ride', 'price' => '1300.00', 'brochure_scope' => 'water_rides', 'is_active' => true]);
        }
        foreach (['VIP-1' => ['VIP 1 room (2 pax)', '3999.00'], 'VIP-2' => ['VIP 2 room (4 pax)', '4599.00'], 'PREMIERE' => ['Premiere room (2 pax)', '2599.00'], 'DELUXE-1' => ['Deluxe 1 room (3 pax)', '2699.00'], 'DELUXE-2' => ['Deluxe 2 room (2 pax)', '1799.00'], 'BARKADAHAN-6' => ['Barkadahan room (6 pax)', '3999.00'], 'BARKADAHAN-12' => ['Barkadahan room (12 pax)', '7999.00']] as $code => [$name, $price]) {
            AddOnItem::firstOrCreate(['code' => $code], ['name' => $name, 'unit' => 'room', 'price' => $price, 'brochure_scope' => 'hotel', 'is_active' => true]);
        }
        AddOnItem::firstOrCreate(['code' => 'DRINK-BUNDLE'], ['name' => 'Drink bundle — confirm selection and price', 'unit' => 'bundle', 'price' => null, 'brochure_scope' => 'drink_bundle', 'is_active' => true]);
    }
}
