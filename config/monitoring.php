<?php

return [
    'enabled' => env('N8N_ERROR_MONITORING_ENABLED', false),
    'webhook_url' => env('N8N_ERROR_WEBHOOK_URL'),
    'header_name' => env('N8N_ERROR_HEADER_NAME', 'X-SDFP-Monitor-Key'),
    'header_secret' => env('N8N_ERROR_HEADER_SECRET'),
    'source' => env('N8N_ERROR_SOURCE', 'sdfp-website'),
];
