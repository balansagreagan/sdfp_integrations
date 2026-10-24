<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\MaintenanceReport;
use App\Support\SalesSummary;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    public function __invoke(Request $request, SalesSummary $sales): Response
    {
        $user = $request->user();
        $locations = [];
        if ($user->canAccessPage('inventory')) {
            $locations[] = 'park';
        }
        if ($user->canAccessPage('soaked-inventory')) {
            $locations[] = 'soaked_restaurant';
        }
        $stock = InventoryItem::whereIn('inventory_location', $locations)->orderBy('name')->get();
        $maintenance = null;
        if ($user->canAccessPage('maintenance')) {
            $visible = MaintenanceReport::visibleTo($user)->where('status', '!=', 'resolved');
            $maintenance = [
                'open' => (clone $visible)->count(),
                'urgent' => (clone $visible)->where('priority', 'urgent')->count(),
                'overdue' => (clone $visible)->whereDate('due_date', '<', today())->count(),
                'reports' => $visible->with('assignee:id,name')->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END")->latest('id')->limit(5)->get(),
            ];
        }

        return Inertia::render('monitoring/index', [
            'asOf' => now()->toIso8601String(),
            'sales' => $user->canAccessPage('sales-reports') ? $sales->between(CarbonImmutable::today()->startOfMonth(), CarbonImmutable::today()) : null,
            'inventory' => $locations === [] ? null : [
                'itemTypes' => $stock->count(),
                'outOfStock' => $stock->where('stock_status', 'out_of_stock')->count(),
                'purchaseItems' => $stock->where('shortage_quantity', '>', 0)->values(),
            ],
            'maintenance' => $maintenance,
        ]);
    }
}
