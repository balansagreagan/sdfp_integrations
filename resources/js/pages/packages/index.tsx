import FoodAddonCatalog from '@/components/food-addon-catalog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { AddOnItem, BreadcrumbItem, ChildPolicy, TicketType } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Edit2, Plus, Tag } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Packages & Rates', href: '/packages' },
];
const money = (value: number | string) => Number(value).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const selectClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Props {
    packages: TicketType[];
    addonItems: AddOnItem[];
    categories: Record<string, string>;
    childPolicies: Record<string, ChildPolicy>;
    isAdmin: boolean;
    stats: { activePackagesCount: number; totalRevenueGenerated: number; totalPassesSold: number };
}

export default function PackagesIndex({ packages = [], categories, addonItems, childPolicies, isAdmin, stats }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<TicketType | null>(null);
    const [filter, setFilter] = useState('all');
    const form = useForm({
        code: '',
        name: '',
        category: 'admission',
        variant_name: '',
        pricing_basis: 'per_person',
        price: '',
        duration_hours: '',
        duration_label: '',
        description: '',
        min_pax: '1',
        max_pax: '',
        included_pax: '',
        is_active: true as boolean,
        child_pricing: 'age_based',
        child_price: '',
    });

    const openRate = (category: string, rate?: TicketType) => {
        setEditing(rate ?? null);
        form.clearErrors();
        form.setData({
            code: rate?.code ?? '',
            name: rate?.name ?? categories[category],
            category,
            variant_name: rate?.variant_name ?? '',
            pricing_basis: rate?.pricing_basis ?? (category.startsWith('ticket_') ? 'per_booking' : 'per_person'),
            price: rate?.price == null ? '' : String(rate.price),
            duration_hours: rate?.duration_hours == null ? '' : String(rate.duration_hours),
            duration_label: rate?.duration_label ?? '',
            description: rate?.description ?? '',
            min_pax: String(rate?.min_pax ?? 1),
            max_pax: rate?.max_pax == null ? '' : String(rate.max_pax),
            included_pax: rate?.included_pax == null ? '' : String(rate.included_pax),
            is_active: rate?.is_active ?? true,
            child_pricing: rate?.child_pricing ?? (childPolicies[category] ? 'age_based' : 'confirm'),
            child_price: rate?.child_price ?? '',
        });
        setOpen(true);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) form.put(route('packages.update', editing.id), options);
        else form.post(route('packages.store'), options);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Packages & Rates" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Packages & Rates</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Admission, meal bundles and tours. Each variant has its own price and guest coverage.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => openRate(filter === 'all' || filter === 'food' ? 'admission' : filter)}>
                            <Plus className="size-4" /> Add rate or variant
                        </Button>
                    )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-muted-foreground text-sm">Active rates</p>
                            <p className="mt-1 text-2xl font-bold text-sky-600">{stats.activePackagesCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-muted-foreground text-sm">Package categories</p>
                            <p className="mt-1 text-2xl font-bold">{Object.keys(categories).length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-muted-foreground text-sm">Known ticket charges</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-600">{money(stats.totalRevenueGenerated)}</p>
                            <p className="text-muted-foreground text-xs">Food, unconfirmed prices and payments are tracked separately.</p>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={filter === 'food' ? 'default' : 'outline'} onClick={() => setFilter('food')}>
                        Food & add-ons
                    </Button>
                    <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
                        All packages
                    </Button>
                    {Object.entries(categories).map(([key, label]) => (
                        <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
                            {label}
                        </Button>
                    ))}
                </div>
                <section className="space-y-2 rounded-xl border p-4">
                    <h2 className="font-semibold">SDFP Child Policy 2026</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2">Package</th>
                                    <th className="p-2">Age and rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['admission', 'Ticket / Brochure coupons'],
                                    ['water_fun', 'Water Fun Package'],
                                    ['overnight', 'Overnight / 2D 1N Package'],
                                ].map(([key, label]) => (
                                    <tr key={key} className="border-b last:border-0">
                                        <td className="p-2 font-medium">{label}</td>
                                        <td className="p-2">{childPolicies[key].summary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Ages are taken on the visit date. Food add-ons keep their own prices. Group bundles and Day Tour rates keep their configured
                        pricing.
                    </p>
                </section>
                {Object.entries(categories)
                    .filter(([key]) => filter === 'all' || filter === key)
                    .map(([category, label]) => (
                        <section key={category} className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold">{label}</h2>
                                {isAdmin && (
                                    <Button size="sm" variant="ghost" onClick={() => openRate(category)}>
                                        <Plus className="size-3.5" /> Add variant
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {packages
                                    .filter((rate) => rate.category === category)
                                    .map((rate) => (
                                        <Card key={rate.id} className={!rate.is_active ? 'opacity-80' : ''}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-muted-foreground font-mono text-xs">{rate.code}</span>
                                                    <Badge variant={rate.is_active && rate.price !== null ? 'default' : 'secondary'}>
                                                        {rate.price === null ? 'Price not set' : rate.is_active ? 'Available' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-lg">{rate.name}</CardTitle>
                                                {rate.variant_name && <p className="text-sm font-semibold text-sky-600">{rate.variant_name}</p>}
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div>
                                                    <p className="text-2xl font-bold">{rate.price === null ? 'Awaiting price' : money(rate.price)}</p>
                                                    <p className="text-muted-foreground text-sm">
                                                        {rate.pricing_basis === 'per_person'
                                                            ? 'per person'
                                                            : `per bundle / up to ${rate.included_pax} guests`}
                                                    </p>
                                                </div>
                                                {rate.duration_label && <p className="text-sm">{rate.duration_label}</p>}
                                                {(rate.min_pax > 1 || rate.max_pax) && (
                                                    <p className="text-muted-foreground text-sm">
                                                        Applies to {rate.max_pax ? `${rate.min_pax}-${rate.max_pax}` : `${rate.min_pax}+`} guests
                                                    </p>
                                                )}
                                                {rate.description && (
                                                    <p className="text-muted-foreground text-sm whitespace-pre-line">{rate.description}</p>
                                                )}
                                                {rate.child_pricing === 'age_based' && childPolicies[rate.category] && (
                                                    <p className="text-sm text-sky-700 dark:text-sky-400">
                                                        Child policy: {childPolicies[rate.category].summary}
                                                    </p>
                                                )}
                                                {isAdmin && (
                                                    <Button size="sm" variant="outline" onClick={() => openRate(category, rate)}>
                                                        <Edit2 className="size-3.5" /> Edit rate
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                {!packages.some((rate) => rate.category === category) && (
                                    <p className="text-muted-foreground text-sm">No rates configured yet.</p>
                                )}
                            </div>
                        </section>
                    ))}
                {(filter === 'all' || filter === 'food') && <FoodAddonCatalog items={addonItems} isAdmin={isAdmin} />}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit rate' : 'Add rate or variant'}</DialogTitle>
                        <DialogDescription>Per-person rates multiply by guests. Bundle prices multiply by the number of bundles.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_category">Package category</Label>
                                <select
                                    id="pkg_category"
                                    className={selectClass}
                                    value={form.data.category}
                                    onChange={(event) =>
                                        form.setData((data) => ({
                                            ...data,
                                            category: event.target.value,
                                            child_pricing:
                                                data.pricing_basis === 'per_person' && childPolicies[event.target.value] ? 'age_based' : 'confirm',
                                        }))
                                    }
                                >
                                    {Object.entries(categories).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.category} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_code">Rate code</Label>
                                <Input
                                    id="pkg_code"
                                    required
                                    maxLength={30}
                                    readOnly={!!editing}
                                    value={form.data.code}
                                    onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
                                    placeholder="BILAO-5"
                                />
                                <InputError message={form.errors.code} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="pkg_name">Package name</Label>
                            <Input
                                id="pkg_name"
                                required
                                maxLength={100}
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="pkg_variant">Variant / group size</Label>
                            <Input
                                id="pkg_variant"
                                required={form.data.category === 'ticket_bilao'}
                                maxLength={100}
                                value={form.data.variant_name}
                                onChange={(event) => form.setData('variant_name', event.target.value)}
                                placeholder="e.g. 5 persons"
                            />
                            <InputError message={form.errors.variant_name} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_basis">Charge by</Label>
                                <select
                                    id="pkg_basis"
                                    className={selectClass}
                                    value={form.data.pricing_basis}
                                    onChange={(event) =>
                                        form.setData((data) => ({
                                            ...data,
                                            pricing_basis: event.target.value,
                                            child_pricing:
                                                event.target.value === 'per_person' && childPolicies[data.category] ? 'age_based' : 'confirm',
                                        }))
                                    }
                                >
                                    <option value="per_person">Per person</option>
                                    <option value="per_booking">Per bundle</option>
                                </select>
                                <InputError message={form.errors.pricing_basis} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_price">Price (PHP)</Label>
                                <Input
                                    id="pkg_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="99999999.99"
                                    required={form.data.is_active}
                                    value={form.data.price}
                                    onChange={(event) => form.setData('price', event.target.value)}
                                    placeholder="Leave blank if not yet priced"
                                />
                                <InputError message={form.errors.price} />
                            </div>
                        </div>
                        {form.data.pricing_basis === 'per_person' && (
                            <div className="space-y-3 rounded-xl border p-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="pkg_child_policy">Child pricing</Label>
                                    <select
                                        id="pkg_child_policy"
                                        className={selectClass}
                                        value={form.data.child_pricing}
                                        onChange={(event) => form.setData('child_pricing', event.target.value)}
                                    >
                                        {childPolicies[form.data.category] && <option value="age_based">SDFP age-based child policy 2026</option>}
                                        <option value="confirm">Confirm child rate when booking</option>
                                        <option value="same">Same rate as adults</option>
                                        <option value="custom">Set a child rate</option>
                                    </select>
                                    <InputError message={form.errors.child_pricing} />
                                    {form.data.child_pricing === 'age_based' && childPolicies[form.data.category] && (
                                        <p className="text-muted-foreground text-xs">{childPolicies[form.data.category].summary}</p>
                                    )}
                                </div>
                                {form.data.child_pricing === 'custom' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pkg_child_price">Child rate (PHP)</Label>
                                        <Input
                                            id="pkg_child_price"
                                            required
                                            type="number"
                                            min="0"
                                            max="99999999.99"
                                            step="0.01"
                                            value={form.data.child_price}
                                            onChange={(event) => form.setData('child_price', event.target.value)}
                                        />
                                        <p className="text-muted-foreground text-xs">Use 0 only for an approved free-child policy.</p>
                                        <InputError message={form.errors.child_price} />
                                    </div>
                                )}
                            </div>
                        )}
                        {form.data.pricing_basis === 'per_booking' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_included">Guests covered by one bundle</Label>
                                <Input
                                    id="pkg_included"
                                    type="number"
                                    min="1"
                                    required
                                    value={form.data.included_pax}
                                    onChange={(event) => form.setData('included_pax', event.target.value)}
                                />
                                <InputError message={form.errors.included_pax} />
                            </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_min">Minimum guests for this rate</Label>
                                <Input
                                    id="pkg_min"
                                    type="number"
                                    min="1"
                                    required
                                    value={form.data.min_pax}
                                    onChange={(event) => form.setData('min_pax', event.target.value)}
                                />
                                <InputError message={form.errors.min_pax} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_max">Maximum guests (optional)</Label>
                                <Input
                                    id="pkg_max"
                                    type="number"
                                    min={form.data.min_pax}
                                    value={form.data.max_pax}
                                    onChange={(event) => form.setData('max_pax', event.target.value)}
                                />
                                <InputError message={form.errors.max_pax} />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_duration_label">Duration label</Label>
                                <Input
                                    id="pkg_duration_label"
                                    value={form.data.duration_label}
                                    onChange={(event) => form.setData('duration_label', event.target.value)}
                                    placeholder="All day / Overnight / 2 days, 1 night"
                                />
                                <InputError message={form.errors.duration_label} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_duration">Hours (optional)</Label>
                                <Input
                                    id="pkg_duration"
                                    type="number"
                                    min="1"
                                    max="744"
                                    value={form.data.duration_hours}
                                    onChange={(event) => form.setData('duration_hours', event.target.value)}
                                />
                                <InputError message={form.errors.duration_hours} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="pkg_description">Inclusions / details</Label>
                            <textarea
                                id="pkg_description"
                                rows={3}
                                className={selectClass}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                            <InputError message={form.errors.description} />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                id="pkg_active"
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                            />{' '}
                            Available for booking
                        </label>
                        <InputError message={form.errors.is_active} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Tag className="size-4" />
                                {form.processing ? 'Saving...' : 'Save rate'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
