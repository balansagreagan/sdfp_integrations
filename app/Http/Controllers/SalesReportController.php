<?php

namespace App\Http\Controllers;

use App\Support\SalesSummary;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesReportController extends Controller
{
    public function index(Request $request, SalesSummary $summary): Response
    {
        [$filters, $start, $end] = $this->period($request);

        return Inertia::render('sales-reports/index', ['filters' => $filters, 'report' => $summary->between($start, $end)]);
    }

    public function export(Request $request, SalesSummary $summary): StreamedResponse
    {
        [, $start, $end] = $this->period($request);
        $report = $summary->between($start, $end);

        return response()->streamDownload(function () use ($report) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Date', 'Payments received (PHP)', 'Payment count', 'Confirmed booking charges (PHP)', 'Bookings', 'Guests', 'Pending quotes']);
            foreach ($report['days'] as $day) {
                fputcsv($stream, array_values($day));
            }
            fputcsv($stream, ['TOTAL', $report['totals']['receipts'], $report['totals']['payment_count'], $report['totals']['confirmed_charges'], $report['totals']['bookings'], $report['totals']['guests'], $report['totals']['pending_quotes']]);
            fclose($stream);
        }, "sales-{$report['start']}-{$report['end']}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function period(Request $request): array
    {
        $validated = $request->validate([
            'period' => ['nullable', 'in:day,month'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $filters = [
            'period' => $validated['period'] ?? 'month',
            'date' => $validated['date'] ?? today()->toDateString(),
            'month' => $validated['month'] ?? today()->format('Y-m'),
        ];
        $start = $filters['period'] === 'day'
            ? CarbonImmutable::createFromFormat('!Y-m-d', $filters['date'])
            : CarbonImmutable::createFromFormat('!Y-m', $filters['month']);

        return [$filters, $start, $filters['period'] === 'day' ? $start : $start->endOfMonth()->startOfDay()];
    }
}
