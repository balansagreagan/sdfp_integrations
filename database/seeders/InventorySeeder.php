<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $items = [
            [
                'item_code' => 'LV-ADULT-M',
                'name' => 'Adult Life Vest (Medium - 50-70kg)',
                'category' => 'safety_gear',
                'quantity_in_stock' => 45,
                'min_threshold' => 10,
                'unit' => 'pcs',
                'condition_status' => 'good',
                'notes' => 'Coast Guard approved bright orange foam vest with dual buckles',
            ],
            [
                'item_code' => 'LV-ADULT-L',
                'name' => 'Adult Life Vest (Large - 70-90kg)',
                'category' => 'safety_gear',
                'quantity_in_stock' => 50,
                'min_threshold' => 10,
                'unit' => 'pcs',
                'condition_status' => 'good',
                'notes' => 'Coast Guard approved bright orange foam vest with dual buckles',
            ],
            [
                'item_code' => 'LV-KID-S',
                'name' => 'Kiddie Life Vest (Small - 15-30kg)',
                'category' => 'safety_gear',
                'quantity_in_stock' => 30,
                'min_threshold' => 8,
                'unit' => 'pcs',
                'condition_status' => 'good',
                'notes' => 'Yellow safety vest with crotch strap for child stability',
            ],
            [
                'item_code' => 'INF-SLIDE-01',
                'name' => 'Giant Inflatable Curve Water Slide',
                'category' => 'inflatables',
                'quantity_in_stock' => 2,
                'min_threshold' => 1,
                'unit' => 'units',
                'condition_status' => 'good',
                'notes' => 'Heavy duty 0.9mm PVC tarpaulin anchored to seabed',
            ],
            [
                'item_code' => 'INF-TRAMP-01',
                'name' => 'Water Trampoline & Bouncer (15ft)',
                'category' => 'inflatables',
                'quantity_in_stock' => 3,
                'min_threshold' => 1,
                'unit' => 'units',
                'condition_status' => 'good',
                'notes' => 'Includes boarding ladder and safety edge pads',
            ],
            [
                'item_code' => 'INF-BLOB-01',
                'name' => 'Water Launch Blob & Landing Mat',
                'category' => 'inflatables',
                'quantity_in_stock' => 1,
                'min_threshold' => 1,
                'unit' => 'units',
                'condition_status' => 'needs_repair',
                'notes' => 'Small seam patch required near inflation valve',
            ],
            [
                'item_code' => 'WB-ROLL-BLU',
                'name' => 'Tyvek Wristband Roll (Blue - 2hr Regular)',
                'category' => 'counter_supplies',
                'quantity_in_stock' => 1200,
                'min_threshold' => 300,
                'unit' => 'bands',
                'condition_status' => 'good',
                'notes' => 'Waterproof sequential numbered series 4000-5999',
            ],
            [
                'item_code' => 'WB-ROLL-ORG',
                'name' => 'Tyvek Wristband Roll (Orange - All Day)',
                'category' => 'counter_supplies',
                'quantity_in_stock' => 800,
                'min_threshold' => 200,
                'unit' => 'bands',
                'condition_status' => 'good',
                'notes' => 'Waterproof sequential numbered series 6000-6999',
            ],
            [
                'item_code' => 'WB-ROLL-PNK',
                'name' => 'Tyvek Wristband Roll (Pink - Afternoon/Kiddie)',
                'category' => 'counter_supplies',
                'quantity_in_stock' => 500,
                'min_threshold' => 150,
                'unit' => 'bands',
                'condition_status' => 'good',
                'notes' => 'Waterproof sequential numbered series 7000-7999',
            ],
            [
                'item_code' => 'FA-KIT-PRO',
                'name' => 'Marine Emergency First Aid & Trauma Kit',
                'category' => 'safety_gear',
                'quantity_in_stock' => 4,
                'min_threshold' => 2,
                'unit' => 'kits',
                'condition_status' => 'good',
                'notes' => 'Waterproof container with splints, bandages, antiseptic, and burn gel',
            ],
            [
                'item_code' => 'LG-TORP-BUOY',
                'name' => 'Lifeguard Torpedo Rescue Can & Rope',
                'category' => 'safety_gear',
                'quantity_in_stock' => 6,
                'min_threshold' => 3,
                'unit' => 'pcs',
                'condition_status' => 'good',
                'notes' => 'Hard polyethylene rescue can stationed on lifeguard towers',
            ],
        ];

        foreach ($items as $item) {
            InventoryItem::firstOrCreate(
                ['item_code' => $item['item_code']],
                $item
            );
        }

        foreach ([
            ['item_code' => 'SR-CHICKEN', 'name' => 'Marinated Chicken Portions', 'category' => 'perishables', 'quantity_in_stock' => 36, 'min_threshold' => 12, 'unit' => 'kg', 'unit_cost' => 185, 'condition_status' => 'good', 'notes' => 'Store chilled at 0–4°C'],
            ['item_code' => 'SR-RICE', 'name' => 'Jasmine Rice', 'category' => 'ingredients', 'quantity_in_stock' => 50, 'min_threshold' => 15, 'unit' => 'kg', 'unit_cost' => 58, 'condition_status' => 'good', 'notes' => 'Dry-store shelf A2'],
            ['item_code' => 'SR-WATER', 'name' => 'Bottled Water (500ml)', 'category' => 'beverages', 'quantity_in_stock' => 18, 'min_threshold' => 24, 'unit' => 'cases', 'unit_cost' => 140, 'condition_status' => 'good', 'notes' => 'Reorder before weekend'],
            ['item_code' => 'SR-CUPS', 'name' => 'Cold Drink Cups with Lids', 'category' => 'packaging', 'quantity_in_stock' => 400, 'min_threshold' => 200, 'unit' => 'pcs', 'unit_cost' => 3.5, 'condition_status' => 'good', 'notes' => '16 oz'],
            ['item_code' => 'SR-SANITIZER', 'name' => 'Food-Safe Surface Sanitizer', 'category' => 'cleaning', 'quantity_in_stock' => 6, 'min_threshold' => 4, 'unit' => 'bottles', 'unit_cost' => 145, 'condition_status' => 'good', 'notes' => 'Dilute according to label'],
        ] as $item) {
            InventoryItem::firstOrCreate(['item_code' => $item['item_code']], [...$item, 'inventory_location' => 'soaked_restaurant']);
        }
    }
}
