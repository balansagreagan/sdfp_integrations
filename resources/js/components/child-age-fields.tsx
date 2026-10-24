import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChildPolicy } from '@/types';

export const childQuote = (policy: ChildPolicy, age: string, regularPrice: string | number) => {
    const band = age === '' ? null : policy.bands.find((band) => Number(age) >= band.min && (band.max === null || Number(age) <= band.max));
    return {
        price: band?.percent == null ? null : Math.round((Math.round(Number(regularPrice) * 100) * band.percent) / 100) / 100,
        label: band?.label ?? 'Age to confirm',
    };
};

export default function ChildAgeFields({
    policy,
    ages,
    regularPrice,
    onChange,
    errors,
    prefix,
}: {
    policy: ChildPolicy;
    ages: string[];
    regularPrice: string | number;
    onChange: (ages: string[]) => void;
    errors: Record<string, string | undefined>;
    prefix: string;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900 dark:bg-sky-950/30">
            <div>
                <h4 className="text-sm font-semibold">SDFP child policy {policy.year}</h4>
                <p className="text-muted-foreground text-xs">{policy.summary}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                    Enter each child’s age in completed years on the visit date. Leave an unknown age blank to confirm later.
                </p>
            </div>
            <InputError message={errors.child_ages} />
            {ages.map((age, index) => {
                const quote = childQuote(policy, age, regularPrice);
                return (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}_child_age_${index}`}>Child {index + 1} age</Label>
                            <Input
                                id={`${prefix}_child_age_${index}`}
                                type="number"
                                min="0"
                                max="17"
                                step="1"
                                placeholder="To confirm"
                                value={age}
                                onChange={(event) => onChange(ages.map((current, i) => (i === index ? event.target.value : current)))}
                            />
                            <InputError message={errors[`child_ages.${index}`]} />
                        </div>
                        <p className={`pb-2 text-sm ${quote.price === null ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {quote.label}
                            {quote.price !== null && ` · ${quote.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}`}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
