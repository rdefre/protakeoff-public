import React from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildProtocolUrl } from '../../utils/platformUrl';
import { type Project, type PdfFile } from '../../stores/useProjectStore';

interface PagesThumbnailViewProps {
    currentProject: Project;
    currentPageId: string | null;
    setCurrentPageId: (pageId: string) => void;
    expandedPdfIds: Set<string>;
    togglePdfExpand: (pdfId: string) => void;
    thumbnailSize: number;
}

export const PagesThumbnailView: React.FC<PagesThumbnailViewProps> = ({
    currentProject,
    currentPageId,
    setCurrentPageId,
    expandedPdfIds,
    togglePdfExpand,
    thumbnailSize,
}) => {
    return (
        <div className="space-y-4">
            {currentProject?.pdfs.map((pdf: PdfFile) => {
                const isExpanded = expandedPdfIds.has(pdf.id);
                return (
                    <div key={pdf.id} className="space-y-2">
                        <Button
                            variant="ghost"
                            className="w-full flex items-center justify-between h-8 px-2 text-sm font-semibold"
                            onClick={() => togglePdfExpand(pdf.id)}
                        >
                            <div className="flex items-center overflow-hidden">
                                {isExpanded ? <ChevronDown size={14} className="mr-2 flex-none" /> : <ChevronRight size={14} className="mr-2 flex-none" />}
                                <span className="truncate">{pdf.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-normal ml-2 flex-none">
                                {pdf.pageCount} pgs
                            </span>

                            {/* Ingestion Status */}
                            {pdf.ingestionStatus === 'processing' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="ml-2 animate-spin text-muted-foreground flex-none">
                                            <Loader2 size={12} />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Processing document text...</TooltipContent>
                                </Tooltip>
                            )}
                            {pdf.ingestionStatus === 'failed' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="ml-2 text-destructive flex-none">
                                            <AlertCircle size={14} />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Text extraction failed</TooltipContent>
                                </Tooltip>
                            )}
                        </Button>

                        {isExpanded && (
                            <div
                                className="grid gap-2 p-1"
                                style={{
                                    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`
                                }}
                            >
                                {Array.from({ length: pdf.pageCount || 0 }, (_, i) => {
                                    const pageId = `${pdf.id}:${i}`;
                                    const isActive = currentPageId === pageId;
                                    const thumbnail = pdf.thumbnails?.[i];
                                    const pageName = currentProject.pageMetadata?.[pageId]?.name || `Page ${i + 1}`;

                                    return (
                                        <Tooltip key={pageId}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "group relative bg-muted rounded-md border-2 transition-all cursor-pointer overflow-hidden hover:border-primary/50",
                                                        isActive ? "border-primary ring-1 ring-primary/20" : "border-transparent"
                                                    )}
                                                    style={{ aspectRatio: '1.41 / 1' }}
                                                    onClick={() => setCurrentPageId(pageId)}
                                                >
                                                    <img
                                                        src={thumbnail ? `data:image/png;base64,${thumbnail}` : buildProtocolUrl(`/page/${pdf.id}/${i}.png?zoom=0.15`)}
                                                        alt={pageName}
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        decoding="async"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />

                                                    {/* Page Number Badge */}
                                                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
                                                        {i + 1}
                                                    </div>

                                                    {/* Markup indicator */}
                                                    {(currentProject.markups[pageId]?.length || 0) > 0 && (
                                                        <div className="absolute top-1 right-1">
                                                            <div
                                                                className="rounded-full shadow-sm"
                                                                style={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    backgroundColor: '#FF2B00',
                                                                    border: '1.5px solid white'
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                                {pageName}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
