<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DailySalesController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StaffController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    // 1. Universal Access: Lifeguards, Staff, and Admin
    Route::middleware(['user_type:admin,staff,lifeguard'])->group(function () {
        // Daily Attendance (Time-In/Out Page)
        Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::post('attendance/time-in-out', [AttendanceController::class, 'store'])->name('attendance.store');

        // Announcements
        Route::get('announcement', [AnnouncementController::class, 'index'])->name('announcement.index');
        Route::post('announcement', [AnnouncementController::class, 'store'])->name('announcement.store');
        Route::delete('announcement/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcement.destroy');
    });

    // 2. Park Operations: Staff & Admin Only (Lifeguards Blocked & Redirected)
    Route::middleware(['user_type:admin,staff'])->group(function () {
        // Operations Dashboard
        Route::get('dashboard', function () {
            $today = now()->toDateString();

            $todayBookings = \App\Models\Booking::where('transaction_date', $today)->count();
            $todayPax = \App\Models\Booking::where('transaction_date', $today)->sum('total_pax');
            $todaySales = (float) \App\Models\Booking::where('transaction_date', $today)->where('status', '!=', 'cancelled')->sum('gross_amount');
            $todayCashExpenses = (float) \App\Models\Expense::where('expense_date', $today)->where('disbursement_method', 'cash_drawer')->sum('amount');
            $activeLifeguards = \App\Models\Employee::whereHas('position', function ($q) {
                $q->where('title', 'like', '%Lifeguard%');
            })->where('status', 'active')->count();

            $recentBookings = \App\Models\Booking::with(['guest', 'wristbandAllocations', 'items.ticketType'])
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();

            $latestWristband = \App\Models\WristbandAllocation::orderBy('id', 'desc')->first();

            return Inertia::render('dashboard', [
                'metrics' => [
                    'todayBookings' => $todayBookings,
                    'todayPax' => $todayPax,
                    'todaySales' => $todaySales,
                    'todayCashExpenses' => $todayCashExpenses,
                    'expectedCoh' => round(1000.00 + $todaySales - $todayCashExpenses, 2),
                    'activeLifeguards' => $activeLifeguards,
                    'currentWristbandRange' => $latestWristband ? "{$latestWristband->start_number}-{$latestWristband->end_number} {$latestWristband->color}" : '4843-4854 BLUE',
                ],
                'recentBookings' => $recentBookings,
            ]);
        })->name('dashboard');

        // Bookings & Wristbands
        Route::get('bookings', [BookingController::class, 'index'])->name('bookings.index');
        Route::post('bookings', [BookingController::class, 'store'])->name('bookings.store');
        Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])->name('bookings.status');

        // Daily Sales & Cash On Hand
        Route::get('daily-sales', [DailySalesController::class, 'index'])->name('daily-sales.index');
        Route::post('daily-sales/expense', [DailySalesController::class, 'storeExpense'])->name('daily-sales.expense');
        Route::post('daily-sales/reconcile', [DailySalesController::class, 'reconcile'])->name('daily-sales.reconcile');

        // Packages & Rates
        Route::get('packages', [PackageController::class, 'index'])->name('packages.index');
        Route::post('packages', [PackageController::class, 'store'])->name('packages.store');
        Route::put('packages/{package}', [PackageController::class, 'update'])->name('packages.update');

        // Park Inventory
        Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::post('inventory', [InventoryController::class, 'store'])->name('inventory.store');
        Route::put('inventory/{item}', [InventoryController::class, 'update'])->name('inventory.update');

        // Payroll Register & Adjustments
        Route::get('payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::post('payroll/shift', [PayrollController::class, 'toggleShift'])->name('payroll.shift');
        Route::post('payroll/deduction', [PayrollController::class, 'addDeduction'])->name('payroll.deduction');
        Route::delete('payroll/deduction/{deduction}', [PayrollController::class, 'destroyDeduction'])->name('payroll.deduction.destroy');
        Route::post('payroll/addition', [PayrollController::class, 'addAddition'])->name('payroll.addition');
        Route::delete('payroll/addition/{addition}', [PayrollController::class, 'destroyAddition'])->name('payroll.addition.destroy');
    });

    // 3. Administration & Financial Audits: Admin Only
    Route::middleware(['user_type:admin'])->group(function () {
        // Payroll Period Approval & Unlock
        Route::post('payroll/{period}/approve', [PayrollController::class, 'approve'])->name('payroll.approve');
        Route::post('payroll/{period}/unapprove', [PayrollController::class, 'unapprove'])->name('payroll.unapprove');

        // Reports & Audits
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');

        // Staff Management
        Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
        Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
        Route::put('staff/{employee}', [StaffController::class, 'update'])->name('staff.update');
        Route::put('staff/positions/{position}', [StaffController::class, 'updatePosition'])->name('staff.positions.update');
        Route::delete('staff/{employee}', [StaffController::class, 'destroy'])->name('staff.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
