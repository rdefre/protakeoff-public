import React from 'react';
import { Spinner } from './ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
    className?: string;
}

/**
 * Full-screen loading overlay with spinner and optional message.
 * Used for heavy async operations like project loading or PDF processing.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    message = 'Loading...',
    className
}) => {
    if (!isVisible) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
            className
        )}>
            <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border shadow-2xl">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                    {message}
                </p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
