<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('daily-sales', function () {
        return Inertia::render('workspace', [
            'title' => 'Daily Sales',
            'href' => '/daily-sales',
        ]);
    })->name('daily-sales');

    Route::get('inventory', function () {
        return Inertia::render('workspace', [
            'title' => 'Inventory',
            'href' => '/inventory',
        ]);
    })->name('inventory');

    Route::get('packages', function () {
        return Inertia::render('workspace', [
            'title' => 'Packages',
            'href' => '/packages',
        ]);
    })->name('packages');

    Route::get('bookings', function () {
        return Inertia::render('workspace', [
            'title' => 'Bookings',
            'href' => '/bookings',
        ]);
    })->name('bookings');

    Route::get('payroll', function () {
        return Inertia::render('workspace', [
            'title' => 'Payroll',
            'href' => '/payroll',
        ]);
    })->name('payroll');

    Route::get('reports', function () {
        return Inertia::render('workspace', [
            'title' => 'Reports',
            'href' => '/reports',
        ]);
    })->name('reports');

    Route::get('announcement', function () {
        return Inertia::render('workspace', [
            'title' => 'Announcement',
            'href' => '/announcement',
        ]);
    })->name('announcement');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
