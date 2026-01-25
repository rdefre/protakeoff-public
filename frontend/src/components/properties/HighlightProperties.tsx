import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from './ColorPicker';

interface HighlightPropertiesProps {
    getValue: (key: string, fallback?: unknown) => unknown;
    updateValue: (key: string, value: unknown) => void;
}

export const HighlightProperties: React.FC<HighlightPropertiesProps> = ({
    getValue,
    updateValue,
}) => {
    const alpha = getValue('alpha', 0.4) as number;

    return (
        <div className="space-y-6">
            {/* Color */}
            <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                    value={getValue('color', '#f59e0b') as string}
                    onChange={(c) => updateValue('color', c)}
                />
            </div>

            {/* Transparency */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label>Transparency</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(alpha * 100)}%</span>
                </div>
                <Slider
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={[alpha]}
                    onValueChange={(vals) => updateValue('alpha', vals[0])}
                />
            </div>
        </div>
    );
};
