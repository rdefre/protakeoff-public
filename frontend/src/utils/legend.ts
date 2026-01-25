import type { Markup } from '../stores/useProjectStore';
import { getMarkupValueDisplay } from './measurementUnits';

export interface LegendItem {
    name: string;
    color: string;
    quantity: string;
}

/**
 * Get individual legend items from markups - each markup is shown as a separate entry.
 * This shows each recorded item individually rather than aggregating by type+name.
 * 
 * @param markups - Array of markups to generate legend items from
 * @param pixelsPerFoot - Scale factor for accurate measurement calculation (default: 96)
 */
export const getIndividualLegendItems = (markups: Markup[], pixelsPerFoot: number = 96): LegendItem[] => {
    const items: LegendItem[] = [];

    markups.forEach(mk => {
        if (mk.type === 'legend' || (mk.properties as any).hidden) return;

        const name = (mk.properties as any).name || 'Unnamed';
        const color = (mk.properties as any).color || '#000000';

        if (mk.type === 'count') {
            // For count items, show the count value
            const val = (mk.properties as any).count || mk.paths.reduce((acc, p) => acc + p.length, 0);
            items.push({
                name,
                color,
                quantity: `${val} Ct`
            });
        } else if (['area', 'linear', 'segment'].includes(mk.type)) {
            // Use getMarkupValueDisplay for proper unit conversion
            const displayValue = getMarkupValueDisplay(mk, pixelsPerFoot);
            items.push({
                name,
                color,
                quantity: displayValue
            });
        }
    });

    return items;
};

/**
 * Aggregate markups by (type + name) to show totals.
 * @deprecated Use getIndividualLegendItems for showing each item separately
 */
export const getAggregatedLegendItems = (markups: Markup[], pixelsPerFoot: number = 96): LegendItem[] => {
    // Now returns individual items instead of aggregated
    return getIndividualLegendItems(markups, pixelsPerFoot);
};

// Alias for the new individual items function
export const getLegendItems = getIndividualLegendItems;

