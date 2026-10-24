<?php

// Local browser fixture only: never uses the configured application database.
$temporary = getenv('SDFP_MONITORING_SMOKE_DIR');
if (! $temporary || ! is_dir($temporary)) {
    http_response_code(503);
    exit('An isolated monitoring test directory is required.');
}
$base = dirname(__DIR__, 2);
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($uri !== '/' && is_file($base.'/public'.$uri)) return false;
require $base.'/vendor/autoload.php';
$app = require $base.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$database = $temporary.'/monitoring.sqlite';
if (! file_exists($database)) touch($database);
if (! is_dir($temporary.'/sessions')) mkdir($temporary.'/sessions');
config([
    'database.default' => 'sqlite', 'database.connections.sqlite.database' => $database,
    'cache.default' => 'array', 'session.driver' => 'file', 'session.files' => $temporary.'/sessions',
    'session.cookie' => 'sdfp_monitoring_test', 'session.secure' => false, 'session.expire_on_close' => true,
    'session.lifetime' => 60 * 24 * 365 * 10, 'app.url' => 'http://'.$_SERVER['HTTP_HOST'], 'monitoring.enabled' => false,
]);
Illuminate\Support\Facades\DB::purge('sqlite');
$app->make(Illuminate\Foundation\Vite::class)->useHotFile($temporary.'/unused-hot-file');
if (! Illuminate\Support\Facades\Schema::hasTable('users')) {
    foreach (glob($base.'/database/migrations/*.php') as $migration) {
        if (str_contains($migration, 'analytical_reporting_views')) continue;
        (require $migration)->up();
    }
    foreach ([['Admin Tester', 'admin', null], ['Reporter Tester', 'staff', ['monitoring', 'maintenance']],
        ['Worker Tester', 'staff', ['monitoring', 'maintenance']], ['Stock Tester', 'staff', ['monitoring', 'inventory']]] as $index => [$name, $role, $pages]) {
        App\Models\User::create(['name' => $name, 'email' => "test{$index}@example.test", 'password' => 'local-test-only', 'role' => $role, 'page_access' => $pages]);
    }
    foreach ([['LOW', 'Low park supply', 2, 10, 'park'], ['HEALTHY', 'Healthy park supply', 10, 2, 'park'],
        ['WATCH', 'At minimum supply', 5, 5, 'park'], ['FOOD', 'Private restaurant stock', 1.25, 4.5, 'soaked_restaurant']] as [$code, $name, $stock, $min, $location]) {
        App\Models\InventoryItem::create(['item_code' => $code, 'name' => $name, 'inventory_location' => $location,
            'category' => $location === 'park' ? 'maintenance' : 'ingredients', 'quantity_in_stock' => $stock,
            'min_threshold' => $min, 'unit' => 'pcs', 'unit_cost' => 5, 'condition_status' => 'good']);
    }
}
Illuminate\Support\Facades\Route::middleware('web')->get('/_smoke/login/{user}', function (int $user) {
    abort_unless(in_array($user, [1, 2, 3, 4], true), 404);
    Illuminate\Support\Facades\Auth::loginUsingId($user);
    request()->session()->regenerate();
    return redirect('/monitoring');
});
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request = Illuminate\Http\Request::capture());
$response->send();
$kernel->terminate($request, $response);
