import { StockBadge, type MonitoredItem } from '@/components/inventory-monitoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type Props = {
    asOf: string;
    sales: null | { start: string; end: string; totals: { receipts: string; confirmed_charges: string; bookings: number } };
    inventory: null | { itemTypes: number; outOfStock: number; purchaseItems: (MonitoredItem & { inventory_location: string })[] };
    maintenance: null | {
        open: number;
        urgent: number;
        overdue: number;
        reports: { id: number; asset_name: string; priority: string; status: string; assignee: null | { name: string } }[];
    };
};

export default function MonitoringCenter({ asOf, sales, inventory, maintenance }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [busy, setBusy] = useState(false);
    const money = (amount: string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount));
    const allowed = auth.allowedPages ?? [];
    return (
        <AppLayout breadcrumbs={[{ title: 'Monitoring Center', href: '/monitoring' }]}>
            <Head title="Monitoring Center" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Activity className="size-6 text-sky-600" />
                            Monitoring center
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Welcome, {auth.user.name}. View the information available for your assigned responsibilities.
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">Updated {new Date(asOf).toLocaleString()}</p>
                    </div>
                    <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                            setBusy(true);
                            router.reload({ onFinish: () => setBusy(false) });
                        }}
                    >
                        <RefreshCw className={`mr-2 size-4 ${busy ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {sales && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Sales this month</CardTitle>
                                <CardDescription>
                                    {sales.start} to {sales.end}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-3xl font-semibold">{money(sales.totals.receipts)}</p>
                                <p className="text-muted-foreground text-sm">Payments received · {sales.totals.bookings} bookings</p>
                                <Button variant="outline" asChild>
                                    <Link href="/sales-reports">View sales reports</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                    {inventory && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Stock availability</CardTitle>
                                <CardDescription>Your authorized inventory locations</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-3xl font-semibold">{inventory.purchaseItems.length} to purchase</p>
                                <p className="text-muted-foreground text-sm">
                                    {inventory.outOfStock} out of stock · {inventory.itemTypes} item types
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {allowed.includes('inventory') && (
                                        <Button variant="outline" asChild>
                                            <Link href="/inventory">Park stock</Link>
                                        </Button>
                                    )}
                                    {allowed.includes('soaked-inventory') && (
                                        <Button variant="outline" asChild>
                                            <Link href="/soaked-inventory">Restaurant stock</Link>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {maintenance && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Maintenance workload</CardTitle>
                                <CardDescription>
                                    {auth.user.role === 'admin' ? 'All submitted reports' : 'Reports you submitted or were assigned'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-3xl font-semibold">{maintenance.open} unresolved</p>
                                <p className="text-muted-foreground text-sm">
                                    {maintenance.urgent} urgent · {maintenance.overdue} overdue
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href="/maintenance">View maintenance reports</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
                {inventory && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Items to purchase</CardTitle>
                            <CardDescription>Quantities required to reach the recorded minimum stock levels.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {inventory.purchaseItems.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-muted-foreground border-b text-xs">
                                            <tr>
                                                <th className="p-3">Item</th>
                                                <th className="p-3">Location</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">To purchase</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inventory.purchaseItems.map((item) => (
                                                <tr key={item.id} className="border-b last:border-0">
                                                    <td className="p-3 font-medium">
                                                        <Link
                                                            className="hover:underline"
                                                            href={item.inventory_location === 'park' ? '/inventory' : '/soaked-inventory'}
                                                        >
                                                            {item.name}
                                                        </Link>
                                                    </td>
                                                    <td className="p-3">{item.inventory_location === 'park' ? 'Park' : 'Restaurant'}</td>
                                                    <td className="p-3">
                                                        <StockBadge status={item.stock_status} />
                                                    </td>
                                                    <td className="p-3 font-semibold">
                                                        {item.shortage_quantity} {item.unit}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted-foreground py-5 text-sm">No items are below their recorded minimum.</p>
                            )}
                        </CardContent>
                    </Card>
                )}
                {maintenance && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Maintenance priorities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {maintenance.reports.length ? (
                                maintenance.reports.map((report) => (
                                    <Link
                                        href="/maintenance"
                                        key={report.id}
                                        className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                                    >
                                        <div>
                                            <p className="font-medium">{report.asset_name}</p>
                                            <p className="text-muted-foreground text-sm">{report.assignee?.name ?? 'Awaiting assignment'}</p>
                                        </div>
                                        <Badge variant={report.priority === 'urgent' ? 'destructive' : 'outline'}>{report.priority}</Badge>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-muted-foreground py-5 text-sm">No unresolved maintenance reports.</p>
                            )}
                        </CardContent>
                    </Card>
                )}
                {!sales && !inventory && !maintenance && (
                    <Card>
                        <CardContent className="text-muted-foreground p-6 text-sm">
                            No monitoring modules have been assigned to your account. An administrator can grant access in User Access.
                        </CardContent>
                    </Card>
                )}
                <p className="text-muted-foreground text-xs">
                    Staff enter data in the relevant module. Saved updates are available here to authorized users when the page is refreshed.
                </p>
            </div>
        </AppLayout>
    );
}
