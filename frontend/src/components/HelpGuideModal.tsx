import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    MousePointer,
    Ruler,
    Activity,
    Square,
    Hash,
    StickyNote,
    Pencil,
    Highlighter,
    Keyboard,
    Move,
    ZoomIn,
    FileText,
    Settings,
    Layers,
} from 'lucide-react';

interface HelpGuideModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ShortcutItemProps {
    keys: string;
    description: string;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ keys, description }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-muted-foreground text-sm">{description}</span>
        <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{keys}</kbd>
    </div>
);

interface ToolItemProps {
    icon: React.ElementType;
    name: string;
    description: string;
    shortcut?: string;
}

const ToolItem: React.FC<ToolItemProps> = ({ icon: Icon, name, description, shortcut }) => (
    <div className="flex items-start gap-3 py-2">
        <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{name}</span>
                {shortcut && (
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{shortcut}</kbd>
                )}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
        </div>
    </div>
);

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl">ProTakeoff Help Guide</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[70vh] pr-4">
                    <div className="space-y-6">
                        {/* Getting Started */}
                        <section>
                            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Getting Started
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>1. <strong>Create a New Project</strong> - Use File → New Project or Cmd+N to start</p>
                                <p>2. <strong>Upload PDFs</strong> - Drag and drop or click to upload construction drawings</p>
                                <p>3. <strong>Set Scale</strong> - Calibrate each page for accurate measurements</p>
                                <p>4. <strong>Start Measuring</strong> - Select a tool and begin your takeoff</p>
                            </div>
                        </section>

                        <Separator />

                        {/* Tools Overview */}
                        <section>
                            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Tools Overview
                            </h3>
                            <div className="space-y-1">
                                <ToolItem
                                    icon={MousePointer}
                                    name="Select"
                                    shortcut="V"
                                    description="Select, move, and edit existing markups. Click points to edit vertices."
                                />
                                <ToolItem
                                    icon={Ruler}
                                    name="Segment"
                                    shortcut="3"
                                    description="Measure single line segments between two points."
                                />
                                <ToolItem
                                    icon={Activity}
                                    name="Linear"
                                    shortcut="2"
                                    description="Measure continuous paths with multiple connected segments."
                                />
                                <ToolItem
                                    icon={Square}
                                    name="Area"
                                    shortcut="1"
                                    description="Measure enclosed areas. Double-click to close the shape."
                                />
                                <ToolItem
                                    icon={Hash}
                                    name="Count"
                                    shortcut="4"
                                    description="Count individual items like fixtures, doors, or equipment."
                                />
                                <ToolItem
                                    icon={StickyNote}
                                    name="Note"
                                    shortcut="5"
                                    description="Add text annotations to your plans."
                                />
                                <ToolItem
                                    icon={Pencil}
                                    name="Draw"
                                    shortcut=""
                                    description="Freehand drawing for callouts and sketches."
                                />
                                <ToolItem
                                    icon={Highlighter}
                                    name="Highlight"
                                    shortcut=""
                                    description="Highlight areas for emphasis or review."
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* Keyboard Shortcuts */}
                        <section>
                            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                                <Keyboard className="h-4 w-4" />
                                Keyboard Shortcuts
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">File</h4>
                                    <ShortcutItem keys="⌘N" description="New Project" />
                                    <ShortcutItem keys="⌘O" description="Open Project" />
                                    <ShortcutItem keys="⌘S" description="Save" />
                                    <ShortcutItem keys="⌘⇧S" description="Save As" />
                                </div>

                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Edit</h4>
                                    <ShortcutItem keys="⌘Z" description="Undo" />
                                    <ShortcutItem keys="⌘⇧Z" description="Redo" />
                                    <ShortcutItem keys="⌘C" description="Copy" />
                                    <ShortcutItem keys="⌘V" description="Paste" />
                                    <ShortcutItem keys="Delete" description="Delete Selection" />
                                </div>

                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Tools</h4>
                                    <ShortcutItem keys="V" description="Select Tool" />
                                    <ShortcutItem keys="1" description="Area Tool" />
                                    <ShortcutItem keys="2" description="Linear Tool" />
                                    <ShortcutItem keys="3" description="Segment Tool" />
                                    <ShortcutItem keys="4" description="Count Tool" />
                                    <ShortcutItem keys="5" description="Note Tool" />
                                    <ShortcutItem keys="R" description="Toggle Record Mode" />
                                    <ShortcutItem keys="X" description="Cutout Mode (Area)" />
                                    <ShortcutItem keys="Esc" description="Cancel / Deselect" />
                                </div>

                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Navigation</h4>
                                    <ShortcutItem keys="Page Up" description="Previous Page" />
                                    <ShortcutItem keys="Page Down" description="Next Page" />
                                    <ShortcutItem keys="Scroll" description="Zoom In/Out" />
                                    <ShortcutItem keys="Drag" description="Pan Canvas" />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Canvas Navigation */}
                        <section>
                            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                                <Move className="h-4 w-4" />
                                Canvas Navigation
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>• <strong>Pan</strong> - Click and drag on empty canvas area</p>
                                <p>• <strong>Zoom</strong> - Mouse wheel or trackpad pinch</p>
                                <p>• <strong>Page Navigation</strong> - Use sidebar or Page Up/Down keys</p>
                            </div>
                        </section>

                        <Separator />

                        {/* Calibration */}
                        <section>
                            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                                <ZoomIn className="h-4 w-4" />
                                Scale & Calibration
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>• <strong>Preset Scales</strong> - Select from common architectural scales</p>
                                <p>• <strong>Custom Calibration</strong> - Draw a known distance and enter the real measurement</p>
                                <p>• <strong>Per-Page Scales</strong> - Each page can have its own scale setting</p>
                            </div>
                        </section>

                        <Separator />

                        {/* Markups & Measurements */}
                        <section>
                            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Markups & Measurements
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>• <strong>Edit Properties</strong> - Select a markup to view/edit in Properties panel</p>
                                <p>• <strong>Move Points</strong> - With Select tool, drag individual vertices</p>
                                <p>• <strong>Add Points</strong> - Right-click on a line to add points</p>
                                <p>• <strong>Cutouts</strong> - Create deductions in Area markups with X key</p>
                                <p>• <strong>Groups</strong> - Organize markups with custom group names</p>
                                <p>• <strong>Variables & Formulas</strong> - Add calculations to measurements</p>
                            </div>
                        </section>

                        <Separator />

                        {/* Export & Save */}
                        <section>
                            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Export & Save
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>• <strong>Project Files (.ptf)</strong> - Save complete projects with embedded PDFs</p>
                                <p>• <strong>PDF Export</strong> - Export annotated PDFs with your markups</p>
                                <p>• <strong>CSV Export</strong> - Export measurement data for spreadsheets</p>
                                <p>• <strong>Templates</strong> - Save and reuse measurement configurations</p>
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
