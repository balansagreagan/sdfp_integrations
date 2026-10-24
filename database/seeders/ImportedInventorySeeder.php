<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportedInventorySeeder extends Seeder
{
    public function run(): void
    {
        $items = json_decode(file_get_contents(__DIR__.'/data/imported-inventory.json'), true, flags: JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                // These are final confirmed balances, not receipts to add on every run.
                InventoryItem::firstOrCreate(['item_code' => $item['item_code']], $item);
            }
        });
    }
}
