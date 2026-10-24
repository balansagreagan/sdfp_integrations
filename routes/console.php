<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('monitor:test', function () {
    $reporter = app(\App\Support\WebsiteErrorReporter::class);
    $sent = $reporter->report(new \RuntimeException('Synthetic monitoring check'));

    if (! $sent) {
        $this->error('Report was not accepted. Check monitoring configuration, the n8n webhook URL, and Header Auth credentials.');
        $this->line($reporter->lastFailure ?? 'Delivery failed.');

        return 1;
    }

    $this->info('n8n accepted the test report. Check the workflow execution and Telegram chat to verify alert delivery.');

    return 0;
})->purpose('Send a safe synthetic error report to the configured n8n webhook');
