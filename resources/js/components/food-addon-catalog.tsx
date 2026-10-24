import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddOnItem } from '@/types';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function FoodAddonCatalog({ items, isAdmin }: { items: AddOnItem[]; isAdmin: boolean }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<AddOnItem | null>(null);
    const form = useForm({ code: '', name: '', unit: 'order', price: '', is_active: true as boolean, brochure_scope: 'other' });
    const edit = (item?: AddOnItem) => {
        setEditing(item ?? null);
        form.clearErrors();
        form.setData({
            code: item?.code ?? '',
            name: item?.name ?? '',
            unit: item?.unit ?? 'order',
            price: item?.price ?? '',
            is_active: item?.is_active ?? true,
            brochure_scope: item?.brochure_scope ?? 'other',
        });
        setOpen(true);
    };
    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl font-semibold">Food, services & add-ons</h2>
                    <p className="text-muted-foreground text-sm">
                        Configure food, rides, rooms and drink bundles. Brochure discounts apply only to matching categories.
                    </p>
                </div>
                {isAdmin && <Button onClick={() => edit()}>Add food / service</Button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <Card key={item.id}>
                        <CardContent className="space-y-3 p-5">
                            <div className="flex justify-between gap-2">
                                <h3 className="font-semibold">{item.name}</h3>
                                <Badge variant="secondary">{item.is_active ? 'Available' : 'Inactive'}</Badge>
                            </div>
                            <p className="text-xl font-bold">
                                {item.price === null
                                    ? 'Price to confirm'
                                    : Number(item.price).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                <span className="text-muted-foreground text-sm font-normal"> / {item.unit}</span>
                            </p>
                            {isAdmin && (
                                <Button variant="outline" size="sm" onClick={() => edit(item)}>
                                    Edit food / service
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit food / service' : 'Add food / service'}</DialogTitle>
                        <DialogDescription>A blank price stays “To confirm”. Existing bookings keep their saved food prices.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
                            if (editing) form.put(route('food-addons.update', editing.id), options);
                            else form.post(route('food-addons.store'), options);
                        }}
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="food_code">Code</Label>
                            <Input
                                id="food_code"
                                required
                                readOnly={!!editing}
                                maxLength={30}
                                value={form.data.code}
                                onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
                            />
                            <InputError message={form.errors.code} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="food_name">Item name</Label>
                            <Input
                                id="food_name"
                                required
                                maxLength={150}
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="food_unit">Unit (order, cup, bilao)</Label>
                            <Input
                                id="food_unit"
                                required
                                maxLength={30}
                                value={form.data.unit}
                                onChange={(event) => form.setData('unit', event.target.value)}
                            />
                            <InputError message={form.errors.unit} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="food_price">Price per unit (PHP)</Label>
                            <Input
                                id="food_price"
                                type="number"
                                min="0"
                                max="99999999.99"
                                step="0.01"
                                placeholder="To confirm"
                                value={form.data.price}
                                onChange={(event) => form.setData('price', event.target.value)}
                            />
                            <InputError message={form.errors.price} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="food_brochure_scope">Brochure coupon category</Label>
                            <select
                                id="food_brochure_scope"
                                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                                value={form.data.brochure_scope}
                                onChange={(event) => form.setData('brochure_scope', event.target.value)}
                            >
                                <option value="other">Not eligible</option>
                                <option value="restaurant">SOAKED restaurant — 5%</option>
                                <option value="water_rides">Water rides — 10%</option>
                                <option value="hotel">Hotel accommodation — 10%</option>
                                <option value="drink_bundle">Drink bundles — buy 1 take 1</option>
                            </select>
                            <InputError message={form.errors.brochure_scope} />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                            />
                            Available for new bookings
                        </label>
                        <InputError message={form.errors.is_active} />
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save food item'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
