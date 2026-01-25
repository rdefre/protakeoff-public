import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from './ColorPicker';

interface NotePropertiesProps {
    getValue: (key: string, fallback?: unknown) => unknown;
    updateValue: (key: string, value: unknown) => void;
}

export const NoteProperties: React.FC<NotePropertiesProps> = ({
    getValue,
    updateValue,
}) => {
    return (
        <div className="space-y-6">
            {/* Content */}
            <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                    value={getValue('text', '') as string}
                    onChange={(e) => updateValue('text', e.target.value)}
                    className="min-h-[80px]"
                />
            </div>

            {/* Font Size */}
            <div className="space-y-2">
                <Label>Font Size</Label>
                <Input
                    type="number"
                    value={getValue('fontSize', 14) as number}
                    onChange={(e) => updateValue('fontSize', parseInt(e.target.value))}
                    className="h-8"
                />
            </div>

            {/* Color */}
            <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                    value={getValue('color', '#000000') as string}
                    onChange={(c) => updateValue('color', c)}
                />
            </div>
        </div>
    );
};
