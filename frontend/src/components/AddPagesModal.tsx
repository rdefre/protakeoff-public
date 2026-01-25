import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { FileSelectionView } from './FileSelectionView';
import { Spinner } from './ui/spinner';

interface AddPagesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (files: any[]) => Promise<void>;
}

export const AddPagesModal: React.FC<AddPagesModalProps> = ({
    open,
    onOpenChange,
    onUpload
}) => {
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddFiles = async () => {
        try {
            const selected = await openFileDialog({
                multiple: true,
                filters: [{ name: 'PDF', extensions: ['pdf'] }]
            });
            if (selected) {
                const newPaths = Array.isArray(selected) ? selected : [selected];
                const unique = [...new Set([...selectedPaths, ...newPaths])];
                setSelectedPaths(unique);
            }
        } catch (err) {
            console.error('File selection error:', err);
        }
    };

    const handleRemoveFile = (pathToRemove: string) => {
        setSelectedPaths(prev => prev.filter(p => p !== pathToRemove));
    };

    const handleUpload = async () => {
        if (selectedPaths.length === 0) return;
        setIsProcessing(true);
        try {
            const mockFiles = selectedPaths.map(path => ({
                path,
                name: path.split(/[\\/]/).pop() || 'document.pdf'
            }));
            await onUpload(mockFiles);
            setSelectedPaths([]);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to upload pages:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedPaths([]);
            setIsProcessing(false);
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Pages</DialogTitle>
                    <DialogDescription>
                        Select PDF drawings to add to this project.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <FileSelectionView
                        selectedPaths={selectedPaths}
                        onAddFiles={handleAddFiles}
                        onRemoveFile={handleRemoveFile}
                    />
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => handleClose(false)} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={isProcessing || selectedPaths.length === 0}>
                        {isProcessing ? (
                            <>
                                <Spinner className="size-4 mr-2" />
                                Adding...
                            </>
                        ) : (
                            `Add ${selectedPaths.length > 0 ? selectedPaths.length : ''} Files`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
