import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from './ColorPicker';

interface DrawPropertiesProps {
    getValue: (key: string, fallback?: unknown) => unknown;
    updateValue: (key: string, value: unknown) => void;
}

export const DrawProperties: React.FC<DrawPropertiesProps> = ({
    getValue,
    updateValue,
}) => {
    const thickness = getValue('thickness', 2) as number;

    return (
        <div className="space-y-6">
            {/* Color */}
            <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                    value={getValue('color', '#000000') as string}
                    onChange={(c) => updateValue('color', c)}
                />
            </div>

            {/* Thickness */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label>Thickness</Label>
                    <span className="text-xs text-muted-foreground">{thickness}px</span>
                </div>
                <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[thickness]}
                    onValueChange={(vals) => updateValue('thickness', vals[0])}
                />
            </div>
        </div>
    );
};
