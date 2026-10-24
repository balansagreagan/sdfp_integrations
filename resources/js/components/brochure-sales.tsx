import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export interface BrochureCoupon {
    id: number;
    brochure_id: number;
    type: string;
    number: number;
    state: 'unused' | 'reserved' | 'used' | 'unavailable';
    booking_id: number | null;
}
export interface BrochureRecord {
    id: number;
    card_number: string;
    purchased_on: string;
    expires_on: string;
    source: 'sold' | 'previous';
    amount_paid: string;
    guest: { full_name: string; contact_number: string };
    coupons: BrochureCoupon[];
}
export type BrochureOffers = Record<string, { label: string; count: number; scope: string; percent: number }>;

export default function BrochureSales({ brochures, offers, today }: { brochures: BrochureRecord[]; offers: BrochureOffers; today: string }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const form = useForm({
        card_number: '',
        guest_name: '',
        contact_number: '',
        source: 'sold',
        purchased_on: today,
        payment_method: 'cash',
        reference: '',
        unused_coupons: [] as string[],
        coupons_verified: false as boolean,
    });
    return (
        <section className="space-y-3 rounded-xl border p-4" data-testid="brochure-sales">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Brochures & coupons</h2>
                    <p className="text-muted-foreground text-sm">
                        One ₱499 brochure contains 18 coupons, including one free all-day visit for up to 7 guests. Valid through August 31, 2028.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        form.clearErrors();
                        setOpen(true);
                    }}
                >
                    Sell / register brochure
                </Button>
            </div>
            <details>
                <summary className="cursor-pointer text-sm font-medium">View registered brochures ({brochures.length})</summary>
                <div className="mt-3 space-y-3">
                    <Input
                        aria-label="Find brochure"
                        placeholder="Find card number, purchaser or contact"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                        {brochures
                            .filter((item) =>
                                `${item.card_number} ${item.guest.full_name} ${item.guest.contact_number}`
                                    .toLowerCase()
                                    .includes(search.toLowerCase()),
                            )
                            .map((brochure) => (
                                <details className="rounded-lg border p-3" key={brochure.id}>
                                    <summary className="cursor-pointer text-sm">
                                        <strong>{brochure.card_number}</strong> · {brochure.guest.full_name} ·{' '}
                                        {brochure.coupons.filter((coupon) => coupon.state === 'unused').length} unused coupons
                                    </summary>
                                    <p className="text-muted-foreground my-2 text-xs">
                                        {brochure.source === 'sold' ? '₱499 sale recorded' : 'Previously paid — no new sale recorded'} · Transferable:
                                        the user may differ from the purchaser.
                                    </p>
                                    <ul className="space-y-1 text-sm">
                                        {brochure.coupons.map((coupon) => (
                                            <li className="flex flex-wrap justify-between gap-2" key={coupon.id}>
                                                <span>
                                                    {offers[coupon.type]?.label} #{coupon.number}
                                                </span>
                                                <Badge variant="secondary">{coupon.state}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ))}
                    </div>
                </div>
            </details>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Sell / register a brochure</DialogTitle>
                        <DialogDescription>
                            Use the printed card number. Register an already-paid brochure without charging it again.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(route('brochures.store'), {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setOpen(false);
                                    form.reset();
                                },
                            });
                        }}
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="brochure_source">Transaction</Label>
                            <select
                                id="brochure_source"
                                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                                value={form.data.source}
                                onChange={(event) => form.setData('source', event.target.value)}
                            >
                                <option value="sold">Sell a new brochure — collect ₱499</option>
                                <option value="previous">Register a previously purchased brochure — collect ₱0</option>
                            </select>
                            <InputError message={form.errors.source} />
                        </div>
                        {(
                            [
                                ['card_number', 'Printed card number', 'text'],
                                ['guest_name', 'Purchaser name', 'text'],
                                ['contact_number', 'Contact number', 'tel'],
                                ['purchased_on', 'Purchase / payment date', 'date'],
                            ] as const
                        ).map(([key, label, type]) => (
                            <div className="space-y-1.5" key={key}>
                                <Label htmlFor={`brochure_${key}`}>{label}</Label>
                                <Input
                                    id={`brochure_${key}`}
                                    type={type}
                                    required
                                    maxLength={key === 'card_number' ? 60 : key === 'contact_number' ? 30 : 150}
                                    max={type === 'date' ? today : undefined}
                                    value={form.data[key]}
                                    onChange={(event) => form.setData(key, event.target.value)}
                                />
                                <InputError message={form.errors[key]} />
                            </div>
                        ))}
                        {form.data.source === 'sold' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="brochure_payment">Payment method</Label>
                                <select
                                    id="brochure_payment"
                                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                                    value={form.data.payment_method}
                                    onChange={(event) => form.setData('payment_method', event.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya</option>
                                    <option value="bank_transfer">Bank transfer</option>
                                </select>
                                <InputError message={form.errors.payment_method} />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="brochure_reference">
                                {form.data.source === 'previous'
                                    ? 'Original receipt / distributor reference (required)'
                                    : 'Payment reference (optional)'}
                            </Label>
                            <Input
                                id="brochure_reference"
                                maxLength={255}
                                required={form.data.source === 'previous'}
                                value={form.data.reference}
                                onChange={(event) => form.setData('reference', event.target.value)}
                            />
                            <InputError message={form.errors.reference} />
                        </div>
                        {form.data.source === 'previous' && (
                            <fieldset className="space-y-2 rounded-lg border p-3">
                                <legend className="px-1 text-sm font-semibold">Which printed coupons are still unused?</legend>
                                <p className="text-muted-foreground text-xs">
                                    Check only coupons that remain physically present and unused. Leave previously redeemed or missing coupons
                                    unchecked; they will not be issued again.
                                </p>
                                {Object.entries(offers).flatMap(([type, offer]) =>
                                    Array.from({ length: offer.count }, (_, index) => {
                                        const key = `${type}:${index + 1}`;
                                        return (
                                            <label className="flex items-start gap-2 text-sm" key={key}>
                                                <input
                                                    className="mt-1"
                                                    type="checkbox"
                                                    checked={form.data.unused_coupons.includes(key)}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'unused_coupons',
                                                            event.target.checked
                                                                ? [...form.data.unused_coupons, key]
                                                                : form.data.unused_coupons.filter((item) => item !== key),
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {offer.label} #{index + 1}
                                                </span>
                                            </label>
                                        );
                                    }),
                                )}
                                <InputError message={form.errors.unused_coupons} />
                                <label className="flex items-start gap-2 border-t pt-2 text-sm">
                                    <input
                                        className="mt-1"
                                        type="checkbox"
                                        required
                                        checked={form.data.coupons_verified}
                                        onChange={(event) => form.setData('coupons_verified', event.target.checked)}
                                    />
                                    I checked the physical brochure and its remaining unused coupons.
                                </label>
                                <InputError message={form.errors.coupons_verified} />
                            </fieldset>
                        )}
                        <p className="bg-muted rounded-lg p-3 text-sm">
                            {form.data.source === 'sold'
                                ? 'Save only after receiving the full ₱499. This records one brochure sale in Daily Sales.'
                                : 'This registers the existing card and its coupons. It does not create a new payment or add ₱499 to sales.'}{' '}
                            Brochures are non-refundable once signed and paid.
                        </p>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : form.data.source === 'sold' ? 'Record ₱499 sale' : 'Register without charging again'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
