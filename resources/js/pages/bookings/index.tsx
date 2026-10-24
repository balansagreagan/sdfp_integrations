import BookingAddonFields, { addonTotal, type AddonDraft } from '@/components/booking-addon-fields';
import ChildAgeFields, { childQuote } from '@/components/child-age-fields';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { AddOnItem, BreadcrumbItem, ChildPolicy, TicketType } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, CreditCard, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Bookings', href: '/bookings' },
];
const money = (value: number | string | null) =>
    value === null ? 'To confirm' : Number(value).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const dateLabel = (value: string) =>
    new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const timeLabel = (value: string) => new Date('2000-01-01T' + value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
const nextDate = (date: string) => {
    const value = new Date(date + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
};
const selectClass = 'w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm';
const methods = { cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank transfer', maya: 'Maya' };

interface Payment {
    id: number;
    amount: string;
    paid_on: string;
    payment_method: string;
    reference: string | null;
}
interface Booking {
    id: number;
    booking_reference: string;
    guest: { full_name: string; contact_number: string; address: string | null; email: string | null };
    playtime_date: string;
    visit_end_date: string | null;
    allocated_time_slot_start: string;
    allocated_time_slot_end: string | null;
    total_pax: number;
    adult_count: number | null;
    child_count: number | null;
    child_unit_price: string | null;
    child_ages: (number | null)[] | null;
    child_policy: ChildPolicy | null;
    food_serving_time: string | null;
    promotion_reference: string | null;
    pricing_status: string;
    known_balance_due: string;
    gross_amount: string;
    amount_paid: string;
    balance_due: string | null;
    payment_status: string;
    status: string;
    remarks: string | null;
    items: {
        id: number;
        description: string | null;
        pricing_basis: string;
        quantity: number;
        unit_price: string | null;
        line_total: string | null;
        guest_type: string;
        guest_age: number | null;
        ticket_type: TicketType;
    }[];
    payments: Payment[];
    addons: {
        id: number;
        addon_item_id: number | null;
        name: string;
        quantity: string;
        unit: string;
        unit_price: string | null;
        line_total: string | null;
        is_included: boolean;
    }[];
    wristband_allocations: { id: number; color: string; start_number: number; end_number: number }[];
}
interface Props {
    bookings: Booking[];
    ticketTypes: TicketType[];
    packageCategories: Record<string, string>;
    addonItems: AddOnItem[];
    childPolicies: Record<string, ChildPolicy>;
    today: string;
    stats: {
        totalBookingsToday: number;
        checkedInCount: number;
        grossSalesToday: number;
        outstandingBalance: number;
        nextSuggestedNumber: number;
        pendingPricingCount: number;
    };
}

export default function BookingsIndex({ bookings = [], ticketTypes = [], packageCategories, addonItems, childPolicies, today, stats }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [creating, setCreating] = useState(false);
    const [category, setCategory] = useState('admission');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editingFood, setEditingFood] = useState(false);
    const selected = bookings.find((booking) => booking.id === selectedId);
    const firstAdmission = ticketTypes.find((rate) => rate.code === 'REG-2HR') ?? ticketTypes.find((rate) => rate.category === 'admission');
    const form = useForm({
        guest_name: '',
        contact_number: '',
        address: '',
        email: '',
        playtime_date: today,
        visit_end_date: today,
        allocated_time_slot_start: '09:00',
        allocated_time_slot_end: '',
        ticket_type_id: firstAdmission ? String(firstAdmission.id) : '',
        quantity: 1,
        package_quantity: 1,
        status: 'confirmed',
        payment_amount: '',
        paid_on: today,
        payment_method: 'cash',
        payment_reference: '',
        assign_wristbands: false as boolean,
        wristband_color: 'BLUE',
        wristband_start_number: stats.nextSuggestedNumber,
        remarks: '',
        adult_count: '1',
        child_count: '0',
        child_unit_price: '',
        child_ages: [] as string[],
        promotion_reference: '',
        food_serving_time: '',
        addons: [] as AddonDraft[],
    });
    const payment = useForm({ amount: '', paid_on: today, payment_method: 'cash', reference: '' });
    const food = useForm({ child_unit_price: '', child_ages: [] as string[], food_serving_time: '', addons: [] as AddonDraft[] });
    const rate = ticketTypes.find((ticket) => String(ticket.id) === form.data.ticket_type_id);
    const eligible = (ticket: TicketType, pax: number) =>
        ticket.category === category && pax >= ticket.min_pax && (!ticket.max_pax || pax <= ticket.max_pax);
    const availableRates = ticketTypes.filter((ticket) => eligible(ticket, form.data.quantity));
    const needsPackageChoice = availableRates.length > 1 && category !== 'day_tour';
    const packageChoiceLabel =
        category === 'admission' ? 'Ticket / visit duration' : rate?.pricing_basis === 'per_booking' ? 'Bundle size' : 'Package option';
    const units = rate?.pricing_basis === 'per_booking' ? Number(form.data.package_quantity) : Number(form.data.quantity);
    const childPolicy = rate?.child_pricing === 'age_based' && rate.pricing_basis === 'per_person' ? childPolicies[rate.category] : null;
    const ageQuotes = childPolicy ? form.data.child_ages.map((age) => childQuote(childPolicy, age, rate!.price!)) : [];
    const effectiveChildPrice =
        form.data.child_unit_price !== ''
            ? form.data.child_unit_price
            : rate?.child_pricing === 'same'
              ? rate.price
              : rate?.child_pricing === 'custom'
                ? rate.child_price
                : null;
    const childPending =
        Number(form.data.child_count) > 0 &&
        rate?.pricing_basis === 'per_person' &&
        (childPolicy ? ageQuotes.some((quote) => quote.price === null) : effectiveChildPrice == null);
    const childTotalCents = childPolicy
        ? ageQuotes.reduce((sum, quote) => sum + Math.round((quote.price ?? 0) * 100), 0)
        : Math.round(Number(effectiveChildPrice ?? 0) * 100) * Number(form.data.child_count);
    const baseTotal = rate
        ? rate.pricing_basis === 'per_person'
            ? (Math.round(Number(rate.price) * 100) * Number(form.data.adult_count) + childTotalCents) / 100
            : (Math.round(Number(rate.price) * 100) * units) / 100
        : 0;
    const total = baseTotal + addonTotal(form.data.addons);
    const pricingPending = childPending || form.data.addons.some((row) => !row.is_included && row.unit_price === '');
    const deposit = Number(form.data.payment_amount || 0);
    const insufficientBundles = rate?.pricing_basis === 'per_booking' && form.data.quantity > units * Number(rate.included_pax);
    const isStay = category === 'overnight' || category === 'two_days_one_night';
    const filtered = bookings.filter(
        (booking) =>
            (statusFilter === 'all' || booking.status === statusFilter) &&
            `${booking.booking_reference} ${booking.guest.full_name} ${booking.guest.contact_number}`.toLowerCase().includes(search.toLowerCase()),
    );

    const changeCategory = (value: string) => {
        setCategory(value);
        const next =
            (value === 'admission'
                ? ticketTypes.find(
                      (ticket) =>
                          ticket.code === 'REG-2HR' &&
                          form.data.quantity >= ticket.min_pax &&
                          (!ticket.max_pax || form.data.quantity <= ticket.max_pax),
                  )
                : null) ??
            ticketTypes.find(
                (ticket) =>
                    ticket.category === value && form.data.quantity >= ticket.min_pax && (!ticket.max_pax || form.data.quantity <= ticket.max_pax),
            );
        form.setData((data) => ({
            ...data,
            ticket_type_id: next ? String(next.id) : '',
            child_unit_price: '',
            package_quantity: 1,
            visit_end_date:
                ['overnight', 'two_days_one_night'].includes(value) && data.visit_end_date <= data.playtime_date
                    ? nextDate(data.playtime_date)
                    : data.visit_end_date,
        }));
    };
    const changeBreakdown = (key: 'adult_count' | 'child_count', value: string) => {
        const pax = Number(key === 'adult_count' ? value : form.data.adult_count) + Number(key === 'child_count' ? value : form.data.child_count);
        const next = rate && eligible(rate, pax) ? rate : ticketTypes.find((ticket) => eligible(ticket, pax));
        form.setData((data) => ({
            ...data,
            [key]: value,
            quantity: pax,
            ticket_type_id: next ? String(next.id) : '',
            child_ages: Array.from(
                { length: Math.min(10000, Math.max(0, Number(key === 'child_count' ? value : data.child_count))) },
                (_, i) => data.child_ages[i] ?? '',
            ),
        }));
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('bookings.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreating(false);
                form.reset();
                setCategory('admission');
            },
        });
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        payment.post(route('bookings.payments', selected.id), { preserveScroll: true, onSuccess: () => payment.reset('amount', 'reference') });
    };
    const openDetails = (booking: Booking) => {
        setSelectedId(booking.id);
        payment.reset();
        payment.clearErrors();
        setEditingFood(false);
        food.clearErrors();
        food.setData({
            child_unit_price: booking.child_unit_price ?? '',
            child_ages: booking.child_ages?.map((age) => (age === null ? '' : String(age))) ?? [],
            food_serving_time: booking.food_serving_time?.slice(0, 5) ?? '',
            addons: booking.addons.map((row) => ({
                addon_item_id: row.addon_item_id ? String(row.addon_item_id) : '',
                name: row.name,
                quantity: row.quantity,
                unit: row.unit,
                unit_price: row.unit_price ?? '',
                is_included: row.is_included,
            })),
        });
    };
    const changeStatus = (booking: Booking, status: string) =>
        router.patch(route('bookings.status', booking.id), { status }, { preserveScroll: true });
    const dates = (booking: Booking) =>
        dateLabel(booking.playtime_date) +
        (booking.visit_end_date && booking.visit_end_date.slice(0, 10) !== booking.playtime_date.slice(0, 10)
            ? ` - ${dateLabel(booking.visit_end_date)}`
            : '');
    const statusBadge = (booking: Booking) => (
        <Badge variant={booking.status === 'cancelled' ? 'destructive' : booking.status === 'checked_in' ? 'default' : 'secondary'}>
            {booking.status.replaceAll('_', ' ')}
        </Badge>
    );
    const packageLabels = (booking: Booking) => [...new Set(booking.items.map((item) => item.description || item.ticket_type.name))];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bookings & Reservations" />
            <div className="mx-auto flex w-full max-w-full min-w-0 flex-col gap-6 p-4 md:p-8" data-testid="bookings-page">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold tracking-tight">Bookings & Reservations</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Guest visits, package choices, deposits and remaining balances.</p>
                    </div>
                    <Button
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => {
                            form.clearErrors();
                            form.setData('wristband_start_number', stats.nextSuggestedNumber);
                            setCreating(true);
                        }}
                    >
                        <Plus className="size-4" /> New booking
                    </Button>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        ['Bookings recorded today', stats.totalBookingsToday],
                        ['Currently checked in', stats.checkedInCount],
                        ['Payments received today', money(stats.grossSalesToday)],
                        ['Outstanding balance', money(stats.outstandingBalance)],
                    ].map(([label, value]) => (
                        <Card key={String(label)}>
                            <CardContent className="p-4 sm:p-5">
                                <p className="text-muted-foreground text-xs sm:text-sm">{label}</p>
                                <p className="mt-1 text-xl font-bold [overflow-wrap:anywhere] tabular-nums sm:text-2xl">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {stats.pendingPricingCount > 0 && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        {stats.pendingPricingCount} booking(s) have prices to confirm. Their final balances are excluded from Outstanding balance.
                    </p>
                )}
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                        <Input
                            className="pl-9"
                            aria-label="Search bookings by name, contact or booking reference"
                            placeholder="Search bookings"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <select
                        aria-label="Filter booking status"
                        className={selectClass + ' sm:w-44 sm:shrink-0'}
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        {['all', 'confirmed', 'checked_in', 'completed', 'cancelled', 'weather_hold'].map((status) => (
                            <option key={status} value={status}>
                                {status === 'all' ? 'All bookings' : status.replaceAll('_', ' ')}
                            </option>
                        ))}
                    </select>
                </div>
                <Card className="hidden w-full max-w-full overflow-hidden md:block" data-testid="bookings-table">
                    <div
                        className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset"
                        role="region"
                        aria-label="Booking register table"
                        tabIndex={0}
                    >
                        <table className="w-full min-w-[72rem] text-sm">
                            <thead className="bg-muted/50 text-muted-foreground border-b text-left text-xs uppercase">
                                <tr>
                                    {['Guest', 'Visit / arrival', 'Package', 'Pax', 'Total booking', 'Paid', 'Balance', 'Status', 'Actions'].map(
                                        (label) => (
                                            <th scope="col" key={label} className="p-4">
                                                {label}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((booking) => (
                                    <tr key={booking.id} className="align-top">
                                        <td className="min-w-48 p-4 [overflow-wrap:anywhere]">
                                            <p className="font-semibold">{booking.guest.full_name}</p>
                                            <p className="text-muted-foreground text-xs">{booking.guest.contact_number}</p>
                                            <p className="mt-1 font-mono text-xs text-sky-600">{booking.booking_reference}</p>
                                        </td>
                                        <td className="p-4">
                                            <p>{dates(booking)}</p>
                                            <p className="text-muted-foreground text-xs whitespace-nowrap">
                                                Arrival {timeLabel(booking.allocated_time_slot_start)}
                                            </p>
                                        </td>
                                        <td className="max-w-56 min-w-40 p-4 [overflow-wrap:anywhere]">
                                            {packageLabels(booking).map((label) => (
                                                <p key={label}>{label}</p>
                                            ))}
                                            {booking.wristband_allocations.map((band) => (
                                                <p key={band.id} className="text-muted-foreground mt-1 text-xs">
                                                    {band.color} #{band.start_number}-{band.end_number}
                                                </p>
                                            ))}
                                        </td>
                                        <td className="p-4">{booking.total_pax}</td>
                                        <td className="p-4 font-semibold whitespace-nowrap">
                                            {booking.pricing_status === 'pending' ? (
                                                <>
                                                    <span className="text-amber-700">To confirm</span>
                                                    <small className="block font-normal">{money(booking.gross_amount)} known</small>
                                                </>
                                            ) : (
                                                money(booking.gross_amount)
                                            )}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-emerald-600">{money(booking.amount_paid)}</td>
                                        <td className="p-4 font-semibold whitespace-nowrap text-amber-600">{money(booking.balance_due)}</td>
                                        <td className="p-4">{statusBadge(booking)}</td>
                                        <td className="min-w-44 p-4">
                                            <div className="flex flex-col gap-2">
                                                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => openDetails(booking)}>
                                                    Details / payment
                                                </Button>
                                                {booking.status === 'confirmed' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full text-xs"
                                                        onClick={() => changeStatus(booking, 'checked_in')}
                                                    >
                                                        Check in
                                                    </Button>
                                                )}
                                                {booking.status === 'checked_in' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full text-xs"
                                                        onClick={() => changeStatus(booking, 'completed')}
                                                    >
                                                        Complete
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!filtered.length && (
                                    <tr>
                                        <td colSpan={9} className="text-muted-foreground p-10 text-center">
                                            No matching bookings.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <div className="grid min-w-0 gap-3 md:hidden" data-testid="booking-cards">
                    {filtered.map((booking) => (
                        <Card key={booking.id}>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 basis-40">
                                        <p className="font-semibold [overflow-wrap:anywhere]">{booking.guest.full_name}</p>
                                        <p className="text-muted-foreground text-xs">{booking.guest.contact_number}</p>
                                        <p className="mt-1 font-mono text-xs [overflow-wrap:anywhere] text-sky-600">{booking.booking_reference}</p>
                                    </div>
                                    {statusBadge(booking)}
                                </div>
                                <p className="text-sm">
                                    {dates(booking)} - {timeLabel(booking.allocated_time_slot_start)}
                                </p>
                                <div className="text-muted-foreground text-sm [overflow-wrap:anywhere]">
                                    <p>{booking.total_pax} guests</p>
                                    {packageLabels(booking).map((label) => (
                                        <p key={label}>{label}</p>
                                    ))}
                                </div>
                                <div className="bg-muted/40 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3 rounded-lg p-3 text-sm [overflow-wrap:anywhere] tabular-nums">
                                    <div>
                                        Total
                                        <strong className="block">
                                            {booking.pricing_status === 'pending' ? 'To confirm' : money(booking.gross_amount)}
                                        </strong>
                                        {booking.pricing_status === 'pending' && <small>{money(booking.gross_amount)} known</small>}
                                    </div>
                                    <div>
                                        Paid<strong className="block text-emerald-600">{money(booking.amount_paid)}</strong>
                                    </div>
                                    <div>
                                        Balance<strong className="block text-amber-600">{money(booking.balance_due)}</strong>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button className="min-h-11 flex-1" variant="outline" onClick={() => openDetails(booking)}>
                                        Details / payment
                                    </Button>
                                    {booking.status === 'confirmed' && (
                                        <Button className="min-h-11 flex-1" variant="outline" onClick={() => changeStatus(booking, 'checked_in')}>
                                            Check in
                                        </Button>
                                    )}
                                    {booking.status === 'checked_in' && (
                                        <Button className="min-h-11 flex-1" variant="outline" onClick={() => changeStatus(booking, 'completed')}>
                                            Complete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {!filtered.length && <p className="text-muted-foreground py-8 text-center">No matching bookings.</p>}
                </div>
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>New booking</DialogTitle>
                        <DialogDescription>
                            Reserve a visit or overnight stay. Record payments separately from the total booking value.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="guest_name">Name</Label>
                                <Input
                                    id="guest_name"
                                    required
                                    maxLength={150}
                                    value={form.data.guest_name}
                                    onChange={(event) => form.setData('guest_name', event.target.value)}
                                />
                                <InputError message={form.errors.guest_name} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="contact_number">Contact no.</Label>
                                <Input
                                    id="contact_number"
                                    type="tel"
                                    required
                                    maxLength={30}
                                    value={form.data.contact_number}
                                    onChange={(event) => form.setData('contact_number', event.target.value)}
                                />
                                <InputError message={form.errors.contact_number} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                required
                                maxLength={255}
                                value={form.data.address}
                                onChange={(event) => form.setData('address', event.target.value)}
                            />
                            <InputError message={form.errors.address} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email (optional)</Label>
                            <Input id="email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="playtime_date">Date of visit - from</Label>
                                <Input
                                    id="playtime_date"
                                    type="date"
                                    required
                                    value={form.data.playtime_date}
                                    onChange={(event) => {
                                        const date = event.target.value;
                                        if (!date) return;
                                        form.setData((data) => ({
                                            ...data,
                                            playtime_date: date,
                                            visit_end_date:
                                                data.visit_end_date < date || (isStay && data.visit_end_date === date)
                                                    ? isStay
                                                        ? nextDate(date)
                                                        : date
                                                    : data.visit_end_date,
                                        }));
                                    }}
                                />
                                <InputError message={form.errors.playtime_date} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="visit_end_date">Date of visit - to / departure</Label>
                                <Input
                                    id="visit_end_date"
                                    type="date"
                                    min={isStay ? nextDate(form.data.playtime_date) : form.data.playtime_date}
                                    required
                                    value={form.data.visit_end_date}
                                    onChange={(event) => form.setData('visit_end_date', event.target.value)}
                                />
                                <InputError message={form.errors.visit_end_date} />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="start_time">Time of arrival</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    required
                                    value={form.data.allocated_time_slot_start}
                                    onChange={(event) => form.setData('allocated_time_slot_start', event.target.value)}
                                />
                                <InputError message={form.errors.allocated_time_slot_start} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="end_time">Departure time (optional)</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={form.data.allocated_time_slot_end}
                                    onChange={(event) => form.setData('allocated_time_slot_end', event.target.value)}
                                />
                                <InputError message={form.errors.allocated_time_slot_end} />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="quantity">Total guests</Label>
                                <Input
                                    id="quantity"
                                    readOnly
                                    aria-readonly="true"
                                    type="number"
                                    min="1"
                                    max="10000"
                                    required
                                    value={form.data.quantity}
                                />
                                <InputError message={form.errors.quantity} />
                                <p className="text-muted-foreground text-xs">Counted automatically from adults and children below.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="package_category">Package</Label>
                                <select
                                    id="package_category"
                                    className={selectClass}
                                    value={category}
                                    onChange={(event) => changeCategory(event.target.value)}
                                >
                                    {Object.entries(packageCategories).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {needsPackageChoice && (
                                <>
                                    <Label htmlFor="ticket_type_id">{packageChoiceLabel}</Label>
                                    <select
                                        id="ticket_type_id"
                                        required
                                        className={selectClass}
                                        value={form.data.ticket_type_id}
                                        onChange={(event) =>
                                            form.setData((data) => ({ ...data, ticket_type_id: event.target.value, child_unit_price: '' }))
                                        }
                                    >
                                        <option value="">Choose {packageChoiceLabel.toLowerCase()}</option>
                                        {availableRates.map((ticket) => (
                                            <option key={ticket.id} value={ticket.id}>
                                                {ticket.variant_name || ticket.duration_label || ticket.name} - {money(ticket.price!)}{' '}
                                                {ticket.pricing_basis === 'per_person' ? '/ adult' : '/ bundle'}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                            <InputError message={form.errors.ticket_type_id} />
                            {rate && !needsPackageChoice && (
                                <p className="bg-muted/40 rounded-lg p-3 text-sm">
                                    <span className="font-medium">{rate.variant_name || rate.duration_label || rate.name}</span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {money(rate.price)} {rate.pricing_basis === 'per_person' ? 'per adult' : 'per bundle'}
                                    </span>
                                    {category === 'day_tour' && (
                                        <span className="text-muted-foreground mt-1 block text-xs">
                                            The group price is selected automatically from the total number of guests.
                                        </span>
                                    )}
                                </p>
                            )}
                            {childPolicy && Number(form.data.child_count) === 0 && (
                                <p className="text-muted-foreground text-xs">
                                    Child policy {childPolicy.year}: {childPolicy.summary} Enter children below to apply this automatically.
                                </p>
                            )}
                            {!availableRates.length && (
                                <p className="text-sm text-amber-600">
                                    No active rate for this guest count. Check the number of pax or configure a rate in Packages & Rates.
                                </p>
                            )}
                            {rate?.description && <p className="text-muted-foreground text-sm">{rate.description}</p>}
                        </div>
                        {rate?.pricing_basis === 'per_booking' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="package_quantity">Number of bundles</Label>
                                <Input
                                    id="package_quantity"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    required
                                    value={form.data.package_quantity}
                                    onChange={(event) => form.setData('package_quantity', Number(event.target.value))}
                                />
                                <p className="text-muted-foreground text-sm">
                                    Each bundle covers up to {rate.included_pax} guests. {units} bundle(s) cover up to{' '}
                                    {units * Number(rate.included_pax)} guests.
                                </p>
                                <InputError message={form.errors.package_quantity} />
                                {insufficientBundles && (
                                    <p className="text-sm text-rose-600">Add more bundles or select a larger variant to cover all guests.</p>
                                )}
                            </div>
                        )}
                        <div className="space-y-3 rounded-xl border p-4">
                            <h3 className="font-semibold">Adults & children</h3>
                            <p className="text-muted-foreground text-xs">
                                Enter the guest counts and each child’s age. Charges and total guests are calculated automatically.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="adult_count">Adults</Label>
                                    <Input
                                        id="adult_count"
                                        required
                                        type="number"
                                        min="0"
                                        max="10000"
                                        value={form.data.adult_count}
                                        onChange={(event) => changeBreakdown('adult_count', event.target.value)}
                                    />
                                    <InputError message={form.errors.adult_count} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="child_count">Children</Label>
                                    <Input
                                        id="child_count"
                                        required
                                        type="number"
                                        min="0"
                                        max="10000"
                                        value={form.data.child_count}
                                        onChange={(event) => changeBreakdown('child_count', event.target.value)}
                                    />
                                    <InputError message={form.errors.child_count} />
                                </div>
                            </div>
                            {Number(form.data.child_count) > 0 && childPolicy && (
                                <ChildAgeFields
                                    prefix="new"
                                    policy={childPolicy}
                                    ages={form.data.child_ages}
                                    regularPrice={rate!.price!}
                                    onChange={(ages) => form.setData('child_ages', ages)}
                                    errors={form.errors}
                                />
                            )}
                            {Number(form.data.child_count) > 0 && rate?.pricing_basis === 'per_person' && !childPolicy && (
                                <div className="space-y-1.5">
                                    <p className="text-muted-foreground text-xs">
                                        {rate.child_pricing === 'same'
                                            ? `Package policy: same rate as adults (${money(rate.price)}).`
                                            : rate.child_pricing === 'custom'
                                              ? `Package child rate: ${money(rate.child_price)}.`
                                              : 'Child pricing for this package is still to confirm. Set the policy in Packages & Rates.'}
                                    </p>
                                    <InputError message={form.errors.child_unit_price} />
                                </div>
                            )}
                            {Number(form.data.child_count) > 0 && rate?.pricing_basis === 'per_booking' && (
                                <p className="text-muted-foreground text-xs">Children count toward the number of guests covered by the bundle.</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="promotion_reference">Promotion / brochure reference (optional)</Label>
                            <Input
                                id="promotion_reference"
                                maxLength={255}
                                value={form.data.promotion_reference}
                                onChange={(event) => form.setData('promotion_reference', event.target.value)}
                            />
                            <InputError message={form.errors.promotion_reference} />
                        </div>
                        <BookingAddonFields
                            prefix="new"
                            rows={form.data.addons}
                            onChange={(rows) => form.setData('addons', rows)}
                            catalog={addonItems}
                            errors={form.errors}
                        />
                        <div className="space-y-1.5">
                            <Label htmlFor="food_serving_time">Food serving time (optional)</Label>
                            <Input
                                id="food_serving_time"
                                type="time"
                                value={form.data.food_serving_time}
                                onChange={(event) => form.setData('food_serving_time', event.target.value)}
                            />
                            <InputError message={form.errors.food_serving_time} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="remarks">Other requests</Label>
                            <textarea
                                id="remarks"
                                rows={2}
                                maxLength={5000}
                                className={selectClass}
                                value={form.data.remarks}
                                onChange={(event) => form.setData('remarks', event.target.value)}
                                placeholder="None, or describe any requests"
                            />
                            <InputError message={form.errors.remarks} />
                        </div>
                        <div className="bg-muted/30 rounded-xl border p-4 [&>div]:flex-wrap">
                            <h3 className="mb-3 font-semibold">Automatic charge breakdown</h3>
                            {rate?.pricing_basis === 'per_person' && (
                                <>
                                    <div className="mb-2 flex justify-between gap-2 text-sm">
                                        <span>
                                            Adults: {form.data.adult_count || 0} × {money(rate.price)}
                                        </span>
                                        <strong>{money((Math.round(Number(rate.price) * 100) * Number(form.data.adult_count)) / 100)}</strong>
                                    </div>
                                    {childPolicy
                                        ? ageQuotes.map((quote, index) => (
                                              <div key={index} className="mb-2 flex justify-between gap-2 text-sm">
                                                  <span>
                                                      Child {index + 1}
                                                      {form.data.child_ages[index] !== '' ? ` (age ${form.data.child_ages[index]})` : ''}:{' '}
                                                      {quote.label}
                                                  </span>
                                                  <strong>{money(quote.price)}</strong>
                                              </div>
                                          ))
                                        : Number(form.data.child_count) > 0 && (
                                              <div className="mb-2 flex justify-between gap-2 text-sm">
                                                  <span>
                                                      Children: {form.data.child_count} × {money(effectiveChildPrice)}
                                                  </span>
                                                  <strong>{effectiveChildPrice === null ? 'To confirm' : money(childTotalCents / 100)}</strong>
                                              </div>
                                          )}
                                </>
                            )}
                            {rate?.pricing_basis === 'per_booking' && (
                                <div className="mb-2 flex justify-between gap-2 text-sm">
                                    <span>
                                        {units} bundle(s) × {money(rate.price)}
                                    </span>
                                    <strong>{money(baseTotal)}</strong>
                                </div>
                            )}
                            {form.data.addons.length > 0 && (
                                <div className="mb-2 flex justify-between gap-2 text-sm">
                                    <span>
                                        Food & add-ons
                                        {form.data.addons.some((row) => !row.is_included && row.unit_price === '') ? ' (known charges)' : ''}
                                    </span>
                                    <strong>{money(addonTotal(form.data.addons))}</strong>
                                </div>
                            )}
                            <div className="flex justify-between gap-2">
                                <span>
                                    {rate?.pricing_basis === 'per_person'
                                        ? `${form.data.adult_count} adults + ${form.data.child_count} children`
                                        : `${money(rate?.price ?? 0)} x ${units || 0} ${rate?.pricing_basis === 'per_booking' ? 'bundle(s)' : 'person(s)'}`}
                                </span>
                                <strong>
                                    {pricingPending ? 'Known charges' : 'Total booking'}: {money(total)}
                                </strong>
                            </div>
                            {pricingPending && (
                                <p className="mt-2 text-sm text-amber-700">
                                    Final total and balance: To confirm. Missing prices have not been treated as free.
                                </p>
                            )}
                            <div className="mt-2 flex justify-between gap-2 text-sm text-emerald-600">
                                <span>Paid / deposit</span>
                                <strong>{money(deposit)}</strong>
                            </div>
                            <div className="mt-2 flex justify-between gap-2 border-t pt-2 font-semibold">
                                <span>{pricingPending ? 'Remaining known charges' : 'Remaining balance'}</span>
                                <span>{money(Math.max(0, Math.round((total - deposit) * 100) / 100))}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="payment_amount">Amount paid / initial deposit (PHP)</Label>
                            <Input
                                id="payment_amount"
                                type="number"
                                min="0"
                                step="0.01"
                                max={total}
                                value={form.data.payment_amount}
                                onChange={(event) => form.setData('payment_amount', event.target.value)}
                                placeholder="0.00"
                            />
                            <InputError message={form.errors.payment_amount} />
                        </div>
                        {deposit > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="paid_on">Date paid</Label>
                                    <Input
                                        id="paid_on"
                                        type="date"
                                        required
                                        max={today}
                                        value={form.data.paid_on}
                                        onChange={(event) => form.setData('paid_on', event.target.value)}
                                    />
                                    <InputError message={form.errors.paid_on} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="payment_method">Payment method</Label>
                                    <select
                                        id="payment_method"
                                        className={selectClass}
                                        value={form.data.payment_method}
                                        onChange={(event) => form.setData('payment_method', event.target.value)}
                                    >
                                        {Object.entries(methods).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={form.errors.payment_method} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="payment_reference">Payment reference (optional)</Label>
                                    <Input
                                        id="payment_reference"
                                        maxLength={255}
                                        value={form.data.payment_reference}
                                        onChange={(event) => form.setData('payment_reference', event.target.value)}
                                    />
                                    <InputError message={form.errors.payment_reference} />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="booking_status">Booking status</Label>
                            <select
                                id="booking_status"
                                className={selectClass}
                                value={form.data.status}
                                onChange={(event) => form.setData('status', event.target.value)}
                            >
                                <option value="confirmed">Confirmed reservation</option>
                                <option value="checked_in">Checked in / walk-in</option>
                            </select>
                            <InputError message={form.errors.status} />
                        </div>
                        <div className="space-y-3 rounded-xl border p-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    id="assign_wristbands"
                                    type="checkbox"
                                    checked={form.data.assign_wristbands}
                                    onChange={(event) => form.setData('assign_wristbands', event.target.checked)}
                                />{' '}
                                Assign wristbands now
                            </label>
                            <p className="text-muted-foreground text-xs">Optional when recording an advance reservation.</p>
                            {form.data.assign_wristbands && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wristband_color">Color</Label>
                                        <select
                                            id="wristband_color"
                                            className={selectClass}
                                            value={form.data.wristband_color}
                                            onChange={(event) => form.setData('wristband_color', event.target.value)}
                                        >
                                            {['BLUE', 'ORANGE', 'PINK', 'GREEN'].map((color) => (
                                                <option key={color}>{color}</option>
                                            ))}
                                        </select>
                                        <InputError message={form.errors.wristband_color} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wristband_start_number">Starting wristband no.</Label>
                                        <Input
                                            id="wristband_start_number"
                                            type="number"
                                            min="1"
                                            required
                                            value={form.data.wristband_start_number}
                                            onChange={(event) => form.setData('wristband_start_number', Number(event.target.value))}
                                        />
                                        <InputError message={form.errors.wristband_start_number} />
                                    </div>
                                    <p className="text-muted-foreground text-xs sm:col-span-2">
                                        {form.data.quantity} bands: #{form.data.wristband_start_number} to #
                                        {form.data.wristband_start_number + form.data.quantity - 1}
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing || !rate || !!insufficientBundles || deposit > total}>
                                <CalendarDays className="size-4" />
                                {form.processing ? 'Saving...' : 'Save booking'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selected.booking_reference}</DialogTitle>
                                <DialogDescription>Guest reservation and payment history</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground">Name</p>
                                    <strong>{selected.guest.full_name}</strong>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Contact no.</p>
                                    {selected.guest.contact_number}
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-muted-foreground">Address</p>
                                    {selected.guest.address || 'Not recorded'}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Date of visit</p>
                                    {dates(selected)}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Time of arrival</p>
                                    {timeLabel(selected.allocated_time_slot_start)}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">No. of pax</p>
                                    {selected.total_pax}
                                    {selected.adult_count !== null && (
                                        <p className="text-muted-foreground text-xs">
                                            {selected.adult_count} adults + {selected.child_count} children
                                        </p>
                                    )}
                                </div>
                                <div>{statusBadge(selected)}</div>
                                {selected.food_serving_time && (
                                    <div>
                                        <p className="text-muted-foreground">Food serving time</p>
                                        {timeLabel(selected.food_serving_time)}
                                    </div>
                                )}
                                {selected.promotion_reference && (
                                    <div>
                                        <p className="text-muted-foreground">Promotion / brochure</p>
                                        {selected.promotion_reference}
                                    </div>
                                )}
                                <div className="sm:col-span-2">
                                    <p className="text-muted-foreground">Other requests</p>
                                    <p className="whitespace-pre-line">{selected.remarks || 'None'}</p>
                                </div>
                            </div>
                            <div className="bg-muted/30 space-y-2 rounded-xl border p-4 [overflow-wrap:anywhere] [&>div]:flex-wrap [&>div]:gap-x-3">
                                {selected.items.map((item) => (
                                    <div key={item.id}>
                                        <p className="font-medium">
                                            {item.description || item.ticket_type.name}
                                            {item.guest_type !== 'all'
                                                ? ` (${item.guest_type}${item.guest_type === 'child' && selected.child_policy ? (item.guest_age === null ? ', age to confirm' : `, age ${item.guest_age}`) : ''})`
                                                : ''}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            {money(item.unit_price)} x {item.quantity}{' '}
                                            {item.pricing_basis === 'per_booking' ? 'bundle(s)' : 'person(s)'} = {money(item.line_total)}
                                        </p>
                                    </div>
                                ))}
                                {selected.addons.map((item) => (
                                    <div key={`addon-${item.id}`} className="text-sm">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-muted-foreground">
                                            {Number(item.quantity)} {item.unit}(s) × {money(item.unit_price)} ={' '}
                                            {item.is_included ? 'Included' : money(item.line_total)}
                                        </p>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t pt-2">
                                    <span>{selected.pricing_status === 'pending' ? 'Known charges' : 'Total booking'}</span>
                                    <strong>{money(selected.gross_amount)}</strong>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>Total paid</span>
                                    <strong>{money(selected.amount_paid)}</strong>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>Balance due</span>
                                    <span>{money(selected.balance_due)}</span>
                                </div>
                            </div>
                            {selected.pricing_status === 'pending' && (
                                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    Final total and balance are awaiting the missing prices. Remaining known charges:{' '}
                                    {money(selected.known_balance_due)}.
                                </p>
                            )}
                            {selected.child_policy && (
                                <p className="text-muted-foreground text-sm">
                                    SDFP child policy {selected.child_policy.year}: {selected.child_policy.summary}
                                </p>
                            )}
                            {selected.status !== 'cancelled' && (
                                <Button type="button" variant="outline" onClick={() => setEditingFood(!editingFood)}>
                                    {editingFood ? 'Hide pricing editor' : 'Edit food / confirm prices'}
                                </Button>
                            )}
                            {editingFood && (
                                <form
                                    className="space-y-3 rounded-xl border p-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        food.put(route('bookings.addons', selected.id), {
                                            preserveScroll: true,
                                            onSuccess: () => setEditingFood(false),
                                        });
                                    }}
                                >
                                    {selected.child_policy && (
                                        <ChildAgeFields
                                            prefix="edit"
                                            policy={selected.child_policy}
                                            ages={food.data.child_ages}
                                            regularPrice={selected.child_policy.regular_price!}
                                            onChange={(ages) => food.setData('child_ages', ages)}
                                            errors={food.errors}
                                        />
                                    )}
                                    {!selected.child_policy && selected.items.some((item) => item.guest_type === 'child') && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_child_price">Confirmed child rate per person (PHP)</Label>
                                            <Input
                                                id="edit_child_price"
                                                type="number"
                                                min="0"
                                                max="99999999.99"
                                                step="0.01"
                                                placeholder="To confirm"
                                                value={food.data.child_unit_price}
                                                onChange={(event) => food.setData('child_unit_price', event.target.value)}
                                            />
                                            <p className="text-muted-foreground text-xs">
                                                Enter 0 only when the child is explicitly free. Blank keeps the quote pending.
                                            </p>
                                            <InputError message={food.errors.child_unit_price} />
                                        </div>
                                    )}
                                    <BookingAddonFields
                                        prefix="edit"
                                        rows={food.data.addons}
                                        onChange={(rows) => food.setData('addons', rows)}
                                        catalog={addonItems}
                                        errors={food.errors}
                                    />
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_serving_time">Food serving time</Label>
                                        <Input
                                            id="edit_serving_time"
                                            type="time"
                                            value={food.data.food_serving_time}
                                            onChange={(event) => food.setData('food_serving_time', event.target.value)}
                                        />
                                        <InputError message={food.errors.food_serving_time} />
                                    </div>
                                    <Button type="submit" disabled={food.processing}>
                                        {food.processing ? 'Saving...' : 'Save food and pricing'}
                                    </Button>
                                </form>
                            )}
                            <div className="space-y-2">
                                <h3 className="font-semibold">Payments</h3>
                                {!selected.payments.length && <p className="text-muted-foreground text-sm">No payment recorded.</p>}
                                {selected.payments.map((receipt) => (
                                    <div key={receipt.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
                                        <div>
                                            <p>
                                                {dateLabel(receipt.paid_on)} -{' '}
                                                {methods[receipt.payment_method as keyof typeof methods] || receipt.payment_method}
                                            </p>
                                            {receipt.reference && <p className="text-muted-foreground text-xs">{receipt.reference}</p>}
                                        </div>
                                        <strong className="text-emerald-600">{money(receipt.amount)}</strong>
                                    </div>
                                ))}
                            </div>
                            {Number(selected.known_balance_due) > 0 && selected.status !== 'cancelled' && (
                                <form onSubmit={submitPayment} className="space-y-3 rounded-xl border p-4">
                                    <h3 className="flex items-center gap-2 font-semibold">
                                        <CreditCard className="size-4" /> Record another payment
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="receipt_amount">Amount (PHP)</Label>
                                            <Input
                                                id="receipt_amount"
                                                type="number"
                                                required
                                                min="0.01"
                                                step="0.01"
                                                max={selected.known_balance_due}
                                                value={payment.data.amount}
                                                onChange={(event) => payment.setData('amount', event.target.value)}
                                            />
                                            <InputError message={payment.errors.amount} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="receipt_date">Date paid</Label>
                                            <Input
                                                id="receipt_date"
                                                type="date"
                                                required
                                                max={today}
                                                value={payment.data.paid_on}
                                                onChange={(event) => payment.setData('paid_on', event.target.value)}
                                            />
                                            <InputError message={payment.errors.paid_on} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="receipt_method">Payment method</Label>
                                            <select
                                                id="receipt_method"
                                                className={selectClass}
                                                value={payment.data.payment_method}
                                                onChange={(event) => payment.setData('payment_method', event.target.value)}
                                            >
                                                {Object.entries(methods).map(([key, label]) => (
                                                    <option key={key} value={key}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={payment.errors.payment_method} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="receipt_reference">Reference (optional)</Label>
                                            <Input
                                                id="receipt_reference"
                                                value={payment.data.reference}
                                                onChange={(event) => payment.setData('reference', event.target.value)}
                                            />
                                            <InputError message={payment.errors.reference} />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={payment.processing}>
                                        {payment.processing ? 'Recording...' : 'Record payment'}
                                    </Button>
                                </form>
                            )}
                            <div className="flex gap-2">
                                {selected.status === 'confirmed' && (
                                    <Button variant="outline" onClick={() => changeStatus(selected, 'checked_in')}>
                                        Check in
                                    </Button>
                                )}
                                {selected.status === 'checked_in' && (
                                    <Button variant="outline" onClick={() => changeStatus(selected, 'completed')}>
                                        Complete visit
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setSelectedId(null)}>
                                    Close
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
