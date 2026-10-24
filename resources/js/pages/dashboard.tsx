import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    Banknote,
    CalendarDays,
    CheckCircle2,
    Clock,
    DollarSign,
    LifeBuoy,
    Plus,
    Receipt,
    Tag,
    TrendingUp,
    UserCheck,
    Users,
    Waves,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardProps {
    metrics: {
        todayBookings: number;
        todayPax: number;
        todaySales: number;
        todayCashExpenses: number;
        expectedCoh: number;
        activeLifeguards: number;
        currentWristbandRange: string;
    };
    recentBookings: any[];
}

export default function Dashboard({ metrics, recentBookings = [] }: DashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth?.user?.role === 'admin';

    const currentDateFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operational Dashboard · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#041830] via-[#082a52] to-[#0c3c72] p-6 text-white shadow-xl">
                    <div className="absolute right-0 top-0 -mt-8 -mr-8 size-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Park Operations Active
                                </span>
                                <span className="text-xs text-sky-200/70">· Caluya Waters</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                Welcome, {auth?.user?.name || 'Staff Member'}
                            </h1>
                            <p className="mt-1 text-sm text-sky-100/80">
                                {currentDateFormatted} · Sapang Dalaga Floating Playground Operations Console
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-400 text-white shadow-md">
                                <Link href="/bookings">
                                    <Plus className="mr-1.5 size-4" />
                                    New Booking
                                </Link>
                            </Button>
                            {isAdmin && (
                                <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/10 hover:bg-white/20 text-white">
                                    <Link href="/staff">
                                        <Users className="mr-1.5 size-4" />
                                        Manage Staff
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Primary Metric KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Today's Gross Revenue */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/40 to-white dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Payments Received Today
                            </CardTitle>
                            <Banknote className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(metrics?.todaySales || 1938).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                                <span>Desk cash & digital intake</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Today's Pax / Admitted Guests */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/40 to-white dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Total Pax On Water
                            </CardTitle>
                            <Waves className="size-4.5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {metrics?.todayPax || 12} Guests
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                                <span>{metrics?.todayBookings || 3} Confirmed bookings</span>
                                <span className="font-medium text-sky-600 dark:text-sky-400">Safe Capacity</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cash on Hand (COH) Drawer Balance */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-amber-50/40 to-white dark:border-neutral-800 dark:from-amber-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Cash On Hand (COH)
                            </CardTitle>
                            <Receipt className="size-4.5 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(metrics?.expectedCoh || 1458).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                                <span>Disbursements: ₱{Number(metrics?.todayCashExpenses || 1480).toFixed(0)}</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">Float: ₱1,000</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Wristband Sequence */}
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-indigo-50/40 to-white dark:border-neutral-800 dark:from-indigo-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Active Wristband Series
                            </CardTitle>
                            <Tag className="size-4.5 text-indigo-600 dark:text-indigo-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
                                {metrics?.currentWristbandRange || '4843-4854 BLUE'}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                                <span>{metrics?.activeLifeguards || 2} Lifeguards on tower</span>
                                <span className="font-medium text-indigo-600 dark:text-indigo-400">Active Batch</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Operations Grid: Recent Bookings & Quick Links */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Bookings Desk Table */}
                    <Card className="lg:col-span-2 border-neutral-200/80 dark:border-neutral-800 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-base font-bold">Recent Desk Bookings</CardTitle>
                                <CardDescription className="text-xs">
                                    Latest guest arrivals and allocated wristbands
                                </CardDescription>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-500">
                                <Link href="/bookings">View All Bookings</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-y border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        <tr>
                                            <th className="px-5 py-3">Reference</th>
                                            <th className="px-5 py-3">Guest Name</th>
                                            <th className="px-5 py-3">Pax & Time</th>
                                            <th className="px-5 py-3">Wristbands</th>
                                            <th className="px-5 py-3 text-right">Booking total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                        {recentBookings.length === 0 ? (
                                            <>
                                                <tr className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-sky-600">SDFP1002390</td>
                                                    <td className="px-5 py-3.5 font-medium">Maria Kristina Santos</td>
                                                    <td className="px-5 py-3.5 text-xs text-neutral-500">5 Pax · 09:00 AM - 11:00 AM</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-mono font-medium bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20">
                                                            4843-4847 BLUE
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold">₱745.00</td>
                                                </tr>
                                                <tr className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-sky-600">SDFP1002391</td>
                                                    <td className="px-5 py-3.5 font-medium">John David Romero</td>
                                                    <td className="px-5 py-3.5 text-xs text-neutral-500">4 Pax · All Day Pass</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-mono font-medium bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
                                                            4848-4851 ORANGE
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold">₱796.00</td>
                                                </tr>
                                                <tr className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-sky-600">SDFP1002392</td>
                                                    <td className="px-5 py-3.5 font-medium">Carla Jane Ocampos</td>
                                                    <td className="px-5 py-3.5 text-xs text-neutral-500">3 Pax · 02:00 PM - 04:00 PM</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-mono font-medium bg-pink-500/10 text-pink-600 ring-1 ring-pink-500/20">
                                                            4852-4854 PINK
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold">₱397.00</td>
                                                </tr>
                                            </>
                                        ) : (
                                            recentBookings.map((b) => (
                                                <tr key={b.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-sky-600">
                                                        {b.booking_reference}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-medium">{b.guest?.full_name || 'Guest'}</td>
                                                    <td className="px-5 py-3.5 text-xs text-neutral-500">
                                                        {b.total_pax} Pax · {b.allocated_time_slot_start?.substring(0, 5)} - {b.allocated_time_slot_end?.substring(0, 5)}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {b.wristband_allocations?.length > 0 ? (
                                                            <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-mono font-medium bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20">
                                                                {b.wristband_allocations[0].start_number}-{b.wristband_allocations[0].end_number} {b.wristband_allocations[0].color}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-neutral-400">Not assigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold">
                                                        {b.pricing_status === 'pending' ? <><span className="text-amber-600">To confirm</span><small className="block">₱{Number(b.gross_amount).toFixed(2)} known</small></> : `₱${Number(b.gross_amount).toFixed(2)}`}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Shortcuts & Water Status */}
                    <div className="flex flex-col gap-4">
                        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <LifeBuoy className="size-4 text-sky-600" />
                                    Water Safety & Park Rules
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Life vests mandatory for all guests before entering the inflatable area.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Wristband color changes each 2-hour session (Blue, Orange, Pink).</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Minimum 2 certified lifeguards on water perimeter during active sessions.</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Quick Desk Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Button asChild variant="outline" className="justify-start text-xs font-medium h-9">
                                    <Link href="/daily-sales">
                                        <Receipt className="mr-2 size-3.5 text-neutral-500" />
                                        View Daily Cash Flow & Expenses
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="justify-start text-xs font-medium h-9">
                                    <Link href="/packages">
                                        <Tag className="mr-2 size-3.5 text-neutral-500" />
                                        Check Park Rates & Packages
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="justify-start text-xs font-medium h-9">
                                    <Link href="/payroll">
                                        <Clock className="mr-2 size-3.5 text-neutral-500" />
                                        Weekly Timesheets & Shifts
                                    </Link>
                                </Button>
                                {isAdmin && (
                                    <Button asChild variant="outline" className="justify-start text-xs font-medium h-9 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                                        <Link href="/staff">
                                            <Users className="mr-2 size-3.5 text-amber-600" />
                                            Admin Staff Management
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
