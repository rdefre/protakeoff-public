import React, { useCallback, useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import Toolbar from './Toolbar';
import MarkupListPanel from './MarkupListPanel';
import CanvasMap from './CanvasMap';
import EstimatesView from './EstimatesView';
import { WelcomeModal } from './WelcomeModal';
import { useProjectStore } from '../stores/useProjectStore';
import { HotkeysManager } from './HotkeysManager';
import { TemplatesView } from './TemplatesView';
import { LoadingOverlay } from './LoadingOverlay';
import { HelpGuideModal } from './HelpGuideModal';
import { NewProjectModal } from './NewProjectModal';
import { AboutModal } from './AboutModal';
import { LicenseStatusModal } from './license/LicenseStatusModal';
import { useMenuEvents } from '../utils/useMenuEvents';
import { persistenceManager } from '../utils/PersistenceManager';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Ruler } from 'lucide-react';

export const AppLayout: React.FC = () => {
    const currentProject = useProjectStore(useCallback(state => state.currentProject, []));
    const sidebarView = useProjectStore(useCallback(state => state.sidebarView, []));
    const showWelcomeModal = useProjectStore(useCallback(state => state.showWelcomeModal, []));
    const isLoadingProject = useProjectStore(useCallback(state => state.isLoadingProject, []));
    const isUploadingPdfs = useProjectStore(useCallback(state => state.isUploadingPdfs, []));
    const isSaving = useProjectStore(useCallback(state => state.isSaving, []));
    const setShowWelcomeModal = useProjectStore(useCallback(state => state.setShowWelcomeModal, []));
    const setShowNewProjectWizard = useProjectStore(useCallback(state => state.setShowNewProjectWizard, []));
    const openProjectFile = useProjectStore(useCallback(state => state.openProjectFile, []));
    const saveProjectToFile = useProjectStore(useCallback(state => state.saveProjectToFile, []));
    const saveProjectAs = useProjectStore(useCallback(state => state.saveProjectAs, []));
    const undo = useProjectStore(useCallback(state => state.undo, []));
    const redo = useProjectStore(useCallback(state => state.redo, []));
    const showLicenseModal = useProjectStore(useCallback(state => state.showLicenseModal, []));
    const setShowLicenseModal = useProjectStore(useCallback(state => state.setShowLicenseModal, []));

    // Scale Required Warning Dialog
    const showScaleRequiredWarning = useProjectStore(useCallback(state => state.showScaleRequiredWarning, []));
    const dismissScaleRequiredWarning = useProjectStore(useCallback(state => state.dismissScaleRequiredWarning, []));
    const setHighlightScaleSelector = useProjectStore(useCallback(state => state.setHighlightScaleSelector, []));

    // Help & About Modal State
    const [showHelpGuide, setShowHelpGuide] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    // Handler to highlight scale selector
    const handleHighlightScaleSelector = useCallback(() => {
        dismissScaleRequiredWarning();
        setHighlightScaleSelector(true);
        toast.info('Please select a scale from the dropdown or use custom calibration.');
    }, [dismissScaleRequiredWarning, setHighlightScaleSelector]);

    // Menu event handlers - memoized to prevent unnecessary re-renders
    const menuHandlers = useMemo(() => ({
        onNewProject: () => {
            setShowNewProjectWizard(true);
        },
        onOpen: async () => {
            await openProjectFile();
        },
        onSave: async () => {
            const saved = await saveProjectToFile();
            if (saved) {
                toast.success('Project saved!');
            }
        },
        onSaveAs: async () => {
            const saved = await saveProjectAs();
            if (saved) {
                toast.success('Project saved!');
            }
        },
        onUndo: () => {
            undo();
            toast.info('Undo');
        },
        onRedo: () => {
            redo();
            toast.info('Redo');
        },
        onShowHelp: () => setShowHelpGuide(true),
        onLicenseStatus: () => setShowLicenseModal(true),
        onAbout: () => setShowAboutModal(true),
    }), [setShowWelcomeModal, openProjectFile, saveProjectToFile, saveProjectAs, undo, redo, setShowLicenseModal]);

    // Listen for native menu events
    useMenuEvents(menuHandlers);

    // Resizing State for Bottom Panel
    const [markupHeight, setMarkupHeight] = React.useState(250);
    const [isMarkupCollapsed, setIsMarkupCollapsed] = React.useState(false);
    const [isResizingMarkup, setIsResizingMarkup] = React.useState(false);
    const minMarkupHeight = 100;
    const collapsedHeight = 44; // Height of toolbar only

    React.useEffect(() => {
        const initStorage = async () => {
            await persistenceManager.init();
        };
        initStorage();
    }, []);

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingMarkup) return;
            // If we start resizing, auto-expand
            if (isMarkupCollapsed) setIsMarkupCollapsed(false);

            const newHeight = window.innerHeight - e.clientY;
            // Limit max height to 60% of screen to prevent blocking everything
            const maxHeight = window.innerHeight * 0.6;
            setMarkupHeight(Math.max(minMarkupHeight, Math.min(newHeight, maxHeight)));
        };

        const handleMouseUp = () => {
            setIsResizingMarkup(false);
        };

        if (isResizingMarkup) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizingMarkup]);

    return (
        <div className="relative w-screen h-screen bg-muted/20 overflow-hidden text-foreground">
            <NewProjectModal />
            {(currentProject === null || showWelcomeModal) && <WelcomeModal />}
            <AboutModal open={showAboutModal} onOpenChange={setShowAboutModal} />
            <HotkeysManager /> {/* Global Hotkeys Listener */}
            <HelpGuideModal open={showHelpGuide} onOpenChange={setShowHelpGuide} />
            <LicenseStatusModal open={showLicenseModal} onOpenChange={setShowLicenseModal} />

            {/* Scale Required Warning Dialog */}
            <AlertDialog open={showScaleRequiredWarning} onOpenChange={(open) => !open && dismissScaleRequiredWarning()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Ruler className="h-5 w-5 text-primary" />
                            Page Scale Required
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You need to set a scale for this page before using measurement tools.
                            Select a preset scale or use custom calibration from the scale dropdown.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={dismissScaleRequiredWarning}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleHighlightScaleSelector}>
                            Set Scale
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Loading Overlay */}
            <LoadingOverlay
                isVisible={isLoadingProject}
                message="Loading project..."
            />
            <LoadingOverlay
                isVisible={isUploadingPdfs}
                message="Processing PDFs..."
            />
            <LoadingOverlay
                isVisible={isSaving}
                message="Saving project..."
            />

            {/* LAYER 0: Full Screen Canvas (Fixed Background) */}
            <div className="absolute inset-0 z-0">
                {currentProject ? (
                    <CanvasMap />
                ) : (
                    <div className="w-full h-full bg-muted/20" />
                )}
            </div>

            {/* LAYER 10: UI Overlay (Pass-through clicks to canvas) */}
            <div className="absolute inset-0 z-10 pointer-events-none flex">

                {/* Sidebar - Interactive */}
                <div className="flex-none pointer-events-auto border-r border-border bg-sidebar">
                    <Sidebar />
                </div>

                {/* Main Content Column */}
                <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                    {/* Toolbar - Interactive */}
                    <div className="flex-none pointer-events-auto border-b border-border bg-background">
                        <Toolbar />
                    </div>

                    {/* Middle Spacer (Allows clicks to pass through to Canvas) */}
                    <div className="flex-1 relative min-h-0">
                        {/* If specific views are active, cover the canvas opacity */}
                        {sidebarView === 'estimates' && (
                            <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
                                <EstimatesView />
                            </div>
                        )}
                        {sidebarView === 'templates' && (
                            <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
                                <TemplatesView />
                            </div>
                        )}
                        {/* If normal canvas mode, this div is empty and transparent, letting events pass to Layer 0 */}
                    </div>

                    {/* Bottom Panel (Markup List) - Interactive */}
                    {sidebarView !== 'estimates' && sidebarView !== 'templates' && (
                        <div className="flex-none pointer-events-auto bg-background relative">
                            {/* Resize Handle */}
                            <div
                                className="absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary/30 active:bg-primary/50 z-30"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizingMarkup(true);
                                }}
                            />
                            <div className="border-t border-border">
                                <MarkupListPanel
                                    height={isMarkupCollapsed ? collapsedHeight : markupHeight}
                                    isCollapsed={isMarkupCollapsed}
                                    onToggleCollapse={() => setIsMarkupCollapsed(prev => !prev)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppLayout;
