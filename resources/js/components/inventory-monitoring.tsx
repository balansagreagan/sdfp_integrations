import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ShoppingCart } from 'lucide-react';

export type StockStatus = 'in_stock' | 'at_minimum' | 'low_stock' | 'out_of_stock';
export type MonitoredItem = {
    id: number;
    item_code: string;
    name: string;
    quantity_in_stock: number | string;
    min_threshold: number | string;
    unit: string;
    stock_status: StockStatus;
    shortage_quantity: number;
    estimated_purchase_cost: number | null;
};

const labels: Record<StockStatus, string> = {
    in_stock: 'In stock',
    at_minimum: 'At minimum',
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
};
const quantity = (value: number | string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

export function StockBadge({ status }: { status: StockStatus }) {
    return (
        <Badge
            variant={status === 'out_of_stock' || status === 'low_stock' ? 'destructive' : 'outline'}
            className={
                status === 'in_stock'
                    ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : status === 'at_minimum'
                      ? 'border-amber-500/30 text-amber-700 dark:text-amber-400'
                      : ''
            }
        >
            {labels[status]}
        </Badge>
    );
}

export function StockFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm">
            Stock status
            <select className="bg-background rounded-md border px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="all">All stock levels</option>
                {Object.entries(labels).map(([status, label]) => (
                    <option key={status} value={status}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function InventoryMonitoring<T extends MonitoredItem>({
    items,
    onAdjust,
    filename,
}: {
    items: T[];
    onAdjust: (item: T) => void;
    filename: string;
}) {
    const purchases = items
        .filter((item) => item.shortage_quantity > 0)
        .sort((a, b) => Number(b.stock_status === 'out_of_stock') - Number(a.stock_status === 'out_of_stock') || a.name.localeCompare(b.name));
    const outOfStock = items.filter((item) => item.stock_status === 'out_of_stock').length;
    const atMinimum = items.filter((item) => item.stock_status === 'at_minimum').length;
    const unpriced = purchases.filter((item) => item.estimated_purchase_cost === null).length;
    const estimate = purchases.reduce((sum, item) => sum + (item.estimated_purchase_cost ?? 0), 0);
    const exportList = () => {
        const cell = (value: string | number) => {
            const text = String(value);
            return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
        };
        const rows = [
            ['Item code', 'Item name', 'On hand', 'Minimum', 'To purchase', 'Unit', 'Estimated cost (PHP)'],
            ...purchases.map((item) => [
                item.item_code,
                item.name,
                item.quantity_in_stock,
                item.min_threshold,
                item.shortage_quantity,
                item.unit,
                item.estimated_purchase_cost ?? 'Cost not set',
            ]),
        ];
        const url = URL.createObjectURL(
            new Blob(['\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-purchase-list.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <section aria-label="Inventory monitoring" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    [outOfStock, 'Out of stock'],
                    [purchases.length, 'Items to purchase'],
                    [atMinimum, 'Items at minimum'],
                ].map(([value, label]) => (
                    <Card key={label}>
                        <CardContent className="p-4">
                            <p className="text-muted-foreground text-sm">{label}</p>
                            <p className="mt-1 text-2xl font-semibold">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="size-5 text-sky-600" />
                            Purchase list
                        </CardTitle>
                        <CardDescription>
                            Buy enough to reach each item's minimum. Items at minimum need monitoring; quantities use each item's recorded unit.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" disabled={purchases.length === 0} onClick={exportList}>
                        <Download className="mr-2 size-4" />
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm">
                        {unpriced ? 'Known cost estimate' : 'Estimated purchase cost'}: <strong>{money(estimate)}</strong>
                        {unpriced > 0 && <span className="ml-2 text-amber-700 dark:text-amber-400">{unpriced} item(s) still need a unit cost.</span>}
                    </p>
                    {purchases.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-muted-foreground border-b text-xs">
                                    <tr>
                                        {['Item', 'Status', 'Available', 'Minimum', 'To purchase', 'Estimated cost', ''].map((label, i) => (
                                            <th key={i} className="px-3 py-3">
                                                {label || <span className="sr-only">Actions</span>}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((item) => (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="px-3 py-3">
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-muted-foreground text-xs">{item.item_code}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StockBadge status={item.stock_status} />
                                            </td>
                                            <td className="px-3 py-3">
                                                {quantity(item.quantity_in_stock)} {item.unit}
                                            </td>
                                            <td className="px-3 py-3">
                                                {quantity(item.min_threshold)} {item.unit}
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-rose-600">
                                                {quantity(item.shortage_quantity)} {item.unit}
                                            </td>
                                            <td className="px-3 py-3">
                                                {item.estimated_purchase_cost === null ? 'Cost not set' : money(item.estimated_purchase_cost)}
                                            </td>
                                            <td className="px-3 py-3">
                                                <Button size="sm" variant="outline" onClick={() => onAdjust(item)}>
                                                    Update stock
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                            No items are below their recorded minimum. Set a minimum on any unconfigured item to include it in purchase planning.
                        </p>
                    )}
                    {items.some((item) => Number(item.min_threshold) === 0) && (
                        <p className="text-muted-foreground text-xs">
                            Items with a minimum of 0 do not generate purchase quantities. Use Adjust to set their minimum.
                        </p>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
