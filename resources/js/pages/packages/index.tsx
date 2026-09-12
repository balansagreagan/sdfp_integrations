import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Boxes,
    Check,
    Clock,
    DollarSign,
    Edit2,
    LifeBuoy,
    Plus,
    Sparkles,
    Tag,
    Waves,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Packages & Rates', href: '/packages' },
];

interface PackagesIndexProps {
    packages: any[];
    stats: {
        totalPassesSold: number;
        totalRevenueGenerated: number;
        activePackagesCount: number;
    };
    isAdmin: boolean;
}

export default function PackagesIndex({ packages = [], stats, isAdmin = false }: PackagesIndexProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<any | null>(null);

    const createForm = useForm({
        code: '',
        name: '',
        duration_hours: 2,
        price: '',
        is_active: true,
    });

    const editForm = useForm({
        name: '',
        duration_hours: 2,
        price: '',
        is_active: true,
    });

    const handleOpenEdit = (pkg: any) => {
        setEditingPackage(pkg);
        editForm.setData({
            name: pkg.name,
            duration_hours: pkg.duration_hours || 2,
            price: String(pkg.price),
            is_active: Boolean(pkg.is_active),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('packages.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPackage) return;

        editForm.put(route('packages.update', editingPackage.id), {
            onSuccess: () => {
                setEditingPackage(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Park Packages & Rates · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Park Packages & Pass Rates
                            </h1>
                            <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30">
                                Pricing Catalog
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Configure admission packages, session durations, and water park pricing offerings.
                        </p>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 flex items-center gap-2 self-start sm:self-auto"
                        >
                            <Plus className="size-4" />
                            <span>Create New Package</span>
                        </Button>
                    )}
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/40 to-white dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Active Package Tiers
                            </CardTitle>
                            <Boxes className="size-4.5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.activePackagesCount || packages.length} Options
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Available at front ticketing desk</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/40 to-white dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Lifetime Passes Sold
                            </CardTitle>
                            <Tag className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {stats?.totalPassesSold || 12} Passes
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Total guest admissions issued</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-amber-50/40 to-white dark:border-neutral-800 dark:from-amber-950/20 dark:to-neutral-900 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Revenue Contribution
                            </CardTitle>
                            <DollarSign className="size-4.5 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(stats?.totalRevenueGenerated || 1938).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Direct admission revenue</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Packages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {packages.map((pkg) => {
                        const isAllDay = pkg.code === 'ALL-DAY';
                        const isKiddie = pkg.code.includes('KIDDIE');

                        return (
                            <Card
                                key={pkg.id}
                                className={`relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-lg ${
                                    isAllDay
                                        ? 'border-orange-500/40 dark:border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-white dark:to-neutral-900 ring-1 ring-orange-500/20'
                                        : 'border-neutral-200/80 dark:border-neutral-800'
                                }`}
                            >
                                {isAllDay && (
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-xs">
                                        Best Value
                                    </div>
                                )}

                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-semibold text-neutral-400 uppercase">
                                            {pkg.code}
                                        </span>
                                        {pkg.is_active ? (
                                            <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                                        ) : (
                                            <span className="text-[10px] text-neutral-400">Inactive</span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-bold mt-1 text-neutral-900 dark:text-neutral-50">
                                        {pkg.name}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 text-xs text-neutral-500 pt-1">
                                        <Clock className="size-3.5 text-sky-500" />
                                        <span>{pkg.duration_hours ? `${pkg.duration_hours} Hours Access` : 'Open Duration'}</span>
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">
                                            ₱{Number(pkg.price).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-neutral-500">/ guest</span>
                                    </div>

                                    <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                                        <li className="flex items-center gap-2">
                                            <Check className="size-3.5 text-emerald-500 shrink-0" />
                                            <span>Full inflatable obstacle access</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="size-3.5 text-emerald-500 shrink-0" />
                                            <span>Coast guard approved life vest</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="size-3.5 text-emerald-500 shrink-0" />
                                            <span>Certified lifeguard supervision</span>
                                        </li>
                                        {isKiddie && (
                                            <li className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium">
                                                <Sparkles className="size-3.5 text-sky-500 shrink-0" />
                                                <span>Child safety life vest included</span>
                                            </li>
                                        )}
                                    </ul>

                                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                        <span className="text-[11px] text-neutral-400 font-medium">
                                            Issued: {pkg.booking_items_count || 0} passes
                                        </span>
                                        {isAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEdit(pkg)}
                                                className="h-7 px-2 text-xs text-sky-600 hover:text-sky-500"
                                            >
                                                <Edit2 className="mr-1 size-3" />
                                                Edit Rate
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Create Package Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Create Park Package Tier</DialogTitle>
                        <DialogDescription>Define pricing, session hours, and code identifier.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="pkg_code">Package Code (e.g. VIP-ALL-DAY)</Label>
                            <Input
                                id="pkg_code"
                                required
                                value={createForm.data.code}
                                onChange={(e) => createForm.setData('code', e.target.value.toUpperCase())}
                                placeholder="GROUP-PROMO"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="pkg_name">Display Name</Label>
                            <Input
                                id="pkg_name"
                                required
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="Barkada Group Pass (4 Hours)"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_duration">Duration (Hours)</Label>
                                <Input
                                    id="pkg_duration"
                                    type="number"
                                    min="1"
                                    max="12"
                                    required
                                    value={createForm.data.duration_hours}
                                    onChange={(e) => createForm.setData('duration_hours', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pkg_price">Price (₱)</Label>
                                <Input
                                    id="pkg_price"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={createForm.data.price}
                                    onChange={(e) => createForm.setData('price', e.target.value)}
                                    placeholder="149.00"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-sky-600 hover:bg-sky-500 text-white">
                                {createForm.processing ? 'Saving...' : 'Add Package'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Package Modal */}
            <Dialog open={!!editingPackage} onOpenChange={(open) => !open && setEditingPackage(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Edit Package: {editingPackage?.name}</DialogTitle>
                        <DialogDescription>Update pricing rates and active status.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_pkg_name">Package Name</Label>
                            <Input
                                id="edit_pkg_name"
                                required
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_pkg_duration">Duration (Hours)</Label>
                                <Input
                                    id="edit_pkg_duration"
                                    type="number"
                                    min="1"
                                    max="12"
                                    required
                                    value={editForm.data.duration_hours}
                                    onChange={(e) => editForm.setData('duration_hours', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_pkg_price">Price (₱)</Label>
                                <Input
                                    id="edit_pkg_price"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={editForm.data.price}
                                    onChange={(e) => editForm.setData('price', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="pkg_active"
                                checked={editForm.data.is_active}
                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                className="size-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500"
                            />
                            <Label htmlFor="pkg_active">Available for sale at counter</Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditingPackage(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="bg-sky-600 hover:bg-sky-500 text-white">
                                {editForm.processing ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
