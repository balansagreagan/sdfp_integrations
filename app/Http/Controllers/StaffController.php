<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    /**
     * Display a listing of staff and management stats.
     */
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);
        $currentUser = $request->user();

        $employees = Employee::with(['position', 'user:id,name,email,role,status,last_login_at'])
            ->orderBy('id', 'asc')
            ->get();

        $positions = Position::orderBy('base_daily_rate', 'desc')->get();

        $totalStaff = $employees->count();
        $activeOnDuty = $employees->where('status', 'active')->count();
        $lifeguardsCount = $employees->filter(function ($emp) {
            return strtolower($emp->position?->title ?? '') === 'lifeguard';
        })->count();
        $avgDailyRate = $totalStaff > 0 ? round($employees->avg('daily_rate'), 2) : 0;

        return Inertia::render('staff/index', [
            'employees' => $employees,
            'positions' => $positions,
            'stats' => [
                'totalStaff' => $totalStaff,
                'activeOnDuty' => $activeOnDuty,
                'lifeguardsCount' => $lifeguardsCount,
                'avgDailyRate' => $avgDailyRate,
            ],
            'isAdmin' => $currentUser?->role === 'admin',
        ]);
    }

    /**
     * Store a newly created employee & optional user account.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'position_id' => ['required', 'exists:positions,id'],
            'daily_rate' => ['required', 'numeric', 'min:100'],
            'hired_date' => ['nullable', 'date'],
            'create_account' => ['nullable', 'boolean'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['nullable', 'string', 'in:admin,staff'],
        ]);

        $userId = null;
        if (!empty($validated['create_account']) && !empty($validated['email']) && !empty($validated['password'])) {
            $user = User::create([
                'name' => "{$validated['first_name']} {$validated['last_name']}",
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'] ?? 'staff',
                'status' => 'active',
            ]);
            $userId = $user->id;
        }

        // Generate next employee code
        $lastEmployee = Employee::orderBy('id', 'desc')->first();
        $nextNum = $lastEmployee ? ($lastEmployee->id + 1) : 1;
        $employeeCode = 'EMP-' . str_pad((string) $nextNum, 3, '0', STR_PAD_LEFT);

        Employee::create([
            'employee_code' => $employeeCode,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'contact_number' => $validated['contact_number'] ?? null,
            'position_id' => $validated['position_id'],
            'daily_rate' => $validated['daily_rate'],
            'user_id' => $userId,
            'status' => 'active',
            'hired_date' => $validated['hired_date'] ?? now()->toDateString(),
        ]);

        return redirect()->back()->with('success', 'Staff member enrolled successfully.');
    }

    /**
     * Update an employee's rate, position, or status.
     */
    public function update(Request $request, Employee $employee): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'position_id' => ['required', 'exists:positions,id'],
            'daily_rate' => ['required', 'numeric', 'min:100'],
            'status' => ['required', 'string', 'in:active,on_leave,terminated'],
        ]);

        $employee->update($validated);

        return redirect()->back()->with('success', 'Staff details updated.');
    }

    /**
     * Remove or terminate an employee.
     */
    public function destroy(Employee $employee): RedirectResponse
    {
        $this->ensureAdmin(request());

        $employee->update(['status' => 'terminated']);
        return redirect()->back()->with('success', 'Staff member status set to terminated.');
    }

    public function updatePosition(Request $request, Position $position): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'base_daily_rate' => ['required', 'numeric', 'min:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $position->update($validated);

        return redirect()->back()->with('success', 'Position updated.');
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()?->role !== 'admin') {
            abort(403, 'Only administrators can manage staff, positions, and daily rates.');
        }
    }
}
