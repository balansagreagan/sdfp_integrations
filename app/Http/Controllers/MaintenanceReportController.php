<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\MaintenanceReport;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceReportController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'in_progress', 'resolved'])],
            'priority' => ['nullable', Rule::in(['normal', 'high', 'urgent'])],
            'search' => ['nullable', 'string', 'max:150'],
        ]);
        $user = $request->user();
        $visible = MaintenanceReport::visibleTo($user);
        $stats = [
            'open' => (clone $visible)->where('status', 'open')->count(),
            'inProgress' => (clone $visible)->where('status', 'in_progress')->count(),
            'resolved' => (clone $visible)->where('status', 'resolved')->count(),
            'overdue' => (clone $visible)->where('status', '!=', 'resolved')->whereDate('due_date', '<', today())->count(),
        ];
        $reports = $visible->with(['reporter:id,name', 'assignee:id,name', 'updates.user:id,name', 'updates.assignee:id,name'])
            ->when($filters['status'] ?? null, fn ($q, $value) => $q->where('status', $value))
            ->when($filters['priority'] ?? null, fn ($q, $value) => $q->where('priority', $value))
            ->when($filters['search'] ?? null, fn ($q, $value) => $q->where(fn ($q) => $q->where('asset_name', 'like', "%{$value}%")->orWhere('description', 'like', "%{$value}%")))
            ->orderByRaw("CASE status WHEN 'resolved' THEN 1 ELSE 0 END")
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END")
            ->latest('id')->paginate(20)->withQueryString();
        $locations = [];
        if ($user->canAccessPage('inventory')) {
            $locations[] = 'park';
        }
        if ($user->canAccessPage('soaked-inventory')) {
            $locations[] = 'soaked_restaurant';
        }

        return Inertia::render('maintenance/index', [
            'reports' => $reports,
            'stats' => $stats,
            'filters' => $filters,
            'isAdmin' => $user->isAdmin(),
            'currentUserId' => $user->id,
            'assignees' => $user->isAdmin() ? User::with('employee.position')->where('status', 'active')->orderBy('name')->get()
                ->filter(fn (User $staff) => $staff->canAccessPage('maintenance'))->map(fn (User $staff) => ['id' => $staff->id, 'name' => $staff->name])->values() : [],
            'inventoryItems' => InventoryItem::whereIn('inventory_location', $locations)->orderBy('name')->get(['id', 'name', 'inventory_location'])->makeHidden(['stock_status', 'shortage_quantity', 'estimated_purchase_cost']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'asset_name' => ['required', 'string', 'max:150'],
            'location' => ['required', Rule::in(['park', 'soaked_restaurant'])],
            'inventory_item_id' => ['nullable', 'integer', 'exists:inventory_items,id'],
            'description' => ['required', 'string', 'max:5000'],
            'priority' => ['required', Rule::in(['normal', 'high', 'urgent'])],
        ]);
        if (! empty($validated['inventory_item_id'])) {
            $item = InventoryItem::findOrFail($validated['inventory_item_id']);
            $page = $item->inventory_location === 'park' ? 'inventory' : 'soaked-inventory';
            abort_unless($request->user()->canAccessPage($page), 403);
            if ($item->inventory_location !== $validated['location']) {
                throw ValidationException::withMessages(['inventory_item_id' => 'Select an item from the report location.']);
            }
        }
        DB::transaction(function () use ($validated, $request) {
            $report = MaintenanceReport::create([...$validated, 'reported_by' => $request->user()->id, 'status' => 'open']);
            $report->updates()->create(['user_id' => $request->user()->id, 'status' => 'open', 'notes' => 'Report submitted.']);
        });

        return back()->with('success', 'Maintenance report submitted. An administrator can assign the repair.');
    }

    public function update(Request $request, MaintenanceReport $report): RedirectResponse
    {
        $admin = $request->user()->isAdmin();
        abort_unless($admin || $report->assigned_to === $request->user()->id, 403);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_progress', 'resolved'])],
            'resolution_notes' => ['required_if:status,resolved', 'nullable', 'string', 'max:5000'],
            'assigned_to' => [$admin ? 'nullable' : 'prohibited', 'integer', 'exists:users,id'],
            'priority' => [$admin ? 'sometimes' : 'prohibited', Rule::in(['normal', 'high', 'urgent'])],
            'due_date' => [$admin ? 'nullable' : 'prohibited', 'date_format:Y-m-d'],
        ]);
        if (! empty($validated['assigned_to'])) {
            abort_unless(User::findOrFail($validated['assigned_to'])->canAccessPage('maintenance'), 422, 'Assign an active user who has access to maintenance reports.');
        }
        DB::transaction(function () use ($report, $validated, $request) {
            $locked = MaintenanceReport::lockForUpdate()->findOrFail($report->id);
            abort_unless($request->user()->isAdmin() || $locked->assigned_to === $request->user()->id, 403);
            $locked->update([...$validated, 'resolved_at' => $validated['status'] === 'resolved' ? ($locked->resolved_at ?? now()) : null]);
            $locked->updates()->create([
                'user_id' => $request->user()->id, 'assigned_to' => $locked->assigned_to,
                'status' => $locked->status, 'notes' => $validated['resolution_notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Maintenance report updated.');
    }
}
