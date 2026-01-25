import type { Markup } from '../stores/useProjectStore';
import { convertLinear, convertArea, formatUnitValue } from './units';

export const getMarkupValueDisplay = (markup: Markup, pixelsPerFoot: number): string => {
    const props = markup.properties as any;

    if (markup.type === 'count') {
        return `${props.count} count`;
    } else if (markup.type === 'linear' || markup.type === 'segment') {
        const val = convertLinear(props.value || 0, props.unit as any, pixelsPerFoot);
        return formatUnitValue(val, props.unit);
    } else if (markup.type === 'area') {
        const val = convertArea(Math.abs(props.value || 0), props.unit as any, pixelsPerFoot);
        let display = formatUnitValue(val, props.unit);
        if (props.deduction) display += ' (Ded)';
        return display;
    } else if (markup.type === 'note') {
        return props.text || '';
    }

    return '-';
};
