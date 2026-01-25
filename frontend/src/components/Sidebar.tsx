import React from 'react';
import {
    Plus,
    PanelLeftClose,
    List,
    LayoutGrid,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { AddPagesModal } from './AddPagesModal';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateSidebar } from './TemplateSidebar';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "next-themes";

// Import extracted components
import {
    SidebarRail,
    SidebarSettings,
    ProjectsView,
    ToolsGrid,
    PagesListView,
    PagesThumbnailView,
    menuItems,
    type MenuItem,
} from './sidebar-components';

export const Sidebar: React.FC = () => {
    const {
        sidebarView,
        setSidebarView,
        sidebarCollapsed,
        toggleSidebar,
        activeTool,
        setActiveTool,
        currentProject,
        currentPageId,
        setCurrentPageId,
        selectedMarkupIds,
        preferences,
        setMeasurementSystem,
        uploadPdfs,
        setPageViewMode,
        setThumbnailSize,
        renamePdf,
        renamePage,
        setShowLicenseModal,
    } = useProjectStore();

    const { theme, setTheme } = useTheme();
    const [expandedPdfIds, setExpandedPdfIds] = React.useState<Set<string>>(new Set());
    const [sidebarWidth, setSidebarWidth] = React.useState(240);
    const [isResizing, setIsResizing] = React.useState(false);
    const minWidth = 200;
    const maxWidth = 300;

    const [showAddPagesModal, setShowAddPagesModal] = React.useState(false);

    // Inline editing state
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState('');

    // Handle resize drag
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - 56));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    React.useEffect(() => {
        useProjectStore.getState().refreshProjects();
    }, []);

    // Auto-open properties on selection
    React.useEffect(() => {
        if (selectedMarkupIds.length > 0) {
            setSidebarView('properties');
        }
    }, [selectedMarkupIds, setSidebarView]);

    React.useEffect(() => {
        if (activeTool !== 'select') {
            setSidebarView('properties');
        }
    }, [activeTool, setSidebarView]);

    // Auto-expand PDFs when project loads
    React.useEffect(() => {
        if (currentProject?.pdfs) {
            setExpandedPdfIds(prev => {
                const newSet = new Set(prev);
                currentProject.pdfs.forEach(p => newSet.add(p.id));
                return newSet;
            });
        }
    }, [currentProject?.pdfs]);

    const togglePdfExpand = (pdfId: string) => {
        const newSet = new Set(expandedPdfIds);
        if (newSet.has(pdfId)) {
            newSet.delete(pdfId);
        } else {
            newSet.add(pdfId);
        }
        setExpandedPdfIds(newSet);
    };

    const handleStartEdit = (id: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(id);
        setEditValue(currentName);
    };

    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) {
            if (editingId.includes(':')) {
                renamePage(editingId, editValue.trim());
            } else {
                renamePdf(editingId, editValue.trim());
            }
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditValue('');
        }
    };

    return (
        <TooltipProvider>
            <div className="flex h-full bg-sidebar border-r border-sidebar-border">
                {/* Rail */}
                <SidebarRail
                    sidebarView={sidebarView}
                    setSidebarView={setSidebarView}
                    sidebarCollapsed={sidebarCollapsed}
                    toggleSidebar={toggleSidebar}
                    settingsContent={
                        <SidebarSettings
                            theme={theme}
                            setTheme={setTheme}
                            measurementSystem={preferences?.measurementSystem || 'imperial'}
                            setMeasurementSystem={setMeasurementSystem}
                            onAccountClick={() => setShowLicenseModal(true)}
                        />
                    }
                />

                {/* Panel: Content */}
                {sidebarView && !sidebarCollapsed && (
                    <div
                        className="h-full flex flex-col bg-background/50 backdrop-blur-sm overflow-hidden animate-in slide-in-from-left-5 duration-200 relative"
                        style={{ width: sidebarWidth }}
                    >
                        {/* Resize Handle */}
                        <div
                            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 z-10"
                            onMouseDown={() => setIsResizing(true)}
                        />

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border h-[45px] flex-none">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {menuItems.find((i: MenuItem) => i.id === sidebarView)?.label || sidebarView}
                            </span>

                            <div className="flex items-center gap-1 ml-auto">
                                {sidebarView === 'pages' && (
                                    <>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant={preferences.pageViewMode === 'list' ? 'secondary' : 'ghost'}
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setPageViewMode('list')}
                                                >
                                                    <List size={14} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>List view</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant={preferences.pageViewMode === 'thumbnail' ? 'secondary' : 'ghost'}
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setPageViewMode('thumbnail')}
                                                >
                                                    <LayoutGrid size={14} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Thumbnail view</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setShowAddPagesModal(true)}
                                                >
                                                    <Plus size={14} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Add more pages</TooltipContent>
                                        </Tooltip>
                                    </>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground"
                                            onClick={toggleSidebar}
                                        >
                                            <PanelLeftClose size={14} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Close Sidebar</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Thumbnail Size Slider */}
                        {sidebarView === 'pages' && preferences.pageViewMode === 'thumbnail' && (
                            <div className="px-4 py-2 border-b border-sidebar-border flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Size</span>
                                <Slider
                                    value={[preferences.thumbnailSize]}
                                    onValueChange={(v) => setThumbnailSize(v[0])}
                                    min={60}
                                    max={200}
                                    step={10}
                                    className="flex-1"
                                />
                            </div>
                        )}

                        {/* ScrollArea Container */}
                        <div className="flex-1 min-h-0 relative">
                            <ScrollArea className="h-full w-full">
                                {sidebarView === 'tools' && (
                                    <ToolsGrid activeTool={activeTool} setActiveTool={setActiveTool} />
                                )}

                                {sidebarView === 'properties' && (
                                    <PropertiesPanel />
                                )}

                                {sidebarView === 'templates' && (
                                    <TemplateSidebar />
                                )}

                                {sidebarView === 'projects' && (
                                    <ProjectsView />
                                )}

                                {sidebarView === 'pages' && currentProject && (
                                    <div className="p-2 space-y-1 pb-10 overflow-hidden" style={{ maxWidth: sidebarWidth - 8 }}>
                                        {preferences.pageViewMode === 'thumbnail' ? (
                                            <PagesThumbnailView
                                                currentProject={currentProject}
                                                currentPageId={currentPageId}
                                                setCurrentPageId={setCurrentPageId}
                                                expandedPdfIds={expandedPdfIds}
                                                togglePdfExpand={togglePdfExpand}
                                                thumbnailSize={preferences.thumbnailSize}
                                            />
                                        ) : (
                                            <PagesListView
                                                currentProject={currentProject}
                                                currentPageId={currentPageId}
                                                setCurrentPageId={setCurrentPageId}
                                                expandedPdfIds={expandedPdfIds}
                                                togglePdfExpand={togglePdfExpand}
                                                editingId={editingId}
                                                editValue={editValue}
                                                setEditingId={setEditingId}
                                                setEditValue={setEditValue}
                                                handleStartEdit={handleStartEdit}
                                                handleSaveEdit={handleSaveEdit}
                                                handleKeyDown={handleKeyDown}
                                            />
                                        )}

                                        {(!currentProject?.pdfs || currentProject.pdfs.length === 0) && (
                                            <div className="text-muted-foreground text-xs text-center mt-8">
                                                No PDFs uploaded yet.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </div>

            <AddPagesModal
                open={showAddPagesModal}
                onOpenChange={setShowAddPagesModal}
                onUpload={uploadPdfs}
            />
        </TooltipProvider>
    );
};

export default Sidebar;
