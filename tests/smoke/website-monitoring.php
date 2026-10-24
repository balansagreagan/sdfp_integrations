<?php

// Standalone regression checks: no database, PHPUnit, or external services required.
use App\Support\WebsiteErrorReporter;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

require dirname(__DIR__, 2).'/vendor/autoload.php';
putenv('APP_ENV=testing');
putenv('APP_RUNNING_IN_CONSOLE=false');
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
set_exception_handler(function (Throwable $exception): void {
    fwrite(STDERR, get_class($exception).': '.$exception->getMessage().' at line '.$exception->getLine()."\n");
    exit(1);
});
$check = function (bool $condition, string $message): void {
    if (! $condition) {
        throw new RuntimeException($message);
    }
};

$logger = new class extends NullLogger
{
    public array $entries = [];

    public function log($level, string|Stringable $message, array $context = []): void
    {
        $this->entries[] = $message;
    }
};
$app->instance(LoggerInterface::class, $logger);

config(['monitoring.enabled' => false, 'session.driver' => 'array']);
$fake = function ($callbacks = null): void {
    Http::swap(new \Illuminate\Http\Client\Factory);
    Http::preventStrayRequests();
    Http::fake($callbacks);
};
$fake();
$reporter = $app->make(WebsiteErrorReporter::class);
$check(! $reporter->report(new RuntimeException('disabled')), 'Disabled monitoring must not send');
$check(Http::recorded()->isEmpty(), 'Disabled monitoring sent a request');

$health = $kernel->handle(Request::create('/monitor-health'));
$check($health->getStatusCode() === 200 && json_decode($health->getContent(), true) === ['status' => 'ok'], 'Public health endpoint failed');
$check(str_contains($health->headers->get('Cache-Control'), 'no-store'), 'Health must not be cached');
$check(! $health->headers->has('Set-Cookie'), 'Health must not start a session');

config([
    'monitoring.enabled' => true,
    'monitoring.webhook_url' => 'https://monitor.example/webhook/sdfp-error-alert',
    'monitoring.header_name' => 'X-SDFP-Monitor-Key',
    'monitoring.header_secret' => 'test-only-secret',
    'monitoring.source' => 'sdfp-website',
]);
Route::get('/_monitoring-regression/{staff}', function () {
    throw new RuntimeException('Sensitive password, customer@example.com, stack details');
});
$fake(['monitor.example/*' => Http::response([], 200)]);
$response = $kernel->handle(Request::create('/_monitoring-regression/123?access_token=secret'));
$check($response->getStatusCode() === 500, 'Original error response changed');
$recorded = Http::recorded();
$check($recorded->count() === 1, 'Exception callback must send one report');
$request = $recorded[0][0];
$data = $request->data();
$check($request->hasHeader('X-SDFP-Monitor-Key', 'test-only-secret'), 'Missing Header Auth');
$check($data['severity'] === 'high' && $data['error_type'] === 'RuntimeException', 'Incorrect exception metadata');
$check($data['route'] === '_monitoring-regression/{staff}', 'Route parameters leaked');
$check(array_keys($data) === ['source', 'severity', 'error_type', 'environment', 'route', 'occurred_at'], 'Unexpected payload fields');
$check(! str_contains(json_encode($data), 'secret') && ! str_contains(json_encode($data), 'customer@'), 'Sensitive data leaked');
$check(count($logger->entries) > 0, 'Default exception logging was suppressed');
$check((bool) date_create_immutable($data['occurred_at']), 'Timestamp is invalid');

$fake(['monitor.example/*' => Http::response([], 200)]);
$check($reporter->report(new Error('test fatal')), 'Critical error report failed');
$check(Http::recorded()[0][0]->data()['severity'] === 'critical', 'PHP errors must be critical');

foreach ([401, 500] as $status) {
    $fake(['monitor.example/*' => Http::response([], $status)]);
    $check(! $reporter->report(new RuntimeException('test')), 'HTTP delivery failure must return false');
}
$fake(fn () => throw new ConnectionException('test connection refused'));
$check(! $reporter->report(new RuntimeException('test')), 'Connection failure must be contained');
$app->make(ExceptionHandler::class)->report(new RuntimeException('original failure'));
$check(end($logger->entries) === 'original failure', 'Delivery failure interrupted original logging');

config(['monitoring.header_secret' => '']);
$fake();
$check(! $reporter->report(new RuntimeException('test')) && Http::recorded()->isEmpty(), 'Missing credentials must not send');

echo "Website monitoring passed: health, exception hook, severity, privacy, authentication, disabled configuration, HTTP/connection failures, and normal logging.\n";
