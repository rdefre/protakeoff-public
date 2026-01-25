import { useMemo } from 'react';
import { useProjectStore, type ItemVariable } from '../../stores/useProjectStore';
import { convertLinear, convertArea } from '../../utils/units';
import { evaluateFormula, slugifyVariableName } from '../../utils/formulas';
import { type EstimateItem, type SubItem } from '../../types/estimate';

const resolveVariables = (vars?: ItemVariable[]): Record<string, number> => {
    if (!vars) return {};
    return vars.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
};

export function useEstimateData(): EstimateItem[] {
    const currentProject = useProjectStore(state => state.currentProject);
    const getPageScale = useProjectStore(state => state.getPageScale);

    return useMemo<EstimateItem[]>(() => {
        if (!currentProject) return [];

        const allMarkups = Object.values(currentProject.markups)
            .flat()
            .filter(m =>
                m.type !== 'legend' &&
                m.type !== 'ruler' &&
                m.type !== 'note' &&
                m.type !== 'draw' &&
                m.type !== 'highlight'
            );

        return allMarkups.map(markup => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const props = markup.properties as any;
            const pageScale = getPageScale(markup.pageId);
            const ppf = pageScale.pixelsPerFoot;

            let quantity = 0;
            let unit = props.unit || '';

            if (markup.type === 'area' && typeof props.value === 'number') {
                quantity = convertArea(Math.abs(props.value), props.unit, ppf);
            } else if ((markup.type === 'linear' || markup.type === 'segment') && typeof props.value === 'number') {
                quantity = convertLinear(props.value, props.unit, ppf);
            } else if (markup.type === 'count') {
                quantity = props.count || 0;
                unit = 'ea';
            }

            let displayQty = quantity;
            if (props.formula) {
                try {
                    const context = { ...resolveVariables(props.variables), qty: quantity, Qty: quantity };
                    const res = evaluateFormula(props.formula, context);
                    if (res !== null) displayQty = res;
                } catch { /* ignore */ }
            }

            const itemTotal = displayQty * (props.unitCost || 0);

            // Sub-items
            const subItems: SubItem[] = [];
            let subItemsTotal = 0;
            const subResultsContext: Record<string, number> = {};

            if (props.subItems && Array.isArray(props.subItems)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                props.subItems.forEach((sub: any) => {
                    let subQty = 0;
                    try {
                        const subContext = {
                            ...resolveVariables(props.variables),
                            ...subResultsContext,
                            qty: quantity,
                            Qty: quantity
                        };
                        const subRes = evaluateFormula(sub.quantityFormula, subContext);
                        if (subRes !== null) {
                            subQty = subRes;
                            subResultsContext[sub.name] = subQty;
                            const slug = slugifyVariableName(sub.name);
                            if (slug !== sub.name) {
                                subResultsContext[slug] = subQty;
                            }
                        }
                    } catch { /* ignore */ }
                    const subTotal = subQty * (sub.unitPrice || 0);
                    subItemsTotal += subTotal;
                    subItems.push({
                        name: sub.name,
                        quantity: subQty,
                        unit: sub.unit || '',
                        unitPrice: sub.unitPrice || 0,
                        total: subTotal,
                    });
                });
            }

            const grandTotal = itemTotal + subItemsTotal;
            return {
                id: markup.id,
                markup,
                color: props.color || '#000',
                name: props.name || markup.type,
                type: markup.type,
                quantity: displayQty,
                quantityDisplay: `${displayQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
                unit,
                unitPrice: props.unitCost || (grandTotal > 0 && displayQty > 0 ? grandTotal / displayQty : 0),
                itemTotal,
                subItemsTotal,
                grandTotal: grandTotal,
                group: props.group || 'Ungrouped',
                hasSubItems: subItems.length > 0,
                subItems,
            };
        });
    }, [currentProject, getPageScale]);
}
