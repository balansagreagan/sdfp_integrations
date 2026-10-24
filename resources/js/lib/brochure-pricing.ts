import type { AddonDraft } from '@/components/booking-addon-fields';
import type { AddOnItem, BrochureOffers, TicketType } from '@/types';

export function brochureDiscount(
    type: string | undefined,
    offers: BrochureOffers,
    rate: TicketType | undefined,
    pax: number,
    addons: AddonDraft[],
    catalog: AddOnItem[],
    packageTotal: number,
): number {
    if (!type || !offers[type] || !rate) return 0;
    const offer = offers[type];
    if (type === 'free_all_day') return rate.code === 'FREE-BROCHURE' ? packageTotal : 0;
    if (type === 'bogo_all_day') return rate.code === 'ALL-DAY' && pax >= 2 ? Number(rate.price) : 0;
    if (['day_tour', 'two_days_one_night', 'ticket_meal'].includes(offer.scope))
        return rate.category === offer.scope ? Math.round((Math.round(packageTotal * 100) * offer.percent) / 100) / 100 : 0;
    const eligible = addons.filter(
        (row) => !row.is_included && catalog.find((item) => String(item.id) === row.addon_item_id)?.brochure_scope === offer.scope,
    );
    if (type === 'bogo_drinks')
        return eligible.length === 1 && Number(eligible[0].quantity) >= 2 && Number.isInteger(Number(eligible[0].quantity))
            ? Number(eligible[0].unit_price || 0)
            : 0;
    const cents = eligible.reduce((sum, row) => sum + Math.round(Math.round(Number(row.unit_price || 0) * 100) * Number(row.quantity)), 0);
    return Math.round((cents * offer.percent) / 100) / 100;
}
