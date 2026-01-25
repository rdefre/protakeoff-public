import React from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type Project, type PdfFile } from '../../stores/useProjectStore';

interface PagesListViewProps {
    currentProject: Project;
    currentPageId: string | null;
    setCurrentPageId: (pageId: string) => void;
    expandedPdfIds: Set<string>;
    togglePdfExpand: (pdfId: string) => void;
    editingId: string | null;
    editValue: string;
    setEditingId: (id: string | null) => void;
    setEditValue: (value: string) => void;
    handleStartEdit: (id: string, currentName: string, e: React.MouseEvent) => void;
    handleSaveEdit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

export const PagesListView: React.FC<PagesListViewProps> = ({
    currentProject,
    currentPageId,
    setCurrentPageId,
    expandedPdfIds,
    togglePdfExpand,
    editingId,
    editValue,
    setEditValue,
    handleStartEdit,
    handleSaveEdit,
    handleKeyDown,
}) => {
    return (
        <>
            {currentProject?.pdfs.map((pdf: PdfFile) => {
                const isExpanded = expandedPdfIds.has(pdf.id);
                const hasPdfMarkups = Object.entries(currentProject.markups).some(([pid, list]) =>
                    pid.startsWith(pdf.id + ':') && list.length > 0
                );
                const isEditing = editingId === pdf.id;

                return (
                    <React.Fragment key={pdf.id}>
                        <div className="flex items-center mb-[1px]">
                            {isEditing ? (
                                <div className="flex items-center w-full px-2 h-8 bg-background border rounded-md ring-1 ring-primary/20">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent border-none outline-none text-sm h-full"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={handleKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    className="w-full max-w-full shrink flex items-center h-8 px-2 text-sm font-semibold overflow-hidden min-w-0"
                                    onClick={() => togglePdfExpand(pdf.id)}
                                    onDoubleClick={(e) => handleStartEdit(pdf.id, pdf.name, e)}
                                    title={pdf.name}
                                >
                                    {isExpanded ? <ChevronDown size={14} className="mr-2 flex-none" /> : <ChevronRight size={14} className="mr-2 flex-none" />}
                                    <span className="truncate flex-1 text-left min-w-0">{pdf.name}</span>
                                    <span className="text-xs text-muted-foreground font-normal ml-2 flex-none whitespace-nowrap">
                                        {pdf.pageCount} pgs
                                    </span>

                                    {/* Ingestion Status */}
                                    {pdf.ingestionStatus === 'processing' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="ml-2 animate-spin text-muted-foreground">
                                                    <Loader2 size={12} />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Processing document text (Kreuzberg)...</TooltipContent>
                                        </Tooltip>
                                    )}

                                    {pdf.ingestionStatus === 'failed' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="ml-2 text-destructive">
                                                    <AlertCircle size={14} />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Text extraction failed</TooltipContent>
                                        </Tooltip>
                                    )}

                                    {hasPdfMarkups && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center justify-center ml-1 flex-none">
                                                    <div
                                                        className="rounded-full"
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            backgroundColor: '#FF2B00'
                                                        }}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">Contains takeoffs</TooltipContent>
                                        </Tooltip>
                                    )}
                                </Button>
                            )}
                        </div>

                        {isExpanded && Array.from({ length: pdf.pageCount || 1 }, (_, i) => {
                            const pageIndex = i;
                            const pageId = `${pdf.id}:${pageIndex}`;
                            const isActive = currentPageId === pageId;
                            const pageName = currentProject.pageMetadata?.[pageId]?.name || `Page ${pageIndex + 1}`;
                            const isEditingPage = editingId === pageId;
                            const hasMarkups = (currentProject.markups[pageId]?.length || 0) > 0;

                            return (
                                <div key={pageId} className="w-full">
                                    {isEditingPage ? (
                                        <div className="ml-6 mr-1 flex items-center h-8 px-2 bg-background border rounded-md ring-1 ring-primary/20 mb-[1px]">
                                            <input
                                                autoFocus
                                                className="w-full bg-transparent border-none outline-none text-xs h-full"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={handleKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    ) : (
                                        <Button
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full max-w-full shrink flex items-center h-8 pl-8 pr-2 text-xs relative group mb-[1px] overflow-hidden min-w-0",
                                                isActive && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => setCurrentPageId(pageId)}
                                            onDoubleClick={(e) => handleStartEdit(pageId, pageName, e)}
                                            title={pageName}
                                        >
                                            <span className="flex-1 text-left truncate min-w-0 basis-0">{pageName}</span>

                                            {hasMarkups && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center justify-center ml-2 flex-none">
                                                            <div
                                                                className="rounded-full"
                                                                style={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    backgroundColor: '#FF2B00'
                                                                }}
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">Has takeoffs</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </>
    );
};
