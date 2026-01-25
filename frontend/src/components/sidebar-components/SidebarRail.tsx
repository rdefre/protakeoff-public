import React from 'react';
import {
    FolderOpen,
    FileText,
    Wrench,
    BarChart3,
    Sliders,
    Copy,
    PanelLeft,
    PanelLeftClose,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const menuItems = [
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
    { id: 'pages', icon: FileText, label: 'Pages' },
    { id: 'tools', icon: Wrench, label: 'Tools' },
    { id: 'properties', icon: Sliders, label: 'Properties' },
    { id: 'templates', icon: Copy, label: 'Templates' },
    { id: 'estimates', icon: BarChart3, label: 'Estimates' },
] as const;

export type MenuItem = typeof menuItems[number];
export type SidebarViewType = MenuItem['id'] | null;

interface SidebarRailProps {
    sidebarView: SidebarViewType;
    setSidebarView: (view: SidebarViewType) => void;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    settingsContent: React.ReactNode;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
    sidebarView,
    setSidebarView,
    sidebarCollapsed,
    toggleSidebar,
    settingsContent,
}) => {
    return (
        <div className="w-14 h-full flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border gap-2">
            {menuItems.map((item) => (
                <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (sidebarCollapsed) {
                                    toggleSidebar();
                                }
                                setSidebarView(sidebarView === item.id ? null : item.id);
                            }}
                            className={cn(
                                "h-10 w-10 rounded-md",
                                sidebarView === item.id
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/50"
                            )}
                        >
                            <item.icon size={20} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            ))}

            <div className="mt-auto pt-4 border-t border-sidebar-border w-full flex flex-col items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="text-muted-foreground h-10 w-10"
                        >
                            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        {sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    </TooltipContent>
                </Tooltip>

                {settingsContent}
            </div>
        </div>
    );
};

export { menuItems };
