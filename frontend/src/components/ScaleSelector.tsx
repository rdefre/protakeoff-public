/**
 * ScaleSelector - Dropdown component for selecting page scale.
 * Displays architectural, engineering, and metric scales with manual calibration option.
 */

import React from 'react';
import { Ruler } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/useProjectStore';
import {
    ARCHITECTURAL_SCALES,
    ENGINEERING_SCALES,
    METRIC_SCALES,
    type PageScale,
} from '@/utils/scales';

export const ScaleSelector: React.FC = () => {
    const {
        currentPageId,
        getPageScale,
        setPageScale,
        setIsCalibrating,
        isCalibrating,
        currentProject,
        highlightScaleSelector,
        setHighlightScaleSelector,
    } = useProjectStore();

    // Don't render if no page is selected
    if (!currentPageId || !currentProject) {
        return (
            <Button variant="outline" size="sm" disabled className="gap-2">
                <Ruler className="h-4 w-4" />
                <span>No Page</span>
            </Button>
        );
    }

    const currentScale = getPageScale(currentPageId);

    const handleSelectScale = (scale: PageScale) => {
        setPageScale(currentPageId, scale);
        // Clear highlight when a scale is selected
        if (highlightScaleSelector) {
            setHighlightScaleSelector(false);
        }
    };

    const handleCalibrateClick = () => {
        setIsCalibrating(true);
        // Clear highlight when calibration starts
        if (highlightScaleSelector) {
            setHighlightScaleSelector(false);
        }
    };

    const renderScaleGroup = (label: string, scales: PageScale[]) => (
        <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
            </DropdownMenuLabel>
            {scales.map((scale) => (
                <DropdownMenuItem
                    key={scale.id}
                    onClick={() => handleSelectScale(scale)}
                    className={currentScale.id === scale.id ? 'bg-accent' : ''}
                >
                    {scale.name}
                </DropdownMenuItem>
            ))}
        </>
    );

    // Determine button variant: destructive when calibrating, highlighted when scale needed
    const getButtonVariant = () => {
        if (isCalibrating) return "destructive";
        return "outline";
    };

    // Add pulsing red ring when highlighted
    const highlightClass = highlightScaleSelector
        ? "ring-2 ring-red-500 ring-offset-2 ring-offset-background animate-pulse"
        : "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={getButtonVariant()}
                    size="sm"
                    className={`gap-2 min-w-[140px] justify-start ${highlightClass}`}
                >
                    <Ruler className="h-4 w-4" />
                    <span className="truncate">
                        {isCalibrating ? 'Calibrating...' : currentScale.name}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-56 max-h-[400px] overflow-y-auto"
            >
                {/* Manual Calibration */}
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Manual Calibration
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={handleCalibrateClick}
                    className="gap-2"
                >
                    <Ruler className="h-4 w-4" />
                    Calibrate Scale
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Architectural Scales */}
                {renderScaleGroup('Architectural', ARCHITECTURAL_SCALES)}

                <DropdownMenuSeparator />

                {/* Engineering Scales */}
                {renderScaleGroup('Engineering', ENGINEERING_SCALES)}

                <DropdownMenuSeparator />

                {/* Metric Scales */}
                {renderScaleGroup('Metric', METRIC_SCALES)}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ScaleSelector;
