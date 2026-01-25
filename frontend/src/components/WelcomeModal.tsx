import React, { useCallback } from 'react';
import {
    FolderOpen,
    Plus,
    Folder,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTheme } from "next-themes";

export const WelcomeModal: React.FC = () => {
    const currentProject = useProjectStore(useCallback(s => s.currentProject, []));
    const projects = useProjectStore(useCallback(s => s.projects, []));
    const refreshProjects = useProjectStore(useCallback(s => s.refreshProjects, []));
    const loadProject = useProjectStore(useCallback(s => s.loadProject, []));
    const setShowWelcomeModal = useProjectStore(useCallback(s => s.setShowWelcomeModal, []));
    const setShowNewProjectWizard = useProjectStore(useCallback(s => s.setShowNewProjectWizard, []));
    const openProjectFile = useProjectStore(useCallback(s => s.openProjectFile, []));

    const { theme } = useTheme();

    React.useEffect(() => {

        refreshProjects();
        return () => { };
    }, [refreshProjects]);

    const handleClose = () => {
        if (currentProject) {
            setShowWelcomeModal(false);
        }
    };

    const handleOpenProjectFile = async () => {
        try {
            await openProjectFile();
        } catch (err) {
            console.error('Failed to open project file:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) {
            if (diffHours === 0) return `${diffMins}m ago`;
            return `${diffHours}h ago`;
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const isDark = theme === 'dark';

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 relative">
                {currentProject && (
                    <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground z-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                )}
                {/* Logo Section (Branded Header) */}
                <div className={cn(
                    "p-8 flex flex-col items-center justify-center space-y-4 border-b border-border",
                    isDark ? "bg-sidebar" : "bg-white"
                )}>
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-[0.2em]",
                        isDark ? "text-white" : "text-black/50"
                    )}>Welcome</span>
                    <img
                        src={isDark ? "/protakeoff-white.png" : "/protakeoff.png"}
                        alt="ProTakeoff"
                        className="h-16 object-contain"
                    />
                </div>

                {/* Body Section */}
                <div className="p-6 space-y-6">
                    {/* Primary Actions */}
                    <div className="flex gap-4">
                        <Button
                            variant="default"
                            className="flex-1 h-12 gap-2 text-base font-medium shadow-sm"
                            onClick={handleOpenProjectFile}
                        >
                            <FolderOpen size={18} />
                            Open Project
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-12 gap-2 text-base font-medium border-border hover:bg-accent/50"
                            onClick={() => {

                                setShowNewProjectWizard(true);
                            }}
                        >
                            <Plus size={18} />
                            New Project
                        </Button>
                    </div>

                    {/* Recent Projects */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-semibold text-foreground/80">Recent Projects</h3>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                            <ScrollArea className="max-h-[320px]">
                                <div className="divide-y divide-border">
                                    {projects.length > 0 ? (
                                        projects.map((project) => (
                                            <button
                                                key={project.id}
                                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors group"
                                                onClick={() => { loadProject(project.id); setShowWelcomeModal(false); }}
                                            >
                                                <div className="flex-none w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    <Folder size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate">
                                                        {project.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} />
                                                        Last modified: {formatDate(project.updatedAt || project.createdAt)}
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <p className="text-sm italic">No recent projects</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
