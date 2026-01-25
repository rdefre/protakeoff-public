import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { downloadEstimatesCSV } from '../utils/csvExport';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
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

// Import extracted components
import { useEstimateData, EstimatesHeader, createEstimateColumns, DEFAULT_COLUMN_ORDER } from './estimates';
import type { SubItem } from '../types/estimate';

export const EstimatesView: React.FC = () => {
    const currentProject = useProjectStore(state => state.currentProject);
    const setSidebarView = useProjectStore(state => state.setSidebarView);
    const setSelectedMarkupIds = useProjectStore(state => state.setSelectedMarkupIds);
    const toggleSidebar = useProjectStore(state => state.toggleSidebar);
    const sidebarCollapsed = useProjectStore(state => state.sidebarCollapsed);

    // Hide sidebar when estimates view opens
    React.useEffect(() => {
        const state = useProjectStore.getState();
        if (!state.sidebarCollapsed) {
            state.toggleSidebar();
        }
    }, []);

    const handleItemClick = (markupId: string) => {
        if (sidebarCollapsed) toggleSidebar();
        setSidebarView('properties');
        setSelectedMarkupIds([markupId]);
    };

    // Use extracted hook for data processing
    const data = useEstimateData();

    // Table State
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        type: false,
        group: false,
    });
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
    const [grouping] = useState<GroupingState>(['group']);
    const [expanded, setExpanded] = useState<ExpandedState>(true);
    const [expandedSubItems, setExpandedSubItems] = useState<Set<string>>(new Set());

    const toggleSubItems = (id: string) => {
        setExpandedSubItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    // Use extracted column definitions
    const columns = useMemo(
        () => createEstimateColumns({ expandedSubItems, toggleSubItems }),
        [expandedSubItems]
    );

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
    });

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

    const handleExport = () => {
        if (!currentProject) return;
        const visibleColumns = table.getVisibleLeafColumns().map(c => c.id);
        if (!visibleColumns.includes('group')) {
            visibleColumns.push('group');
        }
        try {
            downloadEstimatesCSV(data, visibleColumns, `${currentProject.name}_Estimates.csv`);
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    if (!currentProject) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                    <div className="text-lg mb-2">No Project Open</div>
                    <div>Open a project to view estimates.</div>
                </div>
            </div>
        );
    }

    const grandTotal = data.reduce((acc, item) => acc + item.grandTotal, 0);

    return (
        <div className="h-full flex flex-col bg-background p-6">
            {/* Header */}
            <EstimatesHeader
                projectName={currentProject.name}
                itemCount={data.length}
                grandTotal={grandTotal}
                table={table}
                onExport={handleExport}
                onMoveColumn={moveColumn}
            />

            {/* Table */}
            <div className="flex-1 overflow-auto border border-border rounded-lg">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                                {headerGroup.headers.map(header => {
                                    if (header.column.id === 'group') return null;
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className="h-10 px-3 text-xs font-semibold cursor-pointer select-none"
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
                                    No estimates available.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => {
                                // Group Header Row
                                if (row.getIsGrouped()) {
                                    return (
                                        <TableRow
                                            key={row.id}
                                            className="bg-accent/50 hover:bg-accent cursor-pointer font-semibold"
                                            onClick={row.getToggleExpandedHandler()}
                                        >
                                            <TableCell colSpan={table.getVisibleLeafColumns().filter(c => c.id !== 'group').length} className="h-10 px-3">
                                                <div className="flex items-center gap-2 text-sm">
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
                                const isSubExpanded = expandedSubItems.has(item.id);

                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            className="h-9 border-b border-border hover:bg-muted/50 cursor-pointer text-sm"
                                            onClick={() => handleItemClick(item.id)}
                                        >
                                            {row.getVisibleCells().map(cell => {
                                                if (cell.column.id === 'group') return null;
                                                return (
                                                    <TableCell key={cell.id} className="px-3 py-1" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>

                                        {/* Sub-items */}
                                        {isSubExpanded && item.subItems.map((sub: SubItem, idx: number) => (
                                            <TableRow key={`${item.id}-sub-${idx}`} className="bg-muted/30 text-xs text-muted-foreground border-b border-border/50">
                                                {row.getVisibleCells().map(cell => {
                                                    if (cell.column.id === 'group') return null;

                                                    let content: React.ReactNode = null;
                                                    if (cell.column.id === 'name') {
                                                        content = <span className="pl-6 flex items-center">↪ {sub.name}</span>;
                                                    } else if (cell.column.id === 'type') {
                                                        content = <span className="text-[10px] uppercase opacity-60">Sub-item</span>;
                                                    } else if (cell.column.id === 'quantityDisplay') {
                                                        content = `${sub.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sub.unit}`;
                                                    } else if (cell.column.id === 'unitPrice') {
                                                        content = sub.unitPrice ? `$${sub.unitPrice.toFixed(2)}` : '-';
                                                    } else if (cell.column.id === 'grandTotal') {
                                                        content = `$${sub.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                    }

                                                    return (
                                                        <TableCell key={cell.id} className="px-3 py-1" style={{ width: cell.column.getSize() }}>
                                                            {content}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default EstimatesView;
