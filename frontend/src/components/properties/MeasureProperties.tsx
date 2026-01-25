import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Eye } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AREA_UNITS, LINEAR_UNITS } from '../../utils/units';
import { ColorPicker } from './ColorPicker';
import { FormulaEditor } from './FormulaEditor';
import type { ItemVariable } from '../../stores/useProjectStore';

interface MeasurePropertiesProps {
    toolType: 'area' | 'linear' | 'segment';
    getValue: (key: string, fallback?: unknown) => unknown;
    updateValue: (key: string, value: unknown) => void;
    currentQty: number;
}

export const MeasureProperties: React.FC<MeasurePropertiesProps> = ({
    toolType,
    getValue,
    updateValue,
    currentQty,
}) => {
    const availableUnits = toolType === 'area' ? AREA_UNITS : LINEAR_UNITS;

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
                    <Select
                        value={getValue('unit', '') as string}
                        onValueChange={(val) => updateValue('unit', val)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableUnits.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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

            {/* Show Label Toggle (Area only) */}
            {toolType === 'area' && (
                <div className="flex items-center justify-between">
                    <Label htmlFor="showLabel" className="flex items-center gap-2 cursor-pointer">
                        <Eye size={14} />
                        Show Label on Canvas
                    </Label>
                    <Switch
                        id="showLabel"
                        checked={getValue('showLabel', true) as boolean}
                        onCheckedChange={(checked) => updateValue('showLabel', checked)}
                    />
                </div>
            )}

            {/* Formula Editor */}
            <div className="space-y-2 pt-2">
                <FormulaEditor
                    formula={getValue('formula', '') as string}
                    variables={getValue('variables', []) as ItemVariable[]}
                    currentQty={currentQty}
                    unit={getValue('unit', '') as string}
                    onChange={(f) => updateValue('formula', f)}
                />
            </div>
        </div>
    );
};
