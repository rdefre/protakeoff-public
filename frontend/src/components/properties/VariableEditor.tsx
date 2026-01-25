import React, { useState } from 'react';
import { Plus, Trash2, Atom, Pencil, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LINEAR_UNITS, AREA_UNITS } from '../../utils/units';
import { type ItemVariable } from '../../stores/useProjectStore';

// Combine all units for the dropdown
const ALL_UNITS = ['', ...LINEAR_UNITS, ...AREA_UNITS];

interface VariableEditorProps {
    variables: ItemVariable[];
    onUpdate: (variables: ItemVariable[], oldName?: string, newName?: string) => void;
}

interface EditingState {
    [id: string]: {
        name: string;
        value: number;
        unit: string;
        originalName: string;
    };
}

export const VariableEditor: React.FC<VariableEditorProps> = ({ variables, onUpdate }) => {
    // Track which variables are currently being edited with their draft values
    const [editing, setEditing] = useState<EditingState>({});

    const handleAdd = () => {
        const newId = crypto.randomUUID();
        const newVar: ItemVariable = {
            id: newId,
            name: 'New_Var',
            value: 0,
            unit: ''
        };
        onUpdate([...variables, newVar]);
        // Immediately enter edit mode for the new variable
        setEditing(prev => ({
            ...prev,
            [newId]: {
                name: 'New_Var',
                value: 0,
                unit: '',
                originalName: 'New_Var'
            }
        }));
    };

    const handleEdit = (v: ItemVariable) => {
        setEditing(prev => ({
            ...prev,
            [v.id]: {
                name: v.name,
                value: v.value,
                unit: v.unit,
                originalName: v.name
            }
        }));
    };

    const handleEditChange = (id: string, field: 'name' | 'value' | 'unit', value: string | number) => {
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

        const newVars = variables.map(v => {
            if (v.id === id) {
                return {
                    ...v,
                    name: draft.name,
                    value: draft.value,
                    unit: draft.unit
                };
            }
            return v;
        });

        // If name changed, pass old and new name for formula refactoring
        if (draft.name !== draft.originalName) {
            onUpdate(newVars, draft.originalName, draft.name);
        } else {
            onUpdate(newVars);
        }

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
        onUpdate(variables.filter(v => v.id !== id));
    };

    const isEditing = (id: string) => id in editing;

    return (
        <div className="space-y-3 border rounded-md p-3 bg-muted/20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Atom size={16} />
                    Variables
                </div>
                <Button variant="ghost" size="sm" onClick={handleAdd} className="h-6 px-2 text-xs">
                    <Plus size={14} className="mr-1" /> Add
                </Button>
            </div>

            <div className="space-y-2">
                {variables.map((v) => (
                    <div key={v.id}>
                        {isEditing(v.id) ? (
                            // Edit mode: expanded form
                            <div className="space-y-1.5 p-2 bg-background rounded-md border border-border">
                                {/* Row 1: Name */}
                                <Input
                                    value={editing[v.id].name}
                                    onChange={(e) => handleEditChange(v.id, 'name', e.target.value)}
                                    placeholder="Variable name"
                                    className="h-7 text-xs"
                                    autoFocus
                                />
                                {/* Row 2: Value + Unit + Save */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <span className="text-xs text-muted-foreground shrink-0">=</span>
                                        <Input
                                            type="number"
                                            value={editing[v.id].value}
                                            onChange={(e) => handleEditChange(v.id, 'value', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs flex-1"
                                        />
                                    </div>
                                    <Select
                                        value={editing[v.id].unit || 'none'}
                                        onValueChange={(value) => handleEditChange(v.id, 'unit', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger className="h-7 text-xs w-20 shrink-0">
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
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-7 w-7 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSave(v.id);
                                        }}
                                    >
                                        <Check size={14} />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View mode: compact single line
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 group">
                                <span className="text-xs font-medium text-foreground flex-1 truncate">
                                    {v.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {v.value}{v.unit ? ` ${v.unit}` : ''}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(v);
                                    }}
                                >
                                    <Pencil size={12} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive hover:text-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(v.id);
                                    }}
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {variables.length === 0 && (
                <div className="text-xs text-muted-foreground text-center italic py-2">
                    No custom variables defined.
                </div>
            )}
        </div>
    );
};
