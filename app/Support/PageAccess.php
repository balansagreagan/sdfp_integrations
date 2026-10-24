<?php

namespace App\Support;

class PageAccess
{
    public const PAGES = [
        'monitoring' => 'Monitoring Center',
        'dashboard' => 'Dashboard',
        'sales-reports' => 'Daily & Monthly Sales Reports',
        'bookings' => 'Bookings',
        'daily-sales' => 'Daily Sales & COH',
        'attendance' => 'Daily Time-In/Out',
        'announcement' => 'Announcements',
        'packages' => 'Packages & Rates',
        'inventory' => 'Park Inventory',
        'soaked-inventory' => 'Soaked Inventory',
        'maintenance' => 'Maintenance Reports',
        'payroll' => 'Payroll & Shifts',
        'soaked-payroll' => 'SOAKED Payroll',
        'reports' => 'Reports & Audits',
    ];

    public const ROLE_PAGES = [
        'staff' => ['monitoring', 'dashboard', 'sales-reports', 'bookings', 'daily-sales', 'attendance', 'announcement', 'packages', 'inventory', 'soaked-inventory', 'maintenance', 'payroll', 'soaked-payroll'],
        'lifeguard' => ['monitoring', 'announcement', 'maintenance'],
    ];

    public const ADMIN_PAGES = ['staff', 'soaked-staff', 'user-access'];
}
