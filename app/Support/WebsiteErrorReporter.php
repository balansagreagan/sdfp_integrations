<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Throwable;

class WebsiteErrorReporter
{
    public ?string $lastFailure = null;

    public function report(Throwable $exception): bool
    {
        $this->lastFailure = null;
        if (! config('monitoring.enabled') || ! config('monitoring.webhook_url') || ! config('monitoring.header_secret')) {
            $this->lastFailure = 'Monitoring is disabled or the webhook URL/secret is missing.';
            return false;
        }

        try {
            // Route templates omit actual IDs, query strings, and other request data.
            $route = app()->runningInConsole() ? null : request()->route();
            $payload = [
                'source' => config('monitoring.source'),
                'severity' => $exception instanceof \Error ? 'critical' : 'high',
                'error_type' => class_basename($exception),
                'environment' => app()->environment(),
                'route' => $route instanceof \Illuminate\Routing\Route ? $route->uri() : null,
                'occurred_at' => now()->toIso8601String(),
            ];

            $response = Http::asJson()
                ->withHeaders([config('monitoring.header_name') => config('monitoring.header_secret')])
                ->connectTimeout(1)
                ->timeout(2)
                ->withoutRedirecting()
                ->post(config('monitoring.webhook_url'), $payload);

            if (! $response->successful()) {
                $this->lastFailure = match ($response->status()) {
                    404 => 'HTTP 404: webhook is not registered. For /webhook-test/, click Listen for test event immediately before testing. For /webhook/, publish/activate the workflow.',
                    401, 403 => 'HTTP '.$response->status().': authentication rejected. Match the Header Auth name and value with the Laravel monitoring settings.',
                    default => 'Webhook returned HTTP '.$response->status().'. Check the n8n execution/server logs.',
                };
            }

            return $response->successful();
        } catch (\Illuminate\Http\Client\ConnectionException) {
            $this->lastFailure = 'Connection failed or timed out. Check the n8n host/port; try 127.0.0.1 instead of localhost for a local instance.';

            return false;
        } catch (Throwable) {
            $this->lastFailure = 'Could not send the report. Check the webhook URL, header configuration, and HTTP client setup.';
            // Never report delivery failures recursively or interrupt normal exception logging.
            return false;
        }
    }
}
