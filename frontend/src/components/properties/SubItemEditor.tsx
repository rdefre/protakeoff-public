import React, { useState } from 'react';
import { Package, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LINEAR_UNITS, AREA_UNITS } from '../../utils/units';
import { type ItemSubItem, type ItemVariable } from '../../stores/useProjectStore';
import { FormulaEditor } from './FormulaEditor';
import { evaluateFormula } from '../../utils/formulas';

// Combine all units for the dropdown
const ALL_UNITS = ['', ...LINEAR_UNITS, ...AREA_UNITS];

interface SubItemEditorProps {
    subItems: ItemSubItem[];
    variables: ItemVariable[]; // Needed for formula autocomplete
    parentQty?: number; // The calculated parent quantity (e.g., area in m², length in ft)
    onUpdate: (subItems: ItemSubItem[]) => void;
}

interface EditingState {
    [id: string]: {
        name: string;
        unit: string;
        unitPrice: number;
        quantityFormula: string;
    };
}

export const SubItemEditor: React.FC<SubItemEditorProps> = ({ subItems, variables, parentQty = 0, onUpdate }) => {
    // Helper to calculate the result of a sub-item formula
    const calculateResult = (formula: string): number | null => {
        if (!formula) return null;
        const context: { qty: number;[key: string]: number } = { qty: parentQty };
        variables.forEach(v => { context[v.name] = v.value; });
        return evaluateFormula(formula, context);
    };
    // Track which sub-items are currently being edited with their draft values
    const [editing, setEditing] = useState<EditingState>({});

    const handleAdd = () => {
        const newId = crypto.randomUUID();
        const newItem: ItemSubItem = {
            id: newId,
            name: 'New Item',
            unit: '',
            unitPrice: 0,
            quantityFormula: ''
        };
        onUpdate([...subItems, newItem]);
        // Immediately enter edit mode for the new item
        setEditing(prev => ({
            ...prev,
            [newId]: {
                name: 'New Item',
                unit: '',
                unitPrice: 0,
                quantityFormula: ''
            }
        }));
    };

    const handleEdit = (item: ItemSubItem) => {
        setEditing(prev => ({
            ...prev,
            [item.id]: {
                name: item.name,
                unit: item.unit,
                unitPrice: item.unitPrice,
                quantityFormula: item.quantityFormula
            }
        }));
    };

    const handleEditChange = (id: string, field: keyof Omit<ItemSubItem, 'id'>, value: any) => {
        setEditing(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = (id: string) => {
        const draft = editing[id];
        if (!draft) return;

        onUpdate(subItems.map(item =>
            item.id === id
                ? { ...item, ...draft }
                : item
        ));

        // Exit edit mode
        setEditing(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleDelete = (id: string) => {
        // Also remove from editing state if present
        setEditing(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        onUpdate(subItems.filter(i => i.id !== id));
    };

    const isEditing = (id: string) => id in editing;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Package size={16} /> Sub-Items
                </div>
                <Button variant="ghost" size="sm" onClick={handleAdd} className="h-6 px-2 text-xs">
                    <Plus size={14} className="mr-1" /> Add
                </Button>
            </div>

            <div className="space-y-2">
                {subItems.map(item => (
                    <div key={item.id}>
                        {isEditing(item.id) ? (
                            // Edit mode: expanded form
                            <div className="space-y-3 p-3 bg-background rounded-md border border-border">
                                {/* Row 1: Name */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Name</Label>
                                    <Input
                                        value={editing[item.id].name}
                                        onChange={(e) => handleEditChange(item.id, 'name', e.target.value)}
                                        className="h-7 text-xs"
                                        autoFocus
                                    />
                                </div>

                                {/* Row 2: Unit + Price */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Unit</Label>
                                        <Select
                                            value={editing[item.id].unit || 'none'}
                                            onValueChange={(value) => handleEditChange(item.id, 'unit', value === 'none' ? '' : value)}
                                        >
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ALL_UNITS.map((unit) => (
                                                    <SelectItem key={unit || 'none'} value={unit || 'none'} className="text-xs">
                                                        {unit || '(none)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Unit Price ($)</Label>
                                        <Input
                                            type="number"
                                            value={editing[item.id].unitPrice}
                                            onChange={(e) => handleEditChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Formula */}
                                <FormulaEditor
                                    formula={editing[item.id].quantityFormula}
                                    variables={variables}
                                    onChange={(val) => handleEditChange(item.id, 'quantityFormula', val)}
                                />

                                {/* Actions */}
                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive h-7 text-xs hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item.id);
                                        }}
                                    >
                                        <Trash2 size={12} className="mr-1" /> Delete
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSave(item.id);
                                        }}
                                    >
                                        <Check size={14} className="mr-1" /> Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View mode: 2-row compact display
                            <div className="px-2 py-2 rounded-md hover:bg-accent/50 group border border-transparent hover:border-border space-y-0.5">
                                {/* Row 1: Name + Result + Edit */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground flex-1 truncate">
                                        {item.name || 'New Item'}
                                    </span>
                                    {/* Show calculated result */}
                                    {(() => {
                                        const result = calculateResult(item.quantityFormula);
                                        if (result !== null) {
                                            return (
                                                <span className="text-xs font-medium text-primary shrink-0">
                                                    = {result.toFixed(2)}{item.unit ? ` ${item.unit}` : ''}
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                    {/* Edit button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(item);
                                        }}
                                    >
                                        <Pencil size={12} />
                                    </Button>
                                </div>
                                {/* Row 2: Price + Formula + Delete */}
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="shrink-0">
                                        ${item.unitPrice.toFixed(2)}{item.unit ? `/${item.unit}` : ''}
                                    </span>
                                    {item.quantityFormula && (
                                        <>
                                            <span className="text-muted-foreground/50">•</span>
                                            <span className="font-mono truncate flex-1" title={item.quantityFormula}>
                                                {item.quantityFormula}
                                            </span>
                                        </>
                                    )}
                                    {!item.quantityFormula && <span className="flex-1" />}
                                    {/* Delete button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 text-destructive hover:text-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item.id);
                                        }}
                                    >
                                        <Trash2 size={10} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {subItems.length === 0 && (
                <div className="text-xs text-muted-foreground text-center italic py-4 border border-dashed rounded-md">
                    No sub-items defined.
                </div>
            )}
        </div>
    );
};
