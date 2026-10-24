<?php

use App\Http\Controllers\AddOnItemController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DailySalesController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MaintenanceReportController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RestaurantInventoryController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\UserAccessController;
use App\Models\Booking;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\WristbandAllocation;
use App\Support\ReceiptLedger;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::middleware('user_type:admin,staff,lifeguard')->group(function () {
        Route::get('monitoring', MonitoringController::class)->name('monitoring.index');
        Route::get('maintenance', [MaintenanceReportController::class, 'index'])->name('maintenance.index');
        Route::post('maintenance', [MaintenanceReportController::class, 'store'])->name('maintenance.store');
        Route::put('maintenance/{report}', [MaintenanceReportController::class, 'update'])->name('maintenance.update');
        Route::get('sales-reports', [SalesReportController::class, 'index'])->name('sales-reports.index');
        Route::get('sales-reports/export', [SalesReportController::class, 'export'])->name('sales-reports.export');
    });
    // 1. Universal Access: Lifeguards, Staff, and Admin
    Route::middleware(['user_type:admin,staff,lifeguard'])->group(function () {
        // Announcements
        Route::get('announcement', [AnnouncementController::class, 'index'])->name('announcement.index');
        Route::post('announcement', [AnnouncementController::class, 'store'])->name('announcement.store');
        Route::delete('announcement/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcement.destroy');
    });

    // 2. Park Operations: Staff & Admin Only (Lifeguards Blocked & Redirected)
    Route::middleware(['user_type:admin,staff'])->group(function () {
        // Manual daily attendance for SDFP and Soaked employees.
        Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::post('attendance/manual-entry', [AttendanceController::class, 'store'])->name('attendance.store');

        // Operations Dashboard
        Route::get('dashboard', function () {
            $today = now()->toDateString();

            $todayBookings = Booking::where('transaction_date', $today)->count();
            $todayPax = Booking::where('transaction_date', $today)->sum('total_pax');
            $todaySales = ReceiptLedger::total($today);
            $todayCashSales = ReceiptLedger::total($today, 'cash');
            $todayCashExpenses = (float) Expense::where('expense_date', $today)->where('disbursement_method', 'cash_drawer')->sum('amount');
            $activeLifeguards = Employee::whereHas('position', function ($q) {
                $q->where('title', 'like', '%Lifeguard%');
            })->where('status', 'active')->count();

            $recentBookings = Booking::with(['guest', 'payments', 'wristbandAllocations', 'items.ticketType'])
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();

            $latestWristband = WristbandAllocation::orderBy('id', 'desc')->first();

            return Inertia::render('dashboard', [
                'metrics' => [
                    'todayBookings' => $todayBookings,
                    'todayPax' => $todayPax,
                    'todaySales' => $todaySales,
                    'todayCashExpenses' => $todayCashExpenses,
                    'expectedCoh' => round(1000.00 + $todayCashSales - $todayCashExpenses, 2),
                    'activeLifeguards' => $activeLifeguards,
                    'currentWristbandRange' => $latestWristband ? "{$latestWristband->start_number}-{$latestWristband->end_number} {$latestWristband->color}" : '4843-4854 BLUE',
                ],
                'recentBookings' => $recentBookings,
            ]);
        })->name('dashboard');

        // Bookings & Wristbands
        Route::get('bookings', [BookingController::class, 'index'])->name('bookings.index');
        Route::post('bookings', [BookingController::class, 'store'])->name('bookings.store');
        Route::post('bookings/{booking}/payments', [BookingController::class, 'recordPayment'])->name('bookings.payments');
        Route::put('bookings/{booking}/addons', [BookingController::class, 'updateAddons'])->name('bookings.addons');
        Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])->name('bookings.status');

        // Daily Sales & Cash On Hand
        Route::get('daily-sales', [DailySalesController::class, 'index'])->name('daily-sales.index');
        Route::post('daily-sales/expense', [DailySalesController::class, 'storeExpense'])->name('daily-sales.expense');
        Route::post('daily-sales/reconcile', [DailySalesController::class, 'reconcile'])->name('daily-sales.reconcile');

        // Packages & Rates
        Route::get('packages', [PackageController::class, 'index'])->name('packages.index');
        Route::post('packages', [PackageController::class, 'store'])->name('packages.store');
        Route::put('packages/{package}', [PackageController::class, 'update'])->name('packages.update');
        Route::post('packages/food-addons', [AddOnItemController::class, 'store'])->name('food-addons.store');
        Route::put('packages/food-addons/{addon}', [AddOnItemController::class, 'update'])->name('food-addons.update');

        // Park Inventory
        Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::post('inventory', [InventoryController::class, 'store'])->name('inventory.store');
        Route::put('inventory/{item}', [InventoryController::class, 'update'])->name('inventory.update');

        // Soaked Restaurant inventory
        Route::get('soaked-inventory', [RestaurantInventoryController::class, 'index'])->name('restaurant-inventory.index');
        Route::post('soaked-inventory', [RestaurantInventoryController::class, 'store'])->name('restaurant-inventory.store');
        Route::put('soaked-inventory/{item}', [RestaurantInventoryController::class, 'update'])->name('restaurant-inventory.update');

        // Payroll Register & Adjustments
        Route::get('payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::get('soaked-payroll', [PayrollController::class, 'index'])->name('soaked-payroll.index');
        Route::post('payroll/deduction', [PayrollController::class, 'addDeduction'])->name('payroll.deduction');
        Route::delete('payroll/deduction/{deduction}', [PayrollController::class, 'destroyDeduction'])->name('payroll.deduction.destroy');
        Route::post('payroll/addition', [PayrollController::class, 'addAddition'])->name('payroll.addition');
        Route::delete('payroll/addition/{addition}', [PayrollController::class, 'destroyAddition'])->name('payroll.addition.destroy');
    });

    // 3. Administration & Financial Audits: Admin Only
    Route::middleware(['user_type:admin'])->group(function () {
        Route::get('user-access', [UserAccessController::class, 'index'])->name('user-access.index');
        Route::put('user-access/{user}', [UserAccessController::class, 'update'])->name('user-access.update');
        Route::post('attendance/operating-day', [AttendanceController::class, 'toggleOperatingDay'])->name('attendance.operating-day');
        Route::post('attendance/reset-date', [AttendanceController::class, 'resetDate'])->name('attendance.reset-date');
        // Payroll Period Approval & Unlock
        Route::post('payroll/{period}/approve', [PayrollController::class, 'approve'])->name('payroll.approve');
        Route::post('payroll/{period}/unapprove', [PayrollController::class, 'unapprove'])->name('payroll.unapprove');

        // Reports & Audits
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');

        // Staff Management
        Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
        Route::get('soaked-staff', [StaffController::class, 'index'])->name('soaked-staff.index');
        Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
        Route::post('soaked-staff', [StaffController::class, 'store'])->name('soaked-staff.store');
        Route::put('staff/{employee}', [StaffController::class, 'update'])->name('staff.update');
        Route::put('staff/positions/{position}', [StaffController::class, 'updatePosition'])->name('staff.positions.update');
        Route::delete('staff/{employee}', [StaffController::class, 'destroy'])->name('staff.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
