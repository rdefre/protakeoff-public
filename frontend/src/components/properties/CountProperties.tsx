import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Circle as CircleIcon, Square as SquareIcon, Triangle as TriangleIcon } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { FormulaEditor } from './FormulaEditor';
import type { ItemVariable, ShapeType } from '../../stores/useProjectStore';

interface CountPropertiesProps {
    getValue: (key: string, fallback?: unknown) => unknown;
    updateValue: (key: string, value: unknown) => void;
    currentQty: number;
}

export const CountProperties: React.FC<CountPropertiesProps> = ({
    getValue,
    updateValue,
    currentQty,
}) => {
    return (
        <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
                <Label>Name</Label>
                <Input
                    value={getValue('name', '') as string}
                    onChange={(e) => updateValue('name', e.target.value)}
                    className="h-8"
                />
            </div>

            {/* Group */}
            <div className="space-y-2">
                <Label>Group</Label>
                <Input
                    value={getValue('group', '') as string}
                    onChange={(e) => updateValue('group', e.target.value)}
                    className="h-8"
                    placeholder="Ungrouped"
                />
            </div>

            {/* Unit & Price */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                        value={getValue('unit', 'ea') as string}
                        onChange={(e) => updateValue('unit', e.target.value)}
                        className="h-8"
                        placeholder="ea"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Unit Price ($)</Label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getValue('unitCost', 0) as number}
                        onChange={(e) => updateValue('unitCost', parseFloat(e.target.value))}
                        className="h-8"
                    />
                </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                    value={getValue('color', '#3b82f6') as string}
                    onChange={(c) => updateValue('color', c)}
                />
            </div>

            {/* Shape */}
            <div className="space-y-2">
                <Label>Sign / Shape</Label>
                <ButtonGroup>
                    {(['circle', 'square', 'triangle'] as ShapeType[]).map(shape => (
                        <Button
                            key={shape}
                            variant={getValue('shape') === shape ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateValue('shape', shape)}
                            className="flex-1"
                        >
                            {shape === 'circle' && <CircleIcon size={16} />}
                            {shape === 'square' && <SquareIcon size={16} />}
                            {shape === 'triangle' && <TriangleIcon size={16} />}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>

            {/* Formula Editor */}
            <div className="space-y-2 pt-2">
                <FormulaEditor
                    formula={getValue('formula', '') as string}
                    variables={getValue('variables', []) as ItemVariable[]}
                    currentQty={currentQty}
                    unit={getValue('unit', 'ea') as string}
                    onChange={(f) => updateValue('formula', f)}
                />
            </div>
        </div>
    );
};
