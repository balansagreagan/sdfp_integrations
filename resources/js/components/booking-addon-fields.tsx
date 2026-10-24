import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddOnItem } from '@/types';
import { Plus, X } from 'lucide-react';

export type AddonDraft = { addon_item_id: string; name: string; quantity: string; unit: string; unit_price: string; is_included: boolean };
export const addonTotal = (rows: AddonDraft[]) =>
    rows.reduce(
        (sum, row) =>
            sum + (row.is_included || row.unit_price === '' ? 0 : Math.round(Math.round(Number(row.unit_price) * 100) * Number(row.quantity))),
        0,
    ) / 100;

export default function BookingAddonFields({
    rows,
    onChange,
    catalog,
    errors,
    prefix,
}: {
    rows: AddonDraft[];
    onChange: (rows: AddonDraft[]) => void;
    catalog: AddOnItem[];
    errors: Record<string, string | undefined>;
    prefix: string;
}) {
    const update = (index: number, values: Partial<AddonDraft>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...values } : row)));
    return (
        <section className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Food & add-ons</h3>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        onChange([...rows, { addon_item_id: '', name: '', quantity: '1', unit: 'order', unit_price: '', is_included: false }])
                    }
                >
                    <Plus className="size-4" /> Add item
                </Button>
            </div>
            <p className="text-muted-foreground text-xs">
                Add extra food separately from the package. Leave an unknown price blank to confirm later, or explicitly mark an item as included.
            </p>
            <InputError message={errors.addons} />
            {rows.map((row, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-3" data-addon-row={index}>
                    <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Label htmlFor={`${prefix}_addon_${index}`}>Item {index + 1}</Label>
                            <select
                                id={`${prefix}_addon_${index}`}
                                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                                value={row.addon_item_id}
                                onChange={(event) => {
                                    const item = catalog.find((item) => String(item.id) === event.target.value);
                                    update(
                                        index,
                                        item
                                            ? {
                                                  addon_item_id: String(item.id),
                                                  name: item.name,
                                                  unit: item.unit,
                                                  unit_price: item.price ?? '',
                                                  is_included: false,
                                              }
                                            : { addon_item_id: '', name: '', unit_price: '', is_included: false },
                                    );
                                }}
                            >
                                <option value="">Custom item</option>
                                {catalog.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                        {!item.is_active ? ' (inactive)' : ''}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors[`addons.${index}.addon_item_id`]} />
                        </div>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() => onChange(rows.filter((_, i) => i !== index))}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                    {!row.addon_item_id && (
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}_addon_name_${index}`}>Item name</Label>
                            <Input
                                id={`${prefix}_addon_name_${index}`}
                                required
                                maxLength={150}
                                value={row.name}
                                onChange={(event) => update(index, { name: event.target.value })}
                            />
                            <InputError message={errors[`addons.${index}.name`]} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}_addon_qty_${index}`}>Quantity</Label>
                            <Input
                                id={`${prefix}_addon_qty_${index}`}
                                required
                                type="number"
                                min="0.01"
                                max="10000"
                                step="0.01"
                                value={row.quantity}
                                onChange={(event) => update(index, { quantity: event.target.value })}
                            />
                            <InputError message={errors[`addons.${index}.quantity`]} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}_addon_unit_${index}`}>Unit</Label>
                            <Input
                                id={`${prefix}_addon_unit_${index}`}
                                required
                                maxLength={30}
                                value={row.unit}
                                onChange={(event) => update(index, { unit: event.target.value })}
                            />
                            <InputError message={errors[`addons.${index}.unit`]} />
                        </div>
                        <div className="col-span-2 space-y-1.5 sm:col-span-1">
                            <Label htmlFor={`${prefix}_addon_price_${index}`}>Unit price (PHP)</Label>
                            <Input
                                id={`${prefix}_addon_price_${index}`}
                                type="number"
                                min="0"
                                max="99999999.99"
                                step="0.01"
                                disabled={row.is_included}
                                value={row.is_included ? '0' : row.unit_price}
                                placeholder="To confirm"
                                onChange={(event) => update(index, { unit_price: event.target.value })}
                            />
                            <InputError message={errors[`addons.${index}.unit_price`]} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={row.is_included} onChange={(event) => update(index, { is_included: event.target.checked })} />
                        Included in package / no extra charge
                    </label>
                    {!row.is_included && row.unit_price === '' && (
                        <p className="text-xs text-amber-700">Price to confirm. The final booking total will remain pending.</p>
                    )}
                </div>
            ))}
        </section>
    );
}
