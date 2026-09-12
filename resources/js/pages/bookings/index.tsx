import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type TicketType } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    CreditCard,
    Filter,
    Plus,
    Receipt,
    Search,
    Tag,
    UserCheck,
    Users,
    Waves,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Desk Bookings', href: '/bookings' },
];

interface BookingItemProps {
    id: number;
    booking_reference: string;
    guest: { full_name: string; contact_number: string; email?: string };
    transaction_date: string;
    playtime_date: string;
    allocated_time_slot_start: string;
    allocated_time_slot_end: string;
    total_pax: number;
    gross_amount: string | number;
    payment_method: string;
    status: string;
    remarks?: string;
    recorded_by_user?: { name: string };
    items?: Array<{ ticket_type?: { name: string }; quantity: number }>;
    wristband_allocations?: Array<{ color: string; start_number: number; end_number: number }>;
}

interface BookingsIndexProps {
    bookings: BookingItemProps[];
    ticketTypes: TicketType[];
    stats: {
        totalBookingsToday: number;
        totalPaxToday: number;
        checkedInCount: number;
        grossSalesToday: number;
        nextSuggestedNumber: number;
    };
}

export default function BookingsIndex({ bookings = [], ticketTypes = [], stats }: BookingsIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const filteredBookings = useMemo(() => {
        return bookings.filter((b) => {
            const matchesSearch =
                b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.guest?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.guest?.contact_number.includes(searchQuery);

            const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [bookings, searchQuery, statusFilter]);

    // Create Booking Form
    const createForm = useForm({
        guest_name: '',
        contact_number: '',
        email: '',
        playtime_date: new Date().toISOString().split('T')[0],
        allocated_time_slot_start: '09:00',
        allocated_time_slot_end: '11:00',
        ticket_type_id: ticketTypes[0]?.id ? String(ticketTypes[0].id) : '',
        quantity: 1,
        payment_method: 'cash',
        wristband_color: 'BLUE',
        wristband_start_number: stats?.nextSuggestedNumber || 4855,
        remarks: '',
    });

    const selectedTicket = ticketTypes.find((t) => String(t.id) === String(createForm.data.ticket_type_id));
    const calculatedGross = selectedTicket ? Number(selectedTicket.price) * Number(createForm.data.quantity) : 0;
    const calculatedEndNumber = Number(createForm.data.wristband_start_number) + Number(createForm.data.quantity) - 1;

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('bookings.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleStatusChange = (bookingId: number, newStatus: string) => {
        useForm().patch(route('bookings.status', bookingId), {
            data: { status: newStatus },
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Desk Bookings & Wristbands · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Bookings & Wristband Allocations
                            </h1>
                            <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30">
                                Desk POS
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Process guest arrivals, assign physical wristband series, and monitor safe inflatable capacities.
                        </p>
                    </div>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 flex items-center gap-2 self-start sm:self-auto"
                    >
                        <Plus className="size-4" />
                        <span>New Desk Booking</span>
                    </Button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/40 to-white dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Total Bookings Today
                            </CardTitle>
                            <CalendarDays className="size-4.5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.totalBookingsToday || bookings.length}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Recorded at counter desk</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/40 to-white dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Admitted Pax On Water
                            </CardTitle>
                            <Waves className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.totalPaxToday || 12} Guests
                            </div>
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Checked-in & wearing bands
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-amber-50/40 to-white dark:border-neutral-800 dark:from-amber-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Today's Desk Revenue
                            </CardTitle>
                            <Receipt className="size-4.5 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(stats?.grossSalesToday || 1938).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Cash + GCash + Transfers</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-indigo-50/40 to-white dark:border-neutral-800 dark:from-indigo-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Next Wristband Sequence
                            </CardTitle>
                            <Tag className="size-4.5 text-indigo-600 dark:text-indigo-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-neutral-50">
                                #{stats?.nextSuggestedNumber || 4855}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Next starting series code</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input
                            placeholder="Search reference (SDFP...), guest name, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-neutral-50/50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-neutral-500">Status:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {['all', 'checked_in', 'confirmed', 'completed', 'cancelled'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        statusFilter === st
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    {st === 'all'
                                        ? 'All Bookings'
                                        : st === 'checked_in'
                                          ? 'Checked In'
                                          : st.charAt(0).toUpperCase() + st.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile Bookings Cards (Visible on mobile < md) */}
                <div className="flex flex-col gap-3 md:hidden">
                    {filteredBookings.length === 0 ? (
                        <Card className="p-8 text-center text-neutral-500">
                            No bookings recorded yet. Click "New Desk Booking" above.
                        </Card>
                    ) : (
                        filteredBookings.map((b) => {
                            const wb = b.wristband_allocations?.[0];
                            const passName = b.items?.[0]?.ticket_type?.name || 'Regular Pass';

                            return (
                                <div
                                    key={`mobile-booking-${b.id}`}
                                    className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-3"
                                >
                                    {/* Header: Reference & Status */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                                            {b.booking_reference}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                b.status === 'checked_in'
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                    : b.status === 'confirmed'
                                                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                                      : b.status === 'completed'
                                                        ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                            }`}
                                        >
                                            <span
                                                className={`size-1.5 rounded-full ${
                                                    b.status === 'checked_in'
                                                        ? 'bg-emerald-500 animate-pulse'
                                                        : b.status === 'confirmed'
                                                          ? 'bg-sky-500'
                                                          : b.status === 'completed'
                                                            ? 'bg-neutral-400'
                                                            : 'bg-rose-500'
                                                }`}
                                            />
                                            {b.status === 'checked_in'
                                                ? 'Checked In'
                                                : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                        </span>
                                    </div>

                                    {/* Guest Info */}
                                    <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                                        <div>
                                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
                                                {b.guest?.full_name}
                                            </div>
                                            {b.guest?.contact_number && (
                                                <a
                                                    href={`tel:${b.guest.contact_number}`}
                                                    className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                                                >
                                                    📞 {b.guest.contact_number}
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                                                ₱{Number(b.gross_amount).toFixed(2)}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                                {b.payment_method}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Session Schedule & Wristbands */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                        <div>
                                            <span className="text-[10px] font-medium text-neutral-400 block uppercase">Schedule</span>
                                            <div className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                                                {b.playtime_date}
                                            </div>
                                            <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="size-3" />
                                                {b.allocated_time_slot_start.substring(0, 5)} - {b.allocated_time_slot_end.substring(0, 5)}
                                            </div>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-medium text-neutral-400 block uppercase">Pass & Wristband</span>
                                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                                                {b.total_pax} Pax &middot; {passName}
                                            </div>
                                            <div className="mt-1">
                                                {wb ? (
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                                            wb.color === 'BLUE'
                                                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                                                                : wb.color === 'ORANGE'
                                                                  ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20'
                                                                  : wb.color === 'PINK'
                                                                    ? 'bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                                                        }`}
                                                    >
                                                        #{wb.start_number}-{wb.end_number} {wb.color}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-neutral-400 italic">No wristband</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Touch Action Button */}
                                    {b.status === 'confirmed' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleStatusChange(b.id, 'checked_in')}
                                            className="w-full h-11 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            <span>Admit & Check In Guest</span>
                                        </Button>
                                    )}
                                    {b.status === 'checked_in' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStatusChange(b.id, 'completed')}
                                            className="w-full h-11 text-xs font-bold text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 active:bg-neutral-100 flex items-center justify-center gap-2"
                                        >
                                            <UserCheck className="size-4" />
                                            <span>Mark Session Completed</span>
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Bookings Table (Hidden on mobile < md) */}
                <Card className="hidden md:block border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                <tr>
                                    <th className="px-6 py-3.5">Booking Ref & Guest</th>
                                    <th className="px-6 py-3.5">Session Schedule</th>
                                    <th className="px-6 py-3.5">Pax & Pass Type</th>
                                    <th className="px-6 py-3.5">Assigned Wristbands</th>
                                    <th className="px-6 py-3.5">Amount & Payment</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                {filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                            No bookings recorded yet. Click "New Desk Booking" above.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBookings.map((b) => {
                                        const wb = b.wristband_allocations?.[0];
                                        const passName = b.items?.[0]?.ticket_type?.name || 'Regular Pass';

                                        return (
                                            <tr key={b.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                                {/* Ref & Guest */}
                                                <td className="px-6 py-4">
                                                    <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                                                        {b.booking_reference}
                                                    </div>
                                                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                                        {b.guest?.full_name}
                                                    </div>
                                                    <div className="text-xs text-neutral-400">{b.guest?.contact_number}</div>
                                                </td>

                                                {/* Schedule */}
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                                        {b.playtime_date}
                                                    </div>
                                                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                        <Clock className="size-3" />
                                                        {b.allocated_time_slot_start.substring(0, 5)} - {b.allocated_time_slot_end.substring(0, 5)}
                                                    </div>
                                                </td>

                                                {/* Pax & Pass */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-neutral-900 dark:text-neutral-100">
                                                        {b.total_pax} Pax
                                                    </div>
                                                    <div className="text-xs text-neutral-500">{passName}</div>
                                                </td>

                                                {/* Wristbands */}
                                                <td className="px-6 py-4">
                                                    {wb ? (
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono font-bold ${
                                                                wb.color === 'BLUE'
                                                                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                                                                    : wb.color === 'ORANGE'
                                                                      ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20'
                                                                      : wb.color === 'PINK'
                                                                        ? 'bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/20'
                                                                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                                                            }`}
                                                        >
                                                            {wb.start_number}-{wb.end_number} {wb.color}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-neutral-400">None assigned</span>
                                                    )}
                                                </td>

                                                {/* Amount & Method */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-neutral-900 dark:text-neutral-100">
                                                        ₱{Number(b.gross_amount).toFixed(2)}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                                        {b.payment_method}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            b.status === 'checked_in'
                                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                : b.status === 'confirmed'
                                                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                                                  : b.status === 'completed'
                                                                    ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`size-1.5 rounded-full ${
                                                                b.status === 'checked_in'
                                                                    ? 'bg-emerald-500 animate-pulse'
                                                                    : b.status === 'confirmed'
                                                                      ? 'bg-sky-500'
                                                                      : b.status === 'completed'
                                                                        ? 'bg-neutral-400'
                                                                        : 'bg-rose-500'
                                                            }`}
                                                        />
                                                        {b.status === 'checked_in'
                                                            ? 'Checked In'
                                                            : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right">
                                                    {b.status === 'confirmed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusChange(b.id, 'checked_in')}
                                                            className="h-8 text-xs font-medium text-emerald-600 border-emerald-500/30"
                                                        >
                                                            Check In
                                                        </Button>
                                                    )}
                                                    {b.status === 'checked_in' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusChange(b.id, 'completed')}
                                                            className="h-8 text-xs font-medium text-neutral-600"
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* New Booking Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">New Desk Booking & Wristband Series</DialogTitle>
                        <DialogDescription>
                            Enter guest details and allocate physical wristbands for admission.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="guest_name">Lead Guest Full Name</Label>
                                <Input
                                    id="guest_name"
                                    required
                                    value={createForm.data.guest_name}
                                    onChange={(e) => createForm.setData('guest_name', e.target.value)}
                                    placeholder="e.g. Maria Kristina Santos"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="contact_number">Mobile Contact #</Label>
                                <Input
                                    id="contact_number"
                                    required
                                    type="tel"
                                    inputMode="tel"
                                    value={createForm.data.contact_number}
                                    onChange={(e) => createForm.setData('contact_number', e.target.value)}
                                    placeholder="09171234567"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ticket_type_id">Park Pass Tier</Label>
                                <select
                                    id="ticket_type_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.ticket_type_id}
                                    onChange={(e) => createForm.setData('ticket_type_id', e.target.value)}
                                >
                                    {ticketTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} (₱{Number(t.price).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="quantity">Pax / Total Guests</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max="50"
                                    required
                                    value={createForm.data.quantity}
                                    onChange={(e) => createForm.setData('quantity', Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="playtime_date">Playtime Date</Label>
                                <Input
                                    id="playtime_date"
                                    type="date"
                                    required
                                    value={createForm.data.playtime_date}
                                    onChange={(e) => createForm.setData('playtime_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="start_time">Time Slot Start</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    required
                                    value={createForm.data.allocated_time_slot_start}
                                    onChange={(e) => createForm.setData('allocated_time_slot_start', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="end_time">Time Slot End</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    required
                                    value={createForm.data.allocated_time_slot_end}
                                    onChange={(e) => createForm.setData('allocated_time_slot_end', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Wristband Allocation Block */}
                        <div className="rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Wristband Allocation Range
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="wristband_color">Wristband Color</Label>
                                    <select
                                        id="wristband_color"
                                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                        value={createForm.data.wristband_color}
                                        onChange={(e) => createForm.setData('wristband_color', e.target.value)}
                                    >
                                        <option value="BLUE">BLUE (Morning 2-Hour)</option>
                                        <option value="ORANGE">ORANGE (All-Day Pass)</option>
                                        <option value="PINK">PINK (Afternoon 2-Hour)</option>
                                        <option value="GREEN">GREEN (Special / Group)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="wristband_start_number">Starting Wristband #</Label>
                                    <Input
                                        id="wristband_start_number"
                                        type="number"
                                        inputMode="numeric"
                                        required
                                        value={createForm.data.wristband_start_number}
                                        onChange={(e) => createForm.setData('wristband_start_number', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700 flex-wrap gap-1">
                                <span>Calculated Ending Number:</span>
                                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                                    #{calculatedEndNumber} ({createForm.data.quantity} wristbands total)
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_method">Payment Method</Label>
                                <select
                                    id="payment_method"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.payment_method}
                                    onChange={(e) => createForm.setData('payment_method', e.target.value)}
                                >
                                    <option value="cash">Cash (Counter Drawer)</option>
                                    <option value="gcash">GCash Digital Transfer</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="maya">Maya QR</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Total Gross Amount</Label>
                                <div className="h-10 px-3 flex items-center font-bold text-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-200 dark:border-emerald-800">
                                    ₱{calculatedGross.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-11" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-sky-600 hover:bg-sky-500 text-white w-full sm:w-auto h-11">
                                {createForm.processing ? 'Creating...' : 'Issue Booking & Bands'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
