<?php
// Dedicated browser-test server. Never uses the application's configured database.
$smokeDirectory = getenv('SDFP_NAV_SMOKE_DIR');
if (!$smokeDirectory || !is_dir($smokeDirectory)) {
    http_response_code(503);
    exit('This server requires an isolated smoke-test directory.');
}
$basePath = dirname(__DIR__, 2);
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($uri !== '/' && is_file($basePath.'/public'.$uri)) return false;
require $basePath.'/vendor/autoload.php';
$app = require $basePath.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$database = $smokeDirectory.'/test.sqlite';
if (!file_exists($database)) touch($database);
if (!is_dir($smokeDirectory.'/sessions')) mkdir($smokeDirectory.'/sessions');
config([
    'database.default' => 'sqlite', 'database.connections.sqlite.database' => $database,
    'cache.default' => 'array', 'session.driver' => 'file', 'session.files' => $smokeDirectory.'/sessions',
    // Test dates are fixed; keep session/CSRF cookies valid relative to the browser's real clock.
    'session.cookie' => 'sdfp_navigation_smoke', 'session.secure' => false, 'session.expire_on_close' => true,
    'session.lifetime' => 60 * 24 * 365 * 10,
    'app.url' => 'http://'.$_SERVER['HTTP_HOST'],
]);
Illuminate\Support\Facades\DB::purge('sqlite');
$app->make(Illuminate\Foundation\Vite::class)->useHotFile($smokeDirectory.'/unused-hot-file');
Carbon\Carbon::setTestNow('2026-10-16 12:00:00');
if (!Illuminate\Support\Facades\Schema::hasTable('users')) {
    foreach (glob($basePath.'/database/migrations/*.php') as $migration) {
        if (str_contains($migration, 'analytical_reporting_views')) continue;
        (require $migration)->up();
    }
    App\Models\User::create(['name' => 'Navigation Tester', 'email' => 'navigation@example.test', 'password' => 'smoke-test-only', 'role' => 'admin']);
    $position = App\Models\Position::create(['title' => 'Office Staff', 'base_daily_rate' => 400]);
    foreach (['park', 'soaked'] as $area) {
        App\Models\Employee::create(['employee_code' => $area, 'first_name' => 'Navigation', 'last_name' => ucfirst($area),
            'position_id' => $position->id, 'daily_rate' => 400, 'status' => 'active', 'hired_date' => '2026-01-01', 'work_area' => $area]);
    }
}
Illuminate\Support\Facades\Route::middleware('web')->get('/_smoke/start', function () {
    Illuminate\Support\Facades\Auth::loginUsingId(1);
    return redirect('/attendance');
});
// Make an actual request's pending state observable without slowing production.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && in_array($uri, ['/attendance', '/payroll', '/soaked-payroll'], true)) usleep(200000);
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request = Illuminate\Http\Request::capture());
$response->send();
$kernel->terminate($request, $response);
