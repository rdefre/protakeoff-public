import type { EstimateItem } from '../types/estimate';

/**
 * Column definition map connecting UI column IDs to CSV output
 */
const CSV_COLUMNS = [
    { id: 'group', header: 'Group', value: (i: EstimateItem) => i.group, subValue: (_s: any, p: EstimateItem) => p.group },
    { id: 'name', header: 'Name', value: (i: EstimateItem) => i.name, subValue: (s: any) => `  ↳ ${s.name}` },
    { id: 'type', header: 'Type', value: (i: EstimateItem) => i.type, subValue: () => 'Sub-item' },
    // quantityDisplay maps to both Quantity and Unit in CSV
    { id: 'quantityDisplay', header: 'Quantity', value: (i: EstimateItem) => i.quantity, subValue: (s: any) => s.quantity },
    { id: 'quantityDisplay', header: 'Unit', value: (i: EstimateItem) => i.unit, subValue: (s: any) => s.unit },
    { id: 'unitPrice', header: 'Unit Price', value: (i: EstimateItem) => i.unitPrice, subValue: (s: any) => s.unitPrice },
    { id: 'grandTotal', header: 'Total', value: (i: EstimateItem) => i.grandTotal, subValue: (s: any) => s.total },
];

/**
 * Generates the CSV content string from EstimateItems.
 * Exported for testing.
 */
export const generateEstimatesCSVContent = (items: EstimateItem[], visibleColumnIds: string[]): string => {
    // Filter columns based on visibility
    // If visibleColumnIds is empty or not provided, we might default to all? 
    // But logically passing empty means empty. Let's assume caller provides it.
    // We treat 'name' as mandatory if list depends on UI, but code should be robust.

    const activeColumns = CSV_COLUMNS.filter(col => visibleColumnIds.includes(col.id));

    // Headers
    const headers = activeColumns.map(c => c.header);
    const rows: string[] = [];

    // Helper to escape CSV fields
    const escape = (text: string | number | undefined | null) => {
        if (text === undefined || text === null) return '';
        const str = String(text);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    items.forEach(item => {
        // Main Item Row
        const mainRow = activeColumns.map(col => escape(col.value(item)));
        rows.push(mainRow.join(','));

        // Sub-items (indented)
        if (item.hasSubItems) {
            item.subItems.forEach(sub => {
                const subRow = activeColumns.map(col => escape(col.subValue(sub, item)));
                rows.push(subRow.join(','));
            });
        }
    });

    return [headers.join(','), ...rows].join('\n');
};

/**
 * Downloads the estimates as a CSV file.
 */
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Downloads the estimates as a CSV file.
 * Key change: Supports Tauri native save dialog.
 */
export const downloadEstimatesCSV = async (
    items: EstimateItem[],
    visibleColumnIds: string[],
    fileName: string = 'estimates.csv'
) => {
    if (!items || items.length === 0) {
        alert("No estimates to export.");
        return;
    }

    const csvContent = generateEstimatesCSVContent(items, visibleColumnIds);

    // Check if running in Tauri environment (by checking for window.__TAURI_INTERNALS__ or similar, 
    // but importing plugins usually throws if not available, OR we just try-catch the native save).
    // A safer check is usually checking if we can access the Tauri API.

    try {
        // Try Tauri Native Save
        // The save dialog returns the selected path or null if canceled
        const filePath = await save({
            defaultPath: fileName,
            filters: [{
                name: 'CSV File',
                extensions: ['csv']
            }]
        });

        if (filePath) {
            await writeTextFile(filePath, csvContent);
            // Optional: Notify user success? usually dialog closing is enough
        }
    } catch (e) {
        // Fallback to Browser Download (Blob)
        // This runs if Tauri plugins are not active (e.g. pure web view) or error occurs
        console.warn("Tauri save failed, falling back to browser download:", e);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
