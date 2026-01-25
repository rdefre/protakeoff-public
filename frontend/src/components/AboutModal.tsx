import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { getVersion } from '@tauri-apps/api/app';
import { useTheme } from "next-themes";
import { Globe, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AboutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ open, onOpenChange }) => {
    const [version, setVersion] = useState<string>('');
    const { theme } = useTheme();

    useEffect(() => {
        if (open) {
            getVersion().then(setVersion).catch(console.error);
        }
    }, [open]);

    const isDark = theme === 'dark';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-border bg-card shadow-2xl [&>button]:hidden">
                <DialogTitle className="sr-only">About ProTakeoff</DialogTitle>
                <DialogDescription className="sr-only">
                    Information about ProTakeoff construction takeoff software, including version number and contact information.
                </DialogDescription>
                <div className={cn(
                    "p-8 flex flex-col items-center justify-center space-y-4 border-b border-border",
                    isDark ? "bg-sidebar" : "bg-white"
                )}>
                    <img
                        src={isDark ? "/protakeoff-white.png" : "/protakeoff.png"}
                        alt="ProTakeoff"
                        className="h-16 object-contain"
                    />
                    <div className="flex flex-col items-center space-y-1">
                        <h2 className="text-xl font-bold tracking-tight">ProTakeoff</h2>
                        <span className="text-xs text-muted-foreground font-mono">Version {version || '0.1.0'}</span>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                        High-performance construction takeoff and estimation tool designed for speed and accuracy.
                    </p>

                    <div className="space-y-3">
                        <a
                            href="https://www.protakeoff.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent transition-colors group pointer-events-auto"
                        >
                            <div className="p-2 bg-background rounded-md border border-border group-hover:border-primary/20 transition-colors">
                                <Globe size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-foreground">Website</div>
                                <div className="text-xs text-muted-foreground">www.protakeoff.org</div>
                            </div>
                        </a>

                        <a
                            href="mailto:info@protakeoff.org"
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent transition-colors group pointer-events-auto"
                        >
                            <div className="p-2 bg-background rounded-md border border-border group-hover:border-primary/20 transition-colors">
                                <Mail size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-foreground">Support</div>
                                <div className="text-xs text-muted-foreground">info@protakeoff.org</div>
                            </div>
                        </a>
                    </div>

                    <div className="pt-2 text-[10px] text-center text-muted-foreground/50 font-medium tracking-wide uppercase">
                        © {new Date().getFullYear()} ProTakeoff. All rights reserved.
                    </div>

                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors pointer-events-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
