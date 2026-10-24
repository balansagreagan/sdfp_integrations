import { FormErrors } from '@/components/form-errors';
import { InventoryMonitoring, StockBadge, StockFilter, type MonitoredItem } from '@/components/inventory-monitoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, Edit2, PackageCheck, Plus, Refrigerator, Search, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Soaked Inventory', href: '/soaked-inventory' },
];

type Item = MonitoredItem & {
    id: number;
    item_code: string;
    name: string;
    category: string;
    quantity_in_stock: number | string;
    min_threshold: number | string;
    unit: string;
    unit_cost?: string | number | null;
    notes?: string | null;
};
type Props = { items: Item[]; stats: { itemTypes: number; lowStock: number; perishable: number; stockValue: number } };
const categories = ['all', 'ingredients', 'perishables', 'beverages', 'packaging', 'cleaning'];
type Metric = { title: string; value: string; icon: LucideIcon; color: string };

export default function RestaurantInventoryIndex({ items = [], stats }: Props) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [stockStatus, setStockStatus] = useState('all');
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const createForm = useForm({
        item_code: '',
        name: '',
        category: 'ingredients',
        quantity_in_stock: 0,
        min_threshold: 5,
        unit: 'pcs',
        unit_cost: '' as number | '',
        notes: '',
    });
    const editForm = useForm({ quantity_in_stock: 0, min_threshold: 0, unit_cost: '' as number | '', notes: '' });
    const filtered = useMemo(
        () =>
            items.filter(
                (item) =>
                    (category === 'all' || item.category === category) &&
                    (stockStatus === 'all' || item.stock_status === stockStatus) &&
                    `${item.item_code} ${item.name}`.toLowerCase().includes(search.toLowerCase()),
            ),
        [items, category, search, stockStatus],
    );
    const openEdit = (item: Item) => {
        setEditing(item);
        editForm.setData({
            quantity_in_stock: Number(item.quantity_in_stock),
            min_threshold: Number(item.min_threshold),
            unit_cost: item.unit_cost == null ? '' : Number(item.unit_cost),
            notes: item.notes ?? '',
        });
    };
    const categoryLabel = (value: string) => value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Soaked Restaurant Inventory · SDFP" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Soaked Restaurant Inventory</h1>
                            <Badge className="bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/30 dark:text-orange-300">Kitchen & Bar</Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">Track ingredients, beverages, packaging, and restaurant supplies.</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="self-start bg-orange-600 text-white hover:bg-orange-500 sm:self-auto">
                        <Plus className="mr-2 size-4" />
                        Add stock item
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                        [
                            {
                                title: 'Catalog items',
                                value: `${stats?.itemTypes ?? items.length} items`,
                                icon: PackageCheck,
                                color: 'text-orange-600',
                            },
                            { title: 'Low-stock alerts', value: `${stats?.lowStock ?? 0} to reorder`, icon: AlertTriangle, color: 'text-rose-600' },
                            {
                                title: 'Perishable lines',
                                value: `${stats?.perishable ?? 0} chilled / fresh`,
                                icon: Refrigerator,
                                color: 'text-sky-600',
                            },
                            {
                                title: 'Stock value',
                                value: `₱${Number(stats?.stockValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                icon: UtensilsCrossed,
                                color: 'text-emerald-600',
                            },
                        ] satisfies Metric[]
                    ).map(({ title, value, icon: Icon, color }) => (
                        <Card key={title} className="border-neutral-200/80 shadow-xs">
                            <CardHeader className="flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">{title}</CardTitle>
                                <Icon className={`size-4 ${color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <InventoryMonitoring items={items} onAdjust={openEdit} filename="restaurant" />
                <StockFilter value={stockStatus} onChange={setStockStatus} />
                <Card className="border-neutral-200/80 shadow-xs">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search item code or name"
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {categories.map((item) => (
                                <Button
                                    key={item}
                                    size="sm"
                                    variant={category === item ? 'default' : 'outline'}
                                    onClick={() => setCategory(item)}
                                    className={category === item ? 'bg-orange-600 hover:bg-orange-500' : ''}
                                >
                                    {item === 'all' ? 'All items' : categoryLabel(item)}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-neutral-200/80 shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:bg-neutral-900">
                                <tr>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">On hand</th>
                                    <th className="px-6 py-3">Unit cost</th>
                                    <th className="px-6 py-3">Notes</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                {filtered.map((item) => {
                                    const low = item.stock_status !== 'in_stock';
                                    return (
                                        <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-semibold text-orange-600">{item.item_code}</div>
                                                <div className="font-semibold">{item.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600 capitalize dark:text-neutral-300">
                                                {categoryLabel(item.category)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={low ? 'font-bold text-rose-600' : 'font-bold'}>
                                                    {item.quantity_in_stock} {item.unit}
                                                </span>
                                                <span className="ml-2">
                                                    <StockBadge status={item.stock_status} />
                                                </span>
                                                <div className="text-xs text-neutral-400">
                                                    Min. {item.min_threshold} {item.unit}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.unit_cost == null ? 'Cost not set' : `₱${Number(item.unit_cost).toLocaleString()}`}
                                            </td>
                                            <td className="max-w-xs truncate px-6 py-4 text-xs text-neutral-500">{item.notes || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                                                    <Edit2 className="mr-1.5 size-3" />
                                                    Adjust
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                            No restaurant inventory items found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add restaurant stock</DialogTitle>
                        <DialogDescription>Add an item to Soaked Restaurant’s stock register.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            createForm.post(route('restaurant-inventory.store'), {
                                onSuccess: () => {
                                    setCreateOpen(false);
                                    createForm.reset();
                                },
                            });
                        }}
                    >
                        <FormErrors errors={createForm.errors} />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Item code">
                                <Input
                                    required
                                    value={createForm.data.item_code}
                                    onChange={(e) => createForm.setData('item_code', e.target.value)}
                                    placeholder="SR-ITEM"
                                />
                            </Field>
                            <Field label="Category">
                                <select
                                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                                    value={createForm.data.category}
                                    onChange={(e) => createForm.setData('category', e.target.value)}
                                >
                                    {categories.slice(1).map((item) => (
                                        <option key={item} value={item}>
                                            {categoryLabel(item)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <Field label="Item name">
                            <Input required value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="On hand">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={createForm.data.quantity_in_stock}
                                    onChange={(e) => createForm.setData('quantity_in_stock', Number(e.target.value))}
                                />
                            </Field>
                            <Field label="Minimum">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={createForm.data.min_threshold}
                                    onChange={(e) => createForm.setData('min_threshold', Number(e.target.value))}
                                />
                            </Field>
                            <Field label="Unit">
                                <Input
                                    required
                                    value={createForm.data.unit}
                                    onChange={(e) => createForm.setData('unit', e.target.value)}
                                    placeholder="kg"
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Unit cost (₱)">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={createForm.data.unit_cost}
                                    onChange={(e) => createForm.setData('unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </Field>
                            <Field label="Notes">
                                <Input value={createForm.data.notes} onChange={(e) => createForm.setData('notes', e.target.value)} />
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-500" disabled={createForm.processing}>
                                Add item
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust stock: {editing?.name}</DialogTitle>
                        <DialogDescription>Update stock levels and reordering details.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (editing) editForm.put(route('restaurant-inventory.update', editing.id), { onSuccess: () => setEditing(null) });
                        }}
                    >
                        <FormErrors errors={editForm.errors} />
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="On hand">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={editForm.data.quantity_in_stock}
                                    onChange={(e) => editForm.setData('quantity_in_stock', Number(e.target.value))}
                                />
                            </Field>
                            <Field label="Minimum">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={editForm.data.min_threshold}
                                    onChange={(e) => editForm.setData('min_threshold', Number(e.target.value))}
                                />
                            </Field>
                            <Field label="Unit cost">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.data.unit_cost}
                                    onChange={(e) => editForm.setData('unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </Field>
                        </div>
                        <Field label="Notes">
                            <Input value={editForm.data.notes} onChange={(e) => editForm.setData('notes', e.target.value)} />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-500" disabled={editForm.processing}>
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
