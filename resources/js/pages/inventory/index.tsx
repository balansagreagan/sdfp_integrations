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
import { AlertTriangle, Edit2, LifeBuoy, Package, Plus, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Park Inventory', href: '/inventory' },
];

interface InventoryItemProps extends MonitoredItem {
    id: number;
    item_code: string;
    name: string;
    category: string;
    quantity_in_stock: number | string;
    min_threshold: number | string;
    unit_cost?: number | string | null;
    unit: string;
    condition_status: 'good' | 'needs_repair' | 'damaged';
    notes?: string;
}

interface InventoryIndexProps {
    items: InventoryItemProps[];
    stats: {
        totalItemsCount: number;
        totalLifeVests: number;
        lowStockItems: number;
        needsRepairCount: number;
    };
    isAdmin: boolean;
}

export default function InventoryIndex({ items = [], stats }: InventoryIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [stockStatus, setStockStatus] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItemProps | null>(null);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch =
                item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) || item.name.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

            return matchesSearch && matchesCategory && (stockStatus === 'all' || item.stock_status === stockStatus);
        });
    }, [items, searchQuery, selectedCategory, stockStatus]);

    const createForm = useForm({
        item_code: '',
        name: '',
        category: 'safety_gear',
        quantity_in_stock: 10,
        min_threshold: 5,
        unit: 'pcs',
        unit_cost: '' as number | '',
        condition_status: 'good',
        notes: '',
    });

    const editForm = useForm({
        quantity_in_stock: 0,
        min_threshold: 0,
        unit_cost: '' as number | '',
        condition_status: 'good',
        notes: '',
    });

    const handleOpenEdit = (item: InventoryItemProps) => {
        setEditingItem(item);
        editForm.setData({
            quantity_in_stock: Number(item.quantity_in_stock),
            min_threshold: Number(item.min_threshold),
            unit_cost: item.unit_cost == null ? '' : Number(item.unit_cost),
            condition_status: item.condition_status,
            notes: item.notes || '',
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('inventory.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        editForm.put(route('inventory.update', editingItem.id), {
            onSuccess: () => {
                setEditingItem(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Park Inventory & Safety Gear · SDFP" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
                                Park Inventory & Equipment
                            </h1>
                            <Badge className="bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/30 dark:text-sky-400">Safety & Marine Assets</Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Track Coast Guard approved life vests, inflatable park modules, mooring lines, and wristband stock.
                        </p>
                    </div>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 self-start bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-500 sm:self-auto"
                    >
                        <Plus className="size-4" />
                        <span>Add Equipment Item</span>
                    </Button>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/40 to-white shadow-xs dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Total Park Assets</CardTitle>
                            <Package className="size-4.5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.totalItemsCount ?? items.length} Item Types
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Cataloged in inventory register</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/40 to-white shadow-xs dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Life Vests Ready</CardTitle>
                            <LifeBuoy className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.totalLifeVests ?? 0} Vests</div>
                            <p className="mt-1 text-xs text-neutral-500">Adult M/L + Kiddie vests</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-amber-50/40 to-white shadow-xs dark:border-neutral-800 dark:from-amber-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Low Stock Alerts</CardTitle>
                            <AlertTriangle className="size-4.5 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.lowStockItems || 0} Items</div>
                            <p className="mt-1 text-xs text-neutral-500">Out of stock or at / below minimum</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-rose-50/40 to-white shadow-xs dark:border-neutral-800 dark:from-rose-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Needs Maintenance</CardTitle>
                            <Wrench className="size-4.5 text-rose-600 dark:text-rose-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats?.needsRepairCount || 1} Module</div>
                            <p className="mt-1 text-xs text-neutral-500">Requires patch / anchor inspection</p>
                        </CardContent>
                    </Card>
                </div>

                <InventoryMonitoring items={items} onAdjust={handleOpenEdit} filename="park" />
                <StockFilter value={stockStatus} onChange={setStockStatus} />

                {/* Filter and Search */}
                <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                            placeholder="Search item code (LV-...), name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-neutral-200 bg-neutral-50/50 pl-9 dark:border-neutral-700 dark:bg-neutral-800/50"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500">Category:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: 'all', label: 'All Items' },
                                { id: 'safety_gear', label: 'Safety Gear (Vests)' },
                                { id: 'inflatables', label: 'Inflatable Modules' },
                                { id: 'counter_supplies', label: 'Wristbands' },
                                { id: 'first_aid', label: 'First Aid' },
                                { id: 'maintenance', label: 'Maintenance' },
                            ].map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCategory(c.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                        selectedCategory === c.id
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Inventory Table */}
                <Card className="overflow-hidden border-neutral-200/80 shadow-xs dark:border-neutral-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-neutral-200/80 bg-neutral-50/75 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:border-neutral-800 dark:bg-neutral-900/75">
                                <tr>
                                    <th className="px-6 py-3.5">Item Code & Name</th>
                                    <th className="px-6 py-3.5">Category</th>
                                    <th className="px-6 py-3.5">Stock Quantity</th>
                                    <th className="px-6 py-3.5">Condition</th>
                                    <th className="px-6 py-3.5">Operational Notes</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                {filteredItems.map((item) => {
                                    const isLow = item.stock_status !== 'in_stock';

                                    return (
                                        <tr key={item.id} className="transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                                            {/* Code & Name */}
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">{item.item_code}</div>
                                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-neutral-600 capitalize dark:text-neutral-400">
                                                    {item.category.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Stock */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`text-base font-bold ${isLow ? 'text-rose-600' : 'text-neutral-900 dark:text-neutral-100'}`}
                                                    >
                                                        {item.quantity_in_stock} {item.unit}
                                                    </span>
                                                    <StockBadge status={item.stock_status} />
                                                </div>
                                                <div className="text-[11px] text-neutral-400">
                                                    Min: {item.min_threshold} {item.unit}
                                                </div>
                                            </td>

                                            {/* Condition */}
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                        item.condition_status === 'good'
                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                            : item.condition_status === 'needs_repair'
                                                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                    }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${
                                                            item.condition_status === 'good'
                                                                ? 'bg-emerald-500'
                                                                : item.condition_status === 'needs_repair'
                                                                  ? 'bg-amber-500'
                                                                  : 'bg-rose-500'
                                                        }`}
                                                    />
                                                    {item.condition_status === 'good'
                                                        ? 'Ready / Good'
                                                        : item.condition_status === 'needs_repair'
                                                          ? 'Needs Repair'
                                                          : 'Damaged'}
                                                </span>
                                            </td>

                                            {/* Notes */}
                                            <td className="max-w-xs truncate px-6 py-4 text-xs text-neutral-500">
                                                {item.notes || 'No maintenance notes recorded.'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="h-8 px-2.5 text-xs font-medium"
                                                >
                                                    <Edit2 className="mr-1.5 size-3" />
                                                    Adjust
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground p-10 text-center">
                                            No inventory items match these filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Create Item Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Add Equipment to Inventory</DialogTitle>
                        <DialogDescription>Register new life vests, ropes, or inflatables.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <FormErrors errors={createForm.errors} />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="item_code">Item Code</Label>
                                <Input
                                    id="item_code"
                                    required
                                    value={createForm.data.item_code}
                                    onChange={(e) => createForm.setData('item_code', e.target.value.toUpperCase())}
                                    placeholder="LV-ADULT-XL"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="category">Category</Label>
                                <select
                                    id="category"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.category}
                                    onChange={(e) => createForm.setData('category', e.target.value)}
                                >
                                    <option value="safety_gear">Safety Gear (Life Vests)</option>
                                    <option value="inflatables">Inflatable Modules</option>
                                    <option value="counter_supplies">Wristband Rolls / Desk</option>
                                    <option value="maintenance">Maintenance & Repair</option>
                                    <option value="first_aid">First Aid Equipment</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="name">Item Description</Label>
                            <Input
                                id="name"
                                required
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="Adult Life Vest (XL - 90-110kg)"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={createForm.data.quantity_in_stock}
                                    onChange={(e) => createForm.setData('quantity_in_stock', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="min">Min. Threshold</Label>
                                <Input
                                    id="min"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={createForm.data.min_threshold}
                                    onChange={(e) => createForm.setData('min_threshold', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="unit">Unit</Label>
                                <Input
                                    id="unit"
                                    required
                                    value={createForm.data.unit}
                                    onChange={(e) => createForm.setData('unit', e.target.value)}
                                    placeholder="pcs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="unit_cost">Unit cost (PHP, optional)</Label>
                            <Input
                                id="unit_cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value={createForm.data.unit_cost}
                                onChange={(event) => createForm.setData('unit_cost', event.target.value === '' ? '' : Number(event.target.value))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes / Inspection Comments</Label>
                            <Input
                                id="notes"
                                value={createForm.data.notes}
                                onChange={(e) => createForm.setData('notes', e.target.value)}
                                placeholder="Inspected before deployment"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-sky-600 text-white hover:bg-sky-500">
                                {createForm.processing ? 'Saving...' : 'Add Equipment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Stock Modal */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Adjust Equipment: {editingItem?.name}</DialogTitle>
                        <DialogDescription>Update on-hand count or report maintenance needs.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                        <FormErrors errors={editForm.errors} />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_min">Minimum stock</Label>
                                <Input
                                    id="edit_min"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={editForm.data.min_threshold}
                                    onChange={(event) => editForm.setData('min_threshold', Number(event.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_cost">Unit cost (PHP)</Label>
                                <Input
                                    id="edit_cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.data.unit_cost}
                                    onChange={(event) => editForm.setData('unit_cost', event.target.value === '' ? '' : Number(event.target.value))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_qty">Quantity In Stock</Label>
                                <Input
                                    id="edit_qty"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={editForm.data.quantity_in_stock}
                                    onChange={(e) => editForm.setData('quantity_in_stock', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_condition">Condition Status</Label>
                                <select
                                    id="edit_condition"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={editForm.data.condition_status}
                                    onChange={(e) => editForm.setData('condition_status', e.target.value)}
                                >
                                    <option value="good">Ready / Good Condition</option>
                                    <option value="needs_repair">Needs Repair / Patching</option>
                                    <option value="damaged">Damaged / Retired</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_notes">Maintenance Notes</Label>
                            <Input id="edit_notes" value={editForm.data.notes} onChange={(e) => editForm.setData('notes', e.target.value)} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="bg-sky-600 text-white hover:bg-sky-500">
                                {editForm.processing ? 'Saving...' : 'Save Stock'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
