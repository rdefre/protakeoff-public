import type { Markup } from '../stores/useProjectStore';

export interface SubItem {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export interface EstimateItem {
    id: string;
    markup: Markup;
    color: string;
    name: string;
    type: string;
    quantity: number;
    quantityDisplay: string;
    unit: string;
    unitPrice: number;
    itemTotal: number;
    subItemsTotal: number;
    grandTotal: number;
    group: string;
    hasSubItems: boolean;
    subItems: SubItem[];
}
