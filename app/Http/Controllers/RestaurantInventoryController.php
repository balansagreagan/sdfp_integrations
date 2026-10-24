<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RestaurantInventoryController extends Controller
{
    public function index(): Response
    {
        $items = InventoryItem::where('inventory_location', 'soaked_restaurant')
            ->orderBy('category')->orderBy('name')->get();

        return Inertia::render('restaurant-inventory/index', [
            'items' => $items,
            'stats' => [
                'itemTypes' => $items->count(),
                'lowStock' => $items->filter(fn ($item) => $item->stock_status !== 'in_stock')->count(),
                'perishable' => $items->where('category', 'perishables')->count(),
                'stockValue' => $items->sum(fn ($item) => $item->quantity_in_stock * (float) ($item->unit_cost ?? 0)),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'max:30', 'unique:inventory_items,item_code'],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'in:ingredients,beverages,packaging,cleaning,perishables'],
            'quantity_in_stock' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'min_threshold' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'unit' => ['required', 'string', 'max:30'],
            'unit_cost' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'notes' => ['nullable', 'string'],
        ]);

        InventoryItem::create([...$validated, 'inventory_location' => 'soaked_restaurant', 'condition_status' => 'good']);

        return back()->with('success', 'Restaurant inventory item added.');
    }

    public function update(Request $request, InventoryItem $item): RedirectResponse
    {
        abort_unless($item->inventory_location === 'soaked_restaurant', 404);
        $validated = $request->validate([
            'quantity_in_stock' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'min_threshold' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'unit_cost' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'notes' => ['nullable', 'string'],
        ]);
        $item->update($validated);

        return back()->with('success', "Stock updated for {$item->name}.");
    }
}
