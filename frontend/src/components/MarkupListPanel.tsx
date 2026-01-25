import React, { useMemo, useState } from 'react';
import { useProjectStore, type Markup, type ItemVariable } from '../stores/useProjectStore';
import { Trash2, Disc, Eye, EyeOff, ChevronDown, ChevronRight, ArrowLeft, ArrowRight, Columns, ChevronUp } from 'lucide-react';

import { getMarkupValueDisplay } from '../utils/measurementUnits';
import { cn } from "@/lib/utils";
import { evaluateFormula } from '../utils/formulas';
import { convertArea, convertLinear } from '../utils/units';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    type ColumnDef,
    type ColumnOrderState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    useReactTable,
    type SortingState,
    type VisibilityState,
    type GroupingState,
    type ExpandedState,
} from "@tanstack/react-table";

interface MarkupListPanelProps {
    height: number;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

// Processed data shape for the table
interface ProcessedMarkup {
    id: string;
    markup: Markup;
    color: string;
    name: string;
    type: string;
    quantityDisplay: string;
    quantityValue: number;
    formulaDisplay: string;
    formulaValue: number | null;
    unitPrice: number;
    totalCost: number;
    group: string;
    isHidden: boolean;
}

// Default column order
const DEFAULT_COLUMN_ORDER = ['color', 'name', 'type', 'quantityDisplay', 'formulaDisplay', 'unitPrice', 'totalCost', 'group', 'actions'];

export const MarkupListPanel: React.FC<MarkupListPanelProps> = ({ height, isCollapsed, onToggleCollapse }) => {


    // Use individual selectors to prevent unnecessary re-renders
    const currentProject = useProjectStore(state => state.currentProject);
    const deleteMarkup = useProjectStore(state => state.deleteMarkup);
    const toggleMarkupVisibility = useProjectStore(state => state.toggleMarkupVisibility);
    const currentPageId = useProjectStore(state => state.currentPageId);
    const selectedMarkupIds = useProjectStore(state => state.selectedMarkupIds);
    const setSelectedMarkupIds = useProjectStore(state => state.setSelectedMarkupIds);
    const continueRecording = useProjectStore(state => state.continueRecording);
    const recordingMarkupId = useProjectStore(state => state.recordingMarkupId);

    // Select pageMetadata directly to ensure reactivity when scale changes
    // Using getPageScale function doesn't work because its reference doesn't change when data changes
    const pageMetadata = useProjectStore(state => state.currentProject?.pageMetadata);



    // Compute derived values safely (these don't violate hooks rules)
    const pageId = currentPageId || 'default';

    // CRITICAL: Use useMemo to ensure stable array reference when no project
    const allMarkups = useMemo(() => {

        return currentProject?.markups[pageId] || [];
    }, [currentProject, pageId]);



    // Get pixelsPerFoot directly from pageMetadata to ensure reactivity
    const pixelsPerFoot = useMemo(() => {
        const scale = pageMetadata?.[pageId]?.scale;
        const ppf = scale?.pixelsPerFoot || 1; // Default to 1 if no scale set

        return ppf;
    }, [pageMetadata, pageId]);

    const resolveVariables = (vars?: ItemVariable[]): Record<string, number> => {
        if (!vars) return {};
        return vars.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
    };

    // Pre-process markup data (always run, but returns empty array if no markups)
    const data = useMemo<ProcessedMarkup[]>(() => {

        if (allMarkups.length === 0) return [];
        return allMarkups
            .filter(m => m.type !== 'legend' && m.type !== 'ruler' && m.type !== 'note' && m.type !== 'draw' && m.type !== 'highlight')
            .filter(m => m.paths.length > 0 && m.paths.some(p => p.length > 0))
            .map(m => {
                const props = m.properties as any;
                let scaleVal = 0;
                let formulaVal: number | null = null;

                if (m.type === 'area' && typeof props.value === 'number') {
                    scaleVal = convertArea(Math.abs(props.value), props.unit, pixelsPerFoot);
                } else if ((m.type === 'linear' || m.type === 'segment') && typeof props.value === 'number') {
                    scaleVal = convertLinear(props.value, props.unit, pixelsPerFoot);
                } else if (m.type === 'count') {
                    scaleVal = props.count || 0;
                }

                if (props.formula) {
                    try {
                        const context = { ...resolveVariables(props.variables), qty: scaleVal, Qty: scaleVal };
                        const result = evaluateFormula(props.formula, context);
                        if (result !== null) formulaVal = result;
                    } catch { /* ignore */ }
                }

                const quantityForCost = formulaVal !== null ? formulaVal : scaleVal;
                const unitPrice = props.unitCost || 0;
                const cost = quantityForCost * unitPrice;
                const group = props.group || 'Ungrouped';

                return {
                    id: m.id,
                    markup: m,
                    color: props.color || '#000',
                    name: props.name || m.type,
                    type: m.type,
                    quantityDisplay: getMarkupValueDisplay(m, pixelsPerFoot),
                    quantityValue: scaleVal,
                    formulaDisplay: formulaVal !== null ? formulaVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-',
                    formulaValue: formulaVal,
                    unitPrice: unitPrice,
                    totalCost: cost,
                    group: group,
                    isHidden: !!props.hidden,
                };
            });
    }, [allMarkups, pixelsPerFoot]);

    // Table State
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        type: false,
        formulaDisplay: false,
        group: false,
    });
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
    const [grouping] = useState<GroupingState>(['group']);
    const [expanded, setExpanded] = useState<ExpandedState>(true); // true means expand all by default

    // Column Definitions
    const columns = useMemo<ColumnDef<ProcessedMarkup>[]>(() => [
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
        },
        {
            id: 'quantityDisplay',
            accessorKey: 'quantityDisplay',
            header: 'Value',
            size: 100,
            enableGrouping: false,
            enableHiding: true,
        },
        {
            id: 'formulaDisplay',
            accessorKey: 'formulaDisplay',
            header: 'Formula',
            size: 100,
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
            id: 'totalCost',
            accessorKey: 'totalCost',
            header: 'Total',
            size: 100,
            enableGrouping: false,
            enableHiding: true,
            aggregationFn: 'sum',
            cell: ({ row }) => {
                const val = row.getValue('totalCost') as number;
                return val ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
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
        {
            id: 'actions',
            header: '',
            size: 80,
            enableGrouping: false,
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original;
                const m = item.markup;
                const isRecording = recordingMarkupId === m.id;
                const showRecordBtn = ['segment', 'linear', 'area', 'count', 'draw'].includes(m.type);

                return (
                    <div className="flex justify-end gap-1">
                        {showRecordBtn && (
                            <button
                                onClick={(e) => { e.stopPropagation(); continueRecording(m.id); }}
                                title="Record to this item"
                                className={cn("p-1 rounded hover:bg-muted", isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground")}
                            >
                                <Disc size={14} fill={isRecording ? "currentColor" : "none"} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleMarkupVisibility(m.id); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                        >
                            {item.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteMarkup(m.id); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                );
            },
        },
    ], [recordingMarkupId, continueRecording, toggleMarkupVisibility, deleteMarkup]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            columnOrder,
            grouping,
            expanded,
        },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        autoResetExpanded: false,
        getRowId: (row) => row.id,
    });



    // Move column left/right
    const moveColumn = (columnId: string, direction: 'left' | 'right') => {
        const currentOrder = table.getState().columnOrder;
        const idx = currentOrder.indexOf(columnId);
        if (idx === -1) return;

        const newOrder = [...currentOrder];
        if (direction === 'left' && idx > 0) {
            [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        } else if (direction === 'right' && idx < newOrder.length - 1) {
            [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        }
        setColumnOrder(newOrder);
    };

    // Early return if no project (all hooks have been called above)
    if (!currentProject) {
        return (
            <div style={{ height }} className="flex items-center justify-center bg-background border-t border-border text-muted-foreground text-sm">
                No project loaded
            </div>
        );
    }

    return (
        <div style={{ height }} className="flex flex-col bg-background border-t border-border">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">{data.length} markups</span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                    >
                        {isCollapsed ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Columns">
                                <Columns className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table.getAllColumns().filter(col => col.getCanHide()).map(column => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                >
                                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Reorder Columns</DropdownMenuLabel>
                            {table.getVisibleLeafColumns().filter(col => col.id !== 'actions').map(column => (
                                <div key={column.id} className="flex items-center justify-between px-2 py-1 text-sm">
                                    <span className="truncate">{typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => moveColumn(column.id, 'left')} className="p-1 hover:bg-accent rounded">
                                            <ArrowLeft size={12} />
                                        </button>
                                        <button onClick={() => moveColumn(column.id, 'right')} className="p-1 hover:bg-accent rounded">
                                            <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                                {headerGroup.headers.map(header => {
                                    if (header.column.id === 'group') return null;
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className="h-8 px-2 text-xs font-semibold cursor-pointer select-none"
                                            style={{ width: header.getSize() }}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                                            </div>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No markups on this page.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => {
                                // Group Header Row
                                if (row.getIsGrouped()) {
                                    return (
                                        <TableRow
                                            key={row.id}
                                            className="bg-accent/50 hover:bg-accent cursor-pointer"
                                            onClick={row.getToggleExpandedHandler()}
                                        >
                                            <TableCell colSpan={table.getVisibleLeafColumns().filter(c => c.id !== 'group').length} className="h-8 px-2 py-1">
                                                <div className="flex items-center gap-2 font-semibold text-xs">
                                                    {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    <span>{row.getValue('group')}</span>
                                                    <span className="text-muted-foreground font-normal">({row.subRows.length})</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                // Normal Data Row
                                const item = row.original;
                                const isSelected = selectedMarkupIds.includes(item.id);

                                return (
                                    <TableRow
                                        key={row.id}
                                        data-state={isSelected ? 'selected' : undefined}
                                        className={cn(
                                            "h-8 border-b border-border hover:bg-muted/50 cursor-pointer text-xs",
                                            isSelected && "bg-accent hover:bg-accent"
                                        )}
                                        onClick={() => setSelectedMarkupIds([item.id])}
                                    >
                                        {row.getVisibleCells().map(cell => {
                                            if (cell.column.id === 'group') return null;
                                            return (
                                                <TableCell key={cell.id} className="px-2 py-1" style={{ width: cell.column.getSize() }}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
};

export default MarkupListPanel;
