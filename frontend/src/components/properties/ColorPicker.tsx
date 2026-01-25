import React from 'react';
import { cn } from "@/lib/utils";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
    return (
        <div className="grid grid-cols-5 gap-2">
            {COLORS.map(c => (
                <button
                    key={c}
                    className={cn(
                        "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                        value === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent" : "border-muted"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => onChange(c)}
                />
            ))}
        </div>
    );
};

export { COLORS };
