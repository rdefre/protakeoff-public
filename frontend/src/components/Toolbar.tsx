import React, { useState } from 'react';
import {
    Spline as SegmentIcon, // Replacement for Ruler (which is now Ruler) or Segment
    Waypoints as LinearIcon, // Replacement for Activity
    VectorSquare as AreaIcon, // Replacement for Square
    Hash,
    Type as NoteIcon, // Replacement for StickyNote
    Pencil,
    Highlighter,
    Save,
    FolderOpen,
    FileText,
    List,
    MousePointer,
    Ruler,
    Search,
} from 'lucide-react';


import { toast } from "sonner";
import { useProjectStore } from '../stores/useProjectStore';
import type { ToolType } from '../stores/useProjectStore';
import { ScaleSelector } from './ScaleSelector';
import { ExportDialog } from './ExportDialog';
import { SearchPanel } from './SearchPanel';
import { Button } from "@/components/ui/button"


import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'segment', icon: SegmentIcon, label: 'Segment' },
    { id: 'linear', icon: LinearIcon, label: 'Linear' },
    { id: 'area', icon: AreaIcon, label: 'Area' },
    { id: 'ruler', icon: Ruler, label: 'Ruler' },
    { id: 'count', icon: Hash, label: 'Count' },
    { id: 'note', icon: NoteIcon, label: 'Note' },
    { id: 'draw', icon: Pencil, label: 'Draw' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
];

export const Toolbar: React.FC = () => {
    const {
        currentProject,
        currentPageId,
        activeTool,
        setActiveTool,
        saveProjectAs,
        saveProjectToFile,
        projectFilePath,
        toggleLegend,
        hasLegendForPage,
        setShowWelcomeModal,
    } = useProjectStore();

    const legendActive = currentPageId ? hasLegendForPage(currentPageId) : false;

    const [showExportModal, setShowExportModal] = useState(false); // Add Export Modal State
    const [showSearch, setShowSearch] = useState(false); // Search panel state

    const handleOpenProjects = () => {
        setShowWelcomeModal(true);
    };

    const handleSaveProject = async () => {
        try {
            if (projectFilePath) {
                await saveProjectToFile();
                toast.success('Project saved!');
            } else {
                await saveProjectAs();
                toast.success('Project saved!');
            }
        } catch (error) {
            toast.error('Failed to save project');
        }
    };



    return (
        <TooltipProvider>
            <div className="flex items-center h-12 px-4 gap-2 bg-background border-b border-border">
                {/* Scale Selector - Top Left */}
                <ScaleSelector />

                <Separator orientation="vertical" className="h-6" />

                {/* Legend Toggle */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={legendActive ? "default" : "ghost"}
                            size="icon"
                            onClick={toggleLegend}
                            disabled={!currentProject}
                            className={cn("h-8 w-8", legendActive && "bg-primary text-primary-foreground")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Legend</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6" />


                {/* Export Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowExportModal(true)}
                            className="h-8 w-8"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export PDF</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-2" />

                {/* Project actions */}
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSaveProject}
                                disabled={!currentProject}
                                className="h-8 w-8"
                            >
                                <Save size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save Project</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleOpenProjects} className="h-8 w-8">
                                <FolderOpen size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Projects</TooltipContent>
                    </Tooltip>
                </div>

                {currentProject && (
                    <span className="text-sm font-semibold ml-2 text-foreground">{currentProject.name}</span>
                )}

                <Separator orientation="vertical" className="h-6 mx-2" />

                {/* Tool selection */}
                <div className="flex items-center gap-1">
                    {tools.map((tool) => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={activeTool === tool.id ? "default" : "ghost"}
                                    size="icon"
                                    onClick={() => setActiveTool(tool.id)}
                                    className={cn(
                                        "h-8 w-8",
                                        activeTool === tool.id && "bg-primary text-primary-foreground"
                                    )}
                                >
                                    <tool.icon size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tool.label}</TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Search */}
                {showSearch ? (
                    <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSearch(true)}
                                disabled={!currentProject}
                                className="h-8 w-8"
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Search (Ctrl+F)</TooltipContent>
                    </Tooltip>
                )}

                {/* Export Dialog */}
                <ExportDialog open={showExportModal} onOpenChange={setShowExportModal} />
            </div>
        </TooltipProvider>
    );
};

export default Toolbar;
