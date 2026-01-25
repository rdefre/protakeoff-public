import React from 'react';
import { Download, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Table, Column } from "@tanstack/react-table";
import type { EstimateItem } from '../../types/estimate';

interface EstimatesHeaderProps {
    projectName: string;
    itemCount: number;
    grandTotal: number;
    table: Table<EstimateItem>;
    onExport: () => void;
    onMoveColumn: (columnId: string, direction: 'left' | 'right') => void;
}

export const EstimatesHeader: React.FC<EstimatesHeaderProps> = ({
    projectName,
    itemCount,
    grandTotal,
    table,
    onExport,
    onMoveColumn,
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Estimates Summary</h1>
                <p className="text-sm text-muted-foreground">
                    {projectName} • {itemCount} items •
                    <span className="font-semibold ml-1">
                        Grand Total: ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </p>
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            Columns <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {table.getAllColumns().filter((col: Column<EstimateItem>) => col.getCanHide()).map((column: Column<EstimateItem>) => (
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
                        {table.getVisibleLeafColumns().filter((col: Column<EstimateItem>) => col.id !== 'expand').map((column: Column<EstimateItem>) => (
                            <div key={column.id} className="flex items-center justify-between px-2 py-1 text-sm">
                                <span className="truncate">{typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => onMoveColumn(column.id, 'left')} className="p-1 hover:bg-accent rounded">
                                        <ArrowLeft size={12} />
                                    </button>
                                    <button onClick={() => onMoveColumn(column.id, 'right')} className="p-1 hover:bg-accent rounded">
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={onExport} variant="outline" size="sm" className="h-8 gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>
        </div>
    );
};
