'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NoteTextModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
    initialText?: string;
}

export function NoteTextModal({ open, onClose, onSubmit, initialText = '' }: NoteTextModalProps) {
    const [text, setText] = useState(initialText);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open) {
            setText(initialText);
            // Focus the textarea when dialog opens
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [open, initialText]);

    const handleSubmit = () => {
        onSubmit(text);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Enter submits (without shift for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
        // Escape closes
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                    <DialogDescription>
                        Enter the text for this note annotation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="note-text">Note Text</Label>
                        <Textarea
                            ref={textareaRef}
                            id="note-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your note..."
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        Add Note
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
