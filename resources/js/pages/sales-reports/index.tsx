import { FormErrors } from '@/components/form-errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Download, Receipt } from 'lucide-react';

type Totals = { receipts: string; confirmed_charges: string; bookings: number; guests: number; pending_quotes: number; payment_count: number };
type Filters = { period: 'day' | 'month'; date: string; month: string };
type Props = { filters: Filters; report: { start: string; end: string; days: (Totals & { date: string })[]; totals: Totals } };
const money = (amount: string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount));

export default function SalesReports({ filters, report }: Props) {
    const form = useForm(filters);
    const csv = `/sales-reports/export?${new URLSearchParams(filters)}`;
    return (
        <AppLayout breadcrumbs={[{ title: 'Sales Reports', href: '/sales-reports' }]}>
            <Head title="Daily & Monthly Sales Reports" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Receipt className="size-6 text-sky-600" />
                            Sales reports
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Daily and monthly summaries from the payments and bookings entered by staff.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href={csv}>
                            <Download className="mr-2 size-4" />
                            Export CSV
                        </a>
                    </Button>
                </div>
                <Card>
                    <CardContent className="p-4">
                        <form
                            className="flex flex-wrap items-end gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.get('/sales-reports', { preserveState: true, preserveScroll: true });
                            }}
                        >
                            <label className="space-y-1 text-sm">
                                <span className="block">Report period</span>
                                <select
                                    className="bg-background h-9 rounded-md border px-3"
                                    value={form.data.period}
                                    onChange={(event) => form.setData('period', event.target.value as Filters['period'])}
                                >
                                    <option value="day">Daily</option>
                                    <option value="month">Monthly</option>
                                </select>
                            </label>
                            {form.data.period === 'day' ? (
                                <label className="space-y-1 text-sm">
                                    <span className="block">Date</span>
                                    <Input
                                        type="date"
                                        required
                                        value={form.data.date}
                                        onChange={(event) => form.setData('date', event.target.value)}
                                    />
                                </label>
                            ) : (
                                <label className="space-y-1 text-sm">
                                    <span className="block">Month</span>
                                    <Input
                                        type="month"
                                        required
                                        value={form.data.month}
                                        onChange={(event) => form.setData('month', event.target.value)}
                                    />
                                </label>
                            )}
                            <Button disabled={form.processing}>View report</Button>
                        </form>
                        <div className="mt-3">
                            <FormErrors errors={form.errors} />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['Payments received', money(report.totals.receipts), `${report.totals.payment_count} recorded payments`],
                        ['Confirmed booking charges', money(report.totals.confirmed_charges), 'Bookings entered during this period'],
                        ['Bookings / guests', `${report.totals.bookings} / ${report.totals.guests}`, 'Cancelled bookings excluded'],
                        ['Pending quotes', String(report.totals.pending_quotes), 'Unconfirmed prices excluded from charges'],
                    ].map(([title, value, note]) => (
                        <Card key={title}>
                            <CardContent className="p-5">
                                <p className="text-muted-foreground text-sm">{title}</p>
                                <p className="my-2 text-2xl font-semibold">{value}</p>
                                <p className="text-muted-foreground text-xs">{note}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{report.start === report.end ? report.start : `${report.start} to ${report.end}`}</CardTitle>
                        <CardDescription>
                            Payments are counted on their payment date, including deposits for other booking dates. Charges are counted on the booking
                            transaction date. These totals may differ.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="text-muted-foreground border-b text-xs">
                                    <tr>
                                        {['Date', 'Payments received', 'Confirmed charges', 'Bookings', 'Guests', 'Pending quotes'].map((label) => (
                                            <th key={label} className="px-3 py-3 first:text-left">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.days.map((day) => (
                                        <tr key={day.date} className="hover:bg-muted/40 border-b last:border-0">
                                            <td className="px-3 py-3 text-left">{day.date}</td>
                                            <td className="px-3 py-3 font-medium">{money(day.receipts)}</td>
                                            <td className="px-3 py-3">{money(day.confirmed_charges)}</td>
                                            <td className="px-3 py-3">{day.bookings}</td>
                                            <td className="px-3 py-3">{day.guests}</td>
                                            <td className="px-3 py-3">{day.pending_quotes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t font-semibold">
                                    <tr>
                                        <td className="px-3 py-3 text-left">Total</td>
                                        <td className="px-3 py-3">{money(report.totals.receipts)}</td>
                                        <td className="px-3 py-3">{money(report.totals.confirmed_charges)}</td>
                                        <td className="px-3 py-3">{report.totals.bookings}</td>
                                        <td className="px-3 py-3">{report.totals.guests}</td>
                                        <td className="px-3 py-3">{report.totals.pending_quotes}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
