<?php

namespace App\Http\Controllers;

use App\Models\BookingItem;
use App\Models\TicketType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    /**
     * Display park packages, pricing tiers, and performance stats.
     */
    public function index(Request $request): Response
    {
        $packages = TicketType::withCount('bookingItems')
            ->orderBy('price', 'asc')
            ->get();

        $totalPassesSold = BookingItem::sum('quantity');
        $totalRevenueGenerated = BookingItem::sum('line_total');

        return Inertia::render('packages/index', [
            'packages' => $packages,
            'stats' => [
                'totalPassesSold' => $totalPassesSold,
                'totalRevenueGenerated' => (float) $totalRevenueGenerated,
                'activePackagesCount' => $packages->where('is_active', true)->count(),
            ],
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    /**
     * Store a newly created package/rate tier.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30', 'unique:ticket_types,code'],
            'name' => ['required', 'string', 'max:100'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        TicketType::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'duration_hours' => $validated['duration_hours'] ?? 2,
            'price' => $validated['price'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'Park package created successfully.');
    }

    /**
     * Update an existing package's rate or duration.
     */
    public function update(Request $request, TicketType $package): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);

        $package->update($validated);

        return redirect()->back()->with('success', 'Package details and rates updated.');
    }
}
