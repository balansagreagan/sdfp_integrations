<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use Illuminate\Database\Seeder;

class SoakedInventorySeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['SR-COKE-15', 'Coke 1.5L', 'beverages', 8, 6, 'pcs'], ['SR-SPRITE-15', 'Sprite 1.5L', 'beverages', 13, 6, 'pcs'], ['SR-ROYAL-15', 'Royal 1.5L', 'beverages', 2, 6, 'pcs'], ['SR-NATURE-1L', 'Nature Spring 1L', 'beverages', 11, 12, 'pcs'], ['SR-MISMO-COKE', 'Mismo Coke', 'beverages', 6, 6, 'pcs'], ['SR-MISMO-SPRITE', 'Mismo Sprite', 'beverages', 14, 6, 'pcs'], ['SR-MISMO-ROYAL', 'Mismo Royal', 'beverages', 5, 6, 'pcs'], ['SR-SWAKTO-ROYAL', 'Swakto Royal', 'beverages', 15, 6, 'pcs'], ['SR-SWAKTO-SPRITE', 'Swakto Sprite', 'beverages', 14, 6, 'pcs'], ['SR-SWAKTO-COKE', 'Swakto Coke', 'beverages', 14, 6, 'pcs'],
            ['SR-GREEN-APPLE', 'Green Apple Syrup 1L', 'ingredients', .5, .5, 'bottles'], ['SR-STRAWBERRY', 'Strawberry Syrup 1L', 'ingredients', .75, .5, 'bottles'], ['SR-MANGO-SYRUP', 'Mango Syrup', 'ingredients', .75, .5, 'gallons'], ['SR-ALMOND-SYRUP', 'Almond Syrup 12.5G', 'ingredients', .25, .5, 'gallons'], ['SR-SALTED-CARAMEL', 'Salted Caramel Syrup', 'ingredients', .5, .5, 'bottles'], ['SR-CHOCOLATE-SYRUP', 'Chocolate Syrup 750G', 'ingredients', .19, .5, 'bottles'], ['SR-TARO-SYRUP', 'Taro Syrup 2.5G', 'ingredients', .5, .5, 'gallons'], ['SR-COFFEE-SYRUP', 'Coffee Syrup', 'ingredients', 0, .5, 'bottles'], ['SR-VANILLA-SYRUP', 'Vanilla Syrup 12.5G', 'ingredients', .75, .5, 'bottles'],
            ['SR-CUP-12OZ', '12 oz Paper Cup', 'packaging', 10, 5, 'packs'], ['SR-CUP-10OZ', '10 oz Paper Cup', 'packaging', 11, 5, 'packs'], ['SR-PINEAPPLE-JUICE', 'Pineapple Juice', 'beverages', 22, 12, 'pcs'], ['SR-CUP-16OZ', '16 oz Cup', 'packaging', .25, 1, 'packs'], ['SR-LID-DOME-16OZ', '16 oz Dome Lid', 'packaging', 0, 1, 'packs'], ['SR-LID-FLAT-16OZ', '16 oz Flat Lid', 'packaging', 3, 2, 'packs'], ['SR-WAX-PAPER', 'Wax Paper 12x12', 'packaging', 3, 2, 'packs'], ['SR-BOX-11-11', '11-11 Box 9x12', 'packaging', 3, 2, 'packs'], ['SR-TAKEOUT-BOX', 'Take Out Box', 'packaging', 2.75, 2, 'packs'], ['SR-SIOMAI-PLATE', 'Siomai Plate', 'packaging', 2, 2, 'packs'], ['SR-TISSUE', 'Tissue', 'packaging', 3, 2, 'packs'], ['SR-CELLOPHANE-MILK', 'Cellophane (Milk Essence)', 'packaging', 4, 2, 'pcs'], ['SR-CLING-WRAP', 'Cling Wrap', 'packaging', 1, 1, 'rolls'], ['SR-GLOVES', 'Gloves', 'cleaning', 7, 4, 'packs'], ['SR-GARBAGE-XXL', 'Garbage Bag XXL', 'cleaning', 5, 3, 'rolls'], ['SR-GARBAGE-M', 'Garbage Bag M', 'cleaning', 0, 2, 'rolls'], ['SR-STICKERS', 'Stickers (Soaked)', 'packaging', 23, 12, 'sheets'], ['SR-COFFEE-STIRRER', 'Coffee Stirrer', 'packaging', .5, 1, 'packs'], ['SR-DOUBLE-TO-CELLOPHANE', 'Double T.O. Cellophane', 'packaging', 1, 1, 'packs'],
        ];

        foreach ($items as [$itemCode, $name, $category, $quantity, $minimum, $unit]) {
            InventoryItem::firstOrCreate(['item_code' => $itemCode], ['name' => $name, 'inventory_location' => 'soaked_restaurant', 'category' => $category, 'quantity_in_stock' => $quantity, 'min_threshold' => $minimum, 'unit' => $unit, 'unit_cost' => null, 'condition_status' => 'good', 'notes' => 'Count recorded from the SOAKED checklist on September 19, 2026.']);
        }
    }
}
