import React, { useState } from 'react';

import { useProjectStore } from '../stores/useProjectStore';
import { Palette, MousePointer2, Save, ArrowRight, LayoutTemplate } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Property sub-components
import { MeasureProperties } from './properties/MeasureProperties';
import { CountProperties } from './properties/CountProperties';
import { NoteProperties } from './properties/NoteProperties';
import { DrawProperties } from './properties/DrawProperties';
import { HighlightProperties } from './properties/HighlightProperties';
import { VariableEditor } from './properties/VariableEditor';
import { SubItemEditor } from './properties/SubItemEditor';
import { convertDisplayQuantity } from '../utils/convertDisplayQuantity';

export const PropertiesPanel: React.FC = () => {
    const {
        activeTool,
        toolDefaults,
        selectedMarkupIds,
        currentProject,
        updateMarkup,
        updateToolDefault,
        currentPageId,
        addTemplate,
        setSidebarView,
        getPageScale,
    } = useProjectStore();

    const [newTemplateName, setNewTemplateName] = useState('');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const isEditingSelection = selectedMarkupIds.length > 0;
    const pageId = currentPageId || 'default';
    const currentMarkups = currentProject?.markups[pageId] || [];
    const selectedMarkup = isEditingSelection && currentProject
        ? currentMarkups.find(m => m.id === selectedMarkupIds[0])
        : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getValue = (key: string, fallback: any = ''): any => {
        if (isEditingSelection && selectedMarkup) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (selectedMarkup.properties as any)[key] ?? fallback;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (toolDefaults[activeTool as keyof typeof toolDefaults] as any)?.[key] ?? fallback;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateValue = (key: string, value: any) => {
        if (isEditingSelection) {
            selectedMarkupIds.forEach(id => {
                updateMarkup(id, { [key]: value });
            });
        } else {
            updateToolDefault(activeTool, { [key]: value });
        }
    };

    // Show placeholder if select tool with no selection
    if (!isEditingSelection && activeTool === 'select') {
        return (
            <div className="p-4 text-center">
                <div className="text-muted-foreground text-xs">
                    Select a markup to edit properties, or choose a tool to configure defaults.
                </div>
            </div>
        );
    }

    const currentToolType = isEditingSelection && selectedMarkup ? selectedMarkup.type : activeTool;
    const isCount = currentToolType === 'count';
    const isMeasure = ['segment', 'linear', 'area'].includes(currentToolType);
    const isNote = currentToolType === 'note';
    const isDraw = currentToolType === 'draw';
    const isHighlight = currentToolType === 'highlight';

    // Calculate current quantity for formula preview
    const getCurrentQty = (): number => {
        const val = getValue('value', 0);
        const unit = getValue('unit', '');
        const scale = getPageScale(pageId);
        return convertDisplayQuantity(
            val,
            unit,
            scale.pixelsPerFoot,
            isCount,
            getValue('count', 0)
        );
    };

    // Save Template Handler
    const handleSaveTemplate = () => {
        if (newTemplateName) {
            addTemplate({
                id: crypto.randomUUID(),
                name: newTemplateName,
                toolType: currentToolType,
                properties: {
                    color: getValue('color'),
                    unit: getValue('unit'),
                    unitCost: getValue('unitCost', 0),
                    variables: getValue('variables', []),
                    formula: getValue('formula', ''),
                    subItems: getValue('subItems', []),
                    deduction: getValue('deduction', false),
                    group: getValue('group', ''),
                }
            });
            setIsSaveDialogOpen(false);
            setNewTemplateName('');
        }
    };

    // Render the appropriate properties component based on tool type
    const renderGeneralProperties = () => {
        if (isMeasure) {
            return (
                <MeasureProperties
                    toolType={currentToolType as 'area' | 'linear' | 'segment'}
                    getValue={getValue}
                    updateValue={updateValue}
                    currentQty={getCurrentQty()}
                />
            );
        }
        if (isCount) {
            return (
                <CountProperties
                    getValue={getValue}
                    updateValue={updateValue}
                    currentQty={getCurrentQty()}
                />
            );
        }
        if (isNote) {
            return <NoteProperties getValue={getValue} updateValue={updateValue} />;
        }
        if (isDraw) {
            return <DrawProperties getValue={getValue} updateValue={updateValue} />;
        }
        if (isHighlight) {
            return <HighlightProperties getValue={getValue} updateValue={updateValue} />;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-none p-4 pb-2 border-b border-border bg-background z-10">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {isEditingSelection ? <MousePointer2 size={16} /> : <Palette size={16} />}
                    {isEditingSelection ? 'Start Properties' : `${activeTool} Defaults`}
                </div>

                {/* Template Actions */}
                {(isMeasure || isCount) && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs justify-between"
                            onClick={() => setSidebarView('templates')}
                        >
                            <span className="flex items-center gap-2">
                                <LayoutTemplate size={14} />
                                Choose Template
                            </span>
                            <ArrowRight size={14} className="text-muted-foreground" />
                        </Button>

                        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" title="Save as Template">
                                    <Save size={14} />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Save as Template</DialogTitle>
                                    <DialogDescription>
                                        Save current properties as a reusable template for {currentToolType}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 py-2">
                                    <Label>Template Name</Label>
                                    <Input
                                        placeholder="e.g. 1hr Fire Wall"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveTemplate}>Save</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="general" className="w-full">
                    <div className="px-4 pt-2 sticky top-0 bg-background z-10 border-b">
                        <TabsList className="w-full grid grid-cols-3 h-8">
                            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                            <TabsTrigger value="variables" className="text-xs">Variables</TabsTrigger>
                            <TabsTrigger value="bom" className="text-xs">BOM</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4">
                        <TabsContent value="general" className="mt-0">
                            {renderGeneralProperties()}
                        </TabsContent>

                        <TabsContent value="variables" className="mt-0 space-y-4">
                            {(isMeasure || isCount) ? (
                                <VariableEditor
                                    variables={getValue('variables', [])}
                                    onUpdate={(vars, oldName, newName) => {
                                        updateValue('variables', vars);
                                        if (oldName && newName) {
                                            let currentFormula = getValue('formula', '');
                                            const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            currentFormula = currentFormula.replace(new RegExp(`\\[${escapedOld}\\]`, 'g'), `[${newName}]`);
                                            updateValue('formula', currentFormula);
                                        }
                                    }}
                                />
                            ) : (
                                <div className="text-xs text-muted-foreground text-center py-4">
                                    Not available for this tool.
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="bom" className="mt-0 space-y-4">
                            {(isMeasure || isCount) ? (
                                <SubItemEditor
                                    subItems={getValue('subItems', [])}
                                    variables={getValue('variables', [])}
                                    parentQty={getCurrentQty()}
                                    onUpdate={(items) => updateValue('subItems', items)}
                                />
                            ) : (
                                <div className="text-xs text-muted-foreground text-center py-4">
                                    Not available for this tool.
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
};
