# Central monitoring and reporting

Open **Monitoring Center** from the sidebar for a summary of the modules assigned to your account. Refresh to load other staff members' saved changes. This page uses the same database as the entry screens; it does not maintain separate copies of reports.

## Manual entry and reports

- **Bookings / Daily Sales & COH**: continue entering bookings, payments and expenses through the existing screens. **Sales Reports** provides daily and monthly payment receipts, confirmed booking charges, booking and guest counts, and pending quotes. Choose a date or month and export the displayed period as CSV. Receipts are grouped by payment date, while charges are grouped by booking transaction date. Cancelled bookings and pending quotes are excluded from confirmed charges. Recorded receipts remain part of receipts even if their booking is later cancelled; this application does not infer refunds.
- **Park Inventory / Soaked Inventory**: enter the on-hand count, minimum stock level, unit and optional unit cost. Stock statuses distinguish out of stock, below minimum, at minimum and in stock. The purchase list calculates `max(minimum - on hand, 0)` in each item's recorded unit. At-minimum items are monitoring alerts, without an invented purchase quantity. A minimum of zero generates no purchase quantity. Unknown costs are labelled and excluded from the known cost estimate. CSV exports contain the full location's purchase list, independent of stock-table filters. Update stock after deliveries or usage; this feature does not place purchase orders or infer inventory consumption from sales.
- **Maintenance Reports**: authorized staff submit equipment or facility issues, locations, descriptions and priorities. Linking inventory is optional and requires access to that inventory location. Administrators review all reports, assign active authorized staff, and set priorities and due dates. Assigned staff update progress and resolve reports with required resolution notes. Staff see reports they submitted or were assigned. Every submission and update records the actor, status, assignment snapshot, notes and time. Reopening a resolved report clears its resolved timestamp.

## Access management

Administrators use **User Access** to select each employee's pages, including Monitoring Center, Sales Reports, inventory locations and Maintenance Reports. Custom access replaces role defaults; an empty selection blocks application pages. **Restore role defaults** removes the custom override. Navigation and backend requests use the same page policy. Inactive and suspended accounts cannot log in or access application pages. Administrative account management remains restricted to administrators.

Existing staff role access is preserved and extended with the new modules. Lifeguards receive Monitoring Center, Announcements and Maintenance Reports by default; an administrator can further restrict them. Existing custom selections do not automatically gain new pages. Monitoring Center exposes sales, inventory locations and maintenance records only when the user has the corresponding module access. Granting Sales Reports does not grant the financial audit/payroll reports.

## Setup and verification

Apply the additive maintenance-table migration and rebuild frontend assets:

```sh
php artisan migrate --path=database/migrations/2026_10_23_000001_create_maintenance_reports_table.php
npm run build
```

Run isolated integration checks (requires locked development dependencies):

```sh
php vendor/bin/phpunit tests/Integration/CentralMonitoringTest.php
npx tsc --noEmit
node tests/smoke/monitoring-browser.mjs
```

These integration tests use separate in-memory SQLite databases and skip the legacy MySQL-only analytical views. They do not modify application records.

The browser check uses a separate temporary SQLite database and a headless Chrome installation (`CHROME_PATH` can override its executable). It verifies stock entry, maintenance submission/assignment/resolution, scoped navigation, and mobile layout.
