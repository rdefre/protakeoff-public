import React from 'react';
import {
    MousePointer,
    Ruler,
    Move,
    Square,
    Hash,
    StickyNote,
    Pencil,
    Highlighter,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ToolType } from '../../stores/useProjectStore';

const toolItems: { id: ToolType; icon: React.ElementType; label: string; group: 'select' | 'measure' | 'annotate' }[] = [
    { id: 'select', icon: MousePointer, label: 'Select', group: 'select' },
    { id: 'segment', icon: Ruler, label: 'Segment', group: 'measure' },
    { id: 'linear', icon: Move, label: 'Linear', group: 'measure' },
    { id: 'area', icon: Square, label: 'Area', group: 'measure' },
    { id: 'count', icon: Hash, label: 'Count', group: 'measure' },
    { id: 'note', icon: StickyNote, label: 'Note', group: 'annotate' },
    { id: 'draw', icon: Pencil, label: 'Draw', group: 'annotate' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight', group: 'annotate' },
];

interface ToolsGridProps {
    activeTool: ToolType;
    setActiveTool: (tool: ToolType) => void;
}

export const ToolsGrid: React.FC<ToolsGridProps> = ({ activeTool, setActiveTool }) => {
    return (
        <div className="p-2 grid grid-cols-4 gap-1">
            {toolItems.map((tool) => (
                <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                        <Button
                            variant={activeTool === tool.id ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setActiveTool(tool.id)}
                            className={cn(
                                "h-10 w-10 rounded-md",
                                activeTool === tool.id && "bg-primary text-primary-foreground"
                            )}
                        >
                            <tool.icon size={18} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {tool.label}
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
};
