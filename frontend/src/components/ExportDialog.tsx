import React, { useState } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { getAggregatedLegendItems } from '../utils/legend';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';
import { calculatePolygonArea, calculatePolygonCentroid } from '../utils/measurement';
import { pointInPolygon } from '../utils/geometry';
import type { Markup, Point } from '../types/store';

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onOpenChange }) => {
    const { currentProject } = useProjectStore();

    // State
    const [pageSelection, setPageSelection] = useState<'current' | 'all' | 'custom'>('current');
    const [customRange, setCustomRange] = useState('');
    const [includeAnnotations, setIncludeAnnotations] = useState(true);
    const [includeAreaLabels, setIncludeAreaLabels] = useState(true);
    const [includeLegend, setIncludeLegend] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!currentProject) return;
        setIsExporting(true);

        try {
            const outputPath = await save({
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: `${currentProject.name}_Export.pdf`
            });

            if (!outputPath) {
                setIsExporting(false);
                return;
            }

            const activePageId = useProjectStore.getState().currentPageId;
            if (!activePageId) throw new Error("No active page found");

            // currentPageId format: "pdfId:pageIdx" or "pdfId" (for page 0)
            const [activePdfId, activePageIdxStr] = activePageId.split(':');
            const activePageIdx = activePageIdxStr ? parseInt(activePageIdxStr) : 0;

            const sourcePdf = currentProject.pdfs.find(p => p.id === activePdfId);
            if (!sourcePdf) throw new Error("Source PDF not found in project");
            // Prefer local filesystem path if available (required for backend processing)
            const sourcePath = sourcePdf.path || sourcePdf.url;

            if (!sourcePdf.path && sourcePath.startsWith('blob:')) {
                throw new Error("Cannot export from memory-only PDF. Please save the project first or ensure the original file is accessible.");
            }

            let pageIndices: number[] = [];
            if (pageSelection === 'current') {
                pageIndices = [activePageIdx];
            } else if (pageSelection === 'all') {
                pageIndices = Array.from({ length: sourcePdf.pageCount }, (_, i) => i);
            } else if (pageSelection === 'custom') {
                try {
                    const parts = customRange.split(',').map(s => s.trim());
                    pageIndices = [];
                    for (const p of parts) {
                        if (p.includes('-')) {
                            const [start, end] = p.split('-').map(n => parseInt(n));
                            for (let i = start; i <= end; i++) pageIndices.push(i - 1);
                        } else {
                            pageIndices.push(parseInt(p) - 1);
                        }
                    }
                    pageIndices = pageIndices.filter(n => !isNaN(n) && n >= 0 && n < sourcePdf.pageCount);
                } catch (e) {
                    alert("Invalid range");
                    setIsExporting(false);
                    return;
                }
            }

            // Prepared markups with injected legend items
            const markupsToExport = JSON.parse(JSON.stringify(includeAnnotations ? currentProject.markups : {}));

            if (includeLegend) {
                const pixelsPerFoot = useProjectStore.getState().getPageScale(activePageId).pixelsPerFoot;

                // Iterate over all page entries in the cloned map
                Object.keys(markupsToExport).forEach(key => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pageMarkups: any[] = markupsToExport[key];
                    const legendMarkup = pageMarkups.find((m) => m.type === 'legend');

                    if (legendMarkup) {
                        // Calculate items from OTHER markups on this page
                        // Note: We need to pass the markups for this specific page to aggregation
                        const items = getAggregatedLegendItems(pageMarkups, pixelsPerFoot);

                        // Inject into properties
                        if (!legendMarkup.properties) legendMarkup.properties = {};
                        legendMarkup.properties.items = items;

                        console.log(`DEBUG: Injected ${items.length} items into legend for page ${key}`);
                    }
                });
            } else {
                // If legend disabled, filter out legend markups
                Object.keys(markupsToExport).forEach(key => {
                    markupsToExport[key] = markupsToExport[key].filter((m: { type: string }) => m.type !== 'legend');
                });
            }

            // Inject Labels if requested
            if (includeAnnotations && includeAreaLabels) {
                const store = useProjectStore.getState();
                Object.keys(markupsToExport).forEach(key => {
                    const pageMarkups: Markup[] = markupsToExport[key];
                    const scale = store.getPageScale(key);

                    pageMarkups.forEach(m => {
                        if (m.type === 'area') {
                            const holeIndices = (m.properties as any).holeIndices || [];
                            (m.properties as any).exportLabels = [];

                            m.paths.forEach((path, pathIdx) => {
                                if (holeIndices.includes(pathIdx)) return; // Skip cutouts
                                if (path.length >= 3) {
                                    const areaPx = calculatePolygonArea(path);
                                    let labelText = "";
                                    if (scale && scale.pixelsPerFoot) {
                                        const sqFt = areaPx / (scale.pixelsPerFoot * scale.pixelsPerFoot);
                                        labelText = `${sqFt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} sq ft`;
                                    } else {
                                        labelText = `${Math.round(areaPx)} px²`;
                                    }

                                    // Positioning Logic (matching useMarkupRenderer)
                                    const hasHoles = m.paths.some((h, hIdx) =>
                                        holeIndices.includes(hIdx) && h.length > 0 && pointInPolygon(h[0], path)
                                    );

                                    let pos: Point;
                                    if (hasHoles) {
                                        pos = { x: path[0].x + 15, y: path[0].y + 15 };
                                    } else {
                                        pos = calculatePolygonCentroid(path);
                                    }

                                    (m.properties as any).exportLabels.push({
                                        text: labelText,
                                        pos: pos
                                    });
                                }
                            });
                        }
                    });
                });
            }

            await invoke('export_pdf', {
                sourcePath,
                outputPath,
                pageIndices,
                markups: markupsToExport,
                legend: null, // Legacy arg is now null
                includeAreaLabels: includeAreaLabels
            });

            onOpenChange(false);
            toast.success('Export successful!');
        } catch (e) {
            console.error(e);
            toast.error('Export failed: ' + e);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export PDF</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Pages</Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <input type="radio" id="p-current" name="pages" checked={pageSelection === 'current'} onChange={() => setPageSelection('current')} />
                                <Label htmlFor="p-current">Current Page</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="radio" id="p-all" name="pages" checked={pageSelection === 'all'} onChange={() => setPageSelection('all')} />
                                <Label htmlFor="p-all">All Pages</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="radio" id="p-custom" name="pages" checked={pageSelection === 'custom'} onChange={() => setPageSelection('custom')} />
                                <Label htmlFor="p-custom">Custom Range</Label>
                                <Input
                                    className="w-32 h-8 ml-2"
                                    placeholder="e.g. 1-5, 8"
                                    disabled={pageSelection !== 'custom'}
                                    value={customRange}
                                    onChange={e => setCustomRange(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="opt-annot">Include Annotations</Label>
                        <Switch id="opt-annot" checked={includeAnnotations} onCheckedChange={setIncludeAnnotations} />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="opt-legend">Overlay Legend</Label>
                        <Switch
                            id="opt-legend"
                            checked={includeLegend}
                            onCheckedChange={setIncludeLegend}
                        />
                    </div>

                    {includeAnnotations && (
                        <div className="flex items-center justify-between">
                            <Label htmlFor="opt-area-labels">Include Area Labels</Label>
                            <Switch
                                id="opt-area-labels"
                                checked={includeAreaLabels}
                                onCheckedChange={setIncludeAreaLabels}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Export
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
