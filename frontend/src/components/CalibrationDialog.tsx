
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '@/stores/useProjectStore';
import { parseDimensionInput } from '@/utils/measurement';

interface CalibrationDialogProps {
    open: boolean;
    onClose: () => void;
    pixelDistance: number;
}

type CalibrationUnit = 'ft' | 'in' | 'm' | 'cm';

export const CalibrationDialog: React.FC<CalibrationDialogProps> = ({
    open,
    onClose,
    pixelDistance,
}) => {
    const { calibratePage, currentPageId } = useProjectStore();

    // State for input
    const [unit, setUnit] = useState<CalibrationUnit>('ft');
    const [inputValue, setInputValue] = useState('');

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setInputValue('');
            setUnit('ft');
        }
    }, [open]);

    const handleConfirm = () => {
        if (!currentPageId) return;

        const parsedVal = parseDimensionInput(inputValue);

        if (parsedVal === null || parsedVal <= 0) return;

        // Auto-detect unit override if input contains feet/inch markers
        // parseDimensionInput returns "Feet" for these cases usually.
        let finalUnit = unit;
        let finalDist = parsedVal;

        if (/[ft|in|'|"]/.test(inputValue.toLowerCase())) {
            finalUnit = 'ft';
            // parsedVal is already in feet
        }

        calibratePage(currentPageId, pixelDistance, finalDist, finalUnit);
        onClose();
    };

    const isValid = parseDimensionInput(inputValue) !== null && (parseDimensionInput(inputValue) || 0) > 0;

    const units: { value: CalibrationUnit; label: string }[] = [
        { value: 'ft', label: 'Feet' },
        { value: 'in', label: 'Inches' },
        { value: 'm', label: 'Meters' },
        { value: 'cm', label: 'CM' },
    ];

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle>Calibrate Scale</DialogTitle>
                    <DialogDescription>
                        Enter the real-world length of the measured line ({pixelDistance.toFixed(1)} px).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Unit Toggle */}
                    <div className="flex justify-center gap-2">
                        {units.map((u) => (
                            <Button
                                key={u.value}
                                type="button"
                                variant={unit === u.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setUnit(u.value)}
                                className="w-16"
                            >
                                {u.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Known Distance</Label>
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={unit === 'ft' ? "e.g. 10' 6\" or 10.5" : "e.g. 10.5"}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValid) {
                                    handleConfirm();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports fractions (1/4), feet/inches (10' 6"), and decimals.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid}
                    >
                        Apply Calibration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CalibrationDialog;

