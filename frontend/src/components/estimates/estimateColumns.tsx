import { ChevronRight, ChevronDown } from 'lucide-react';
import type { ColumnDef } from "@tanstack/react-table";
import type { EstimateItem } from '../../types/estimate';

interface ColumnParams {
    expandedSubItems: Set<string>;
    toggleSubItems: (id: string) => void;
}

export function createEstimateColumns({ expandedSubItems, toggleSubItems }: ColumnParams): ColumnDef<EstimateItem>[] {
    return [
        {
            id: 'expand',
            header: '',
            size: 30,
            enableGrouping: false,
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original;
                if (!item.hasSubItems) return null;
                const isExpanded = expandedSubItems.has(item.id);
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSubItems(item.id); }}
                        className="p-1 hover:bg-muted rounded"
                    >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                );
            },
        },
        {
            id: 'color',
            accessorKey: 'color',
            header: 'Color',
            size: 50,
            enableGrouping: false,
            enableHiding: true,
            cell: ({ row }) => (
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: row.getValue('color') }} />
            ),
        },
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Name',
            size: 200,
            enableGrouping: false,
            enableHiding: false,
            cell: ({ row }) => (
                <span className="font-medium truncate block max-w-[180px]" title={row.getValue('name')}>
                    {row.getValue('name')}
                </span>
            ),
        },
        {
            id: 'type',
            accessorKey: 'type',
            header: 'Type',
            size: 80,
            enableGrouping: false,
            enableHiding: true,
            cell: ({ row }) => <span className="capitalize text-muted-foreground">{row.getValue('type')}</span>,
        },
        {
            id: 'quantityDisplay',
            accessorKey: 'quantityDisplay',
            header: 'Quantity',
            size: 120,
            enableGrouping: false,
            enableHiding: true,
        },
        {
            id: 'unitPrice',
            accessorKey: 'unitPrice',
            header: 'Unit Price',
            size: 100,
            enableGrouping: false,
            enableHiding: true,
            cell: ({ row }) => {
                const val = row.getValue('unitPrice') as number;
                return val ? `$${val.toFixed(2)}` : '-';
            },
        },
        {
            id: 'grandTotal',
            accessorKey: 'grandTotal',
            header: 'Total',
            size: 120,
            enableGrouping: false,
            enableHiding: true,
            aggregationFn: 'sum',
            cell: ({ row }) => {
                const val = row.getValue('grandTotal') as number;
                return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            },
            aggregatedCell: ({ getValue }) => {
                const val = getValue() as number;
                return <span className="font-bold">${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
            },
        },
        {
            id: 'group',
            accessorKey: 'group',
            header: 'Group',
            size: 120,
            enableHiding: true,
        },
    ];
}

export const DEFAULT_COLUMN_ORDER = ['color', 'expand', 'name', 'type', 'quantityDisplay', 'unitPrice', 'grandTotal', 'group'];
