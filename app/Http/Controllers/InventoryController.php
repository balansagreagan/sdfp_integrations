<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Display inventory items, safety gear, and stock alerts.
     */
    public function index(Request $request): Response
    {
        $items = InventoryItem::where('inventory_location', 'park')
            ->orderBy('category', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        $totalItemsCount = $items->count();
        $totalLifeVests = $items->filter(fn ($item) => $item->category === 'safety_gear' && str_starts_with($item->item_code, 'LV-') && $item->condition_status === 'good')->sum('quantity_in_stock');
        $lowStockItems = $items->filter(function ($item) {
            return in_array($item->stock_status, ['out_of_stock', 'low_stock', 'at_minimum'], true);
        })->count();
        $needsRepairCount = $items->where('condition_status', 'needs_repair')->count();

        return Inertia::render('inventory/index', [
            'items' => $items,
            'stats' => [
                'totalItemsCount' => $totalItemsCount,
                'totalLifeVests' => $totalLifeVests,
                'lowStockItems' => $lowStockItems,
                'needsRepairCount' => $needsRepairCount,
            ],
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    /**
     * Store a new equipment or supply item.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'max:30', 'unique:inventory_items,item_code'],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'in:safety_gear,inflatables,counter_supplies,maintenance,first_aid'],
            'quantity_in_stock' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'min_threshold' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'unit_cost' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'unit' => ['required', 'string', 'max:30'],
            'condition_status' => ['required', 'string', 'in:good,needs_repair,damaged'],
            'notes' => ['nullable', 'string'],
        ]);

        InventoryItem::create([...$validated, 'inventory_location' => 'park']);

        return redirect()->back()->with('success', 'Inventory item added to register.');
    }

    /**
     * Update an item's quantity or condition.
     */
    public function update(Request $request, InventoryItem $item): RedirectResponse
    {
        abort_unless($item->inventory_location === 'park', 404);

        $validated = $request->validate([
            'quantity_in_stock' => ['required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'min_threshold' => ['sometimes', 'required', 'numeric', 'decimal:0,3', 'min:0', 'max:99999999.999'],
            'unit_cost' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'condition_status' => ['required', 'string', 'in:good,needs_repair,damaged'],
            'notes' => ['nullable', 'string'],
        ]);

        $item->update($validated);

        return redirect()->back()->with('success', "Stock updated for {$item->name}.");
    }
}
