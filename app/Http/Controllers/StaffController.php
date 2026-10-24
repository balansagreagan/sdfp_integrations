<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
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
        $workArea = $request->routeIs('soaked-staff.*') ? 'soaked' : 'park';

        $employees = Employee::with(['position', 'user:id,name,email,role,status,last_login_at'])
            ->where('work_area', $workArea)
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
            'workArea' => $workArea,
        ]);
    }

    /**
     * Store a newly created employee & optional user account.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $workArea = $request->routeIs('soaked-staff.*') ? 'soaked' : 'park';

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
        $employeeCode = ($workArea === 'soaked' ? 'SOK-' : 'EMP-') . str_pad((string) $nextNum, 3, '0', STR_PAD_LEFT);

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
            'work_area' => $workArea,
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
            'create_account' => ['nullable', 'boolean'],
            'email' => ['nullable', 'email', 'max:255', 'required_if:create_account,true', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6', 'required_if:create_account,true'],
            'role' => ['nullable', 'string', 'in:admin,staff'],
        ]);

        DB::transaction(function () use ($employee, $validated) {
            $employee->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'contact_number' => $validated['contact_number'] ?? null,
                'position_id' => $validated['position_id'],
                'daily_rate' => $validated['daily_rate'],
                'status' => $validated['status'],
            ]);

            if (!empty($validated['create_account']) && !$employee->user_id) {
                $user = User::create([
                    'name' => "{$employee->first_name} {$employee->last_name}",
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'role' => $validated['role'] ?? 'staff',
                    'status' => 'active',
                ]);

                $employee->update(['user_id' => $user->id]);
            }
        });

        return redirect()->back()->with('success', !empty($validated['create_account']) ? 'Staff details updated and web login granted.' : 'Staff details updated.');
    }

    /**
     * Remove or terminate an employee.
     */
    public function destroy(Employee $employee): RedirectResponse
    {
        $this->ensureAdmin(request());

        if ($employee->attendanceShifts()->exists() || $employee->payrollLines()->exists()) {
            return redirect()->back()->with('error', 'This employee has attendance or payroll history and cannot be deleted. Set the employee to terminated instead to preserve records.');
        }

        DB::transaction(function () use ($employee) {
            $user = $employee->user;
            $employee->delete();

            // Keep the user record for audit purposes, but prevent further sign-in.
            if ($user) {
                $user->update(['status' => 'inactive']);
            }
        });

        return redirect()->back()->with('success', 'Employee deleted and linked web login disabled.');
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
