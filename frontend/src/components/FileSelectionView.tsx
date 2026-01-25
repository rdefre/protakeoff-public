import React from 'react';
import { Plus } from 'lucide-react';
// import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface FileSelectionViewProps {
    selectedPaths: string[];
    onAddFiles: () => void;
    onRemoveFile: (path: string) => void;
    compact?: boolean;
}

export const FileSelectionView: React.FC<FileSelectionViewProps> = ({
    selectedPaths,
    onAddFiles,
    onRemoveFile,
    compact = false
}) => {
    return (
        <div className="space-y-4">
            <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={onAddFiles}
            >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="p-3 rounded-full bg-muted">
                        <Plus size={24} />
                    </div>
                    <p className="text-sm font-medium">Click to select PDF files</p>
                    <p className="text-xs">Supports multiple files</p>
                </div>
            </div>

            {selectedPaths.length > 0 && (
                <div className={cn("border border-border rounded-md overflow-hidden", compact ? "max-h-[150px]" : "max-h-[200px]")}>
                    <ScrollArea className="h-full max-h-[200px]">
                        <div className="divide-y divide-border">
                            {selectedPaths.map((path, idx) => (
                                <div key={`${path}-${idx}`} className="flex items-center justify-between p-2 text-sm hover:bg-muted/50">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="truncate" title={path}>
                                            {path.split(/[\\/]/).pop()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveFile(path);
                                        }}
                                        className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};
