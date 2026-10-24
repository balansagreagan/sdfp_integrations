# SDFP Integrations

Laravel 12 + Inertia + React starter kit used as the web app for SDFP. The same `users` table can later serve a Flutter client via Laravel Sanctum (not installed yet).

## Stack

- **Backend:** Laravel 12 (PHP 8.2+), session auth
- **Frontend:** React 19, TypeScript, Inertia.js, Tailwind CSS 4
- **Bundler:** Vite

There is no separate JSON API in this repo. Controllers render Inertia pages under `resources/js/pages/`.

## Local setup

1. Copy `.env.example` to `.env` and set the database (this project uses MySQL `sdfp` locally).
2. `composer install`
3. `npm install`
4. `php artisan key:generate`
5. `php artisan migrate`
6. Run both:
   - `php artisan serve` → [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - `npm run dev`

Register an account, then open `/dashboard`.

## Hosting database setup

After configuring the hosting MySQL database, run `php artisan migrate --force` and `php artisan db:seed --force`. The default seed now includes the four confirmed October bookings and 80 imported SOAKED inventory items, including deposits and final stock corrections. No separate database import is needed for those records. See [hosting seeding instructions](docs/hosting-seeding.md) for details and rerun behavior.

## App structure

| Layer | Location |
| --- | --- |
| Model | `app/Models/User.php` (only model so far) |
| Controllers | `app/Http/Controllers/Auth/`, `app/Http/Controllers/Settings/` |
| Routes | `routes/web.php`, `routes/auth.php`, `routes/settings.php` |
| React pages | `resources/js/pages/` |
| Sidebar | `resources/js/components/app-sidebar.tsx` |

## Platform pages (sidebar)

Logged-in users see these under **Platform**. Most screens are placeholders until features are built.

- Dashboard — `/dashboard`
- Daily Sales — `/daily-sales`
- Inventory — `/inventory`
- Packages — `/packages`
- Bookings — `/bookings`
- Payroll — `/payroll`
- Reports — `/reports`
- Announcement — `/announcement`

Auth and settings (profile, password, appearance) come from the Laravel React starter kit.

## Notes

- Do not commit `.env`.
- Flutter / mobile API access would use Sanctum tokens against this same User model; the website keeps cookie sessions.

## Website monitoring

See [SDFP n8n setup notes](SDFP-n8n-workflows/SDFP-n8n-setup-notes.txt) for importing the workflows, setting the webhook credentials, and testing Telegram alerts. Laravel provides `/monitor-health` and opt-in exception reporting through `N8N_ERROR_*` environment settings.
