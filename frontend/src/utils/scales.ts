/**
 * Scale definitions for construction takeoff measurements.
 * Supports Architectural (imperial), Engineering (imperial), and Metric scales.
 */

export type ScaleCategory = 'architectural' | 'engineering' | 'metric' | 'custom';

export interface PageScale {
    id: string;
    name: string;           // Display name, e.g., '1/4" = 1\'0"'
    category: ScaleCategory;
    pixelsPerFoot: number;  // Core conversion: how many pixels equal 1 real-world foot
    displayUnit: 'ft' | 'm';
}

export interface PageCalibration {
    pixelDistance: number;  // Measured pixel distance during calibration
    realDistance: number;   // User-entered real-world distance
    realUnit: 'ft' | 'm' | 'in' | 'cm'; // Unit of the entered distance
    calculatedPixelsPerFoot: number; // Derived: pixelDistance / (realDistance in feet)
}

/**
 * PDF rendering assumptions:
 * - Backend renders at 72 DPI base with 1.5x zoom (for clarity).
 * - Frontend splits render zoom vs logical coordinates.
 * - Logical Coordinate System: PDF Points (1/72 inch).
 * 
 * Scale calculation:
 * - The canvas operates in "PDF Points" but rendered at 1.5x Zoom (108 DPI).
 * - For scale "1/4" = 1'0"": 1/4 inch on paper represents 1 foot in reality.
 * - 1/4 inch = 18 PDF points (at 72 DPI).
 * - But we render at 1.5x, so 1/4 inch = 27 pixels.
 * - So 27 pixels = 1 foot.
 * - pixelsPerFoot = 27.
 * 
 * We must use the effective rendered DPI (108) for calculations.
 */
const PDF_DPI = 72;
export const RENDER_ZOOM = 1.5; // Matches the zoom level used in usePdfRenderer.ts
const EFFECTIVE_DPI = PDF_DPI * RENDER_ZOOM; // 108 pixels per inch

/**
 * Calculate pixels per foot for an architectural scale.
 * @param paperInchesPerFoot - How many paper inches represent 1 real foot
 */
const archScale = (paperInchesPerFoot: number): number => {
    return paperInchesPerFoot * EFFECTIVE_DPI;
};

/**
 * Calculate pixels per foot for an engineering scale.
 * @param feetPerInch - How many real feet are represented by 1 paper inch
 */
const engScale = (feetPerInch: number): number => {
    return EFFECTIVE_DPI / feetPerInch;
};

/**
 * Calculate pixels per foot for a metric scale.
 * @param ratio - The scale ratio (e.g., 100 for 1:100)
 */
const metricScale = (ratio: number): number => {
    // 1:100 means 1 unit on paper = 100 units in reality
    // 1 meter = 1000mm, at 1:100, 1m real = 10mm on paper
    // 10mm in inches = 10/25.4
    // pixels (points) = (10/25.4) * 72

    const mmPerMeterOnPaper = 1000 / ratio;
    const inchesPerMeterOnPaper = mmPerMeterOnPaper / 25.4;
    const pixelsPerMeter = inchesPerMeterOnPaper * EFFECTIVE_DPI;

    // Convert to feet for our standard storage unit (pixelsPerFoot)
    return pixelsPerMeter / 3.28084;
};

// ============================================================================
// ARCHITECTURAL SCALES (Imperial)
// Format: X" = 1'-0" (X inches on paper represents 1 foot in reality)
// ============================================================================
export const ARCHITECTURAL_SCALES: PageScale[] = [
    { id: 'arch-1-64', name: '1/64" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 64), displayUnit: 'ft' },
    { id: 'arch-1-32', name: '1/32" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 32), displayUnit: 'ft' },
    { id: 'arch-1-16', name: '1/16" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 16), displayUnit: 'ft' },
    { id: 'arch-3-32', name: '3/32" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(3 / 32), displayUnit: 'ft' },
    { id: 'arch-1-8', name: '1/8" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 8), displayUnit: 'ft' },
    { id: 'arch-3-16', name: '3/16" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(3 / 16), displayUnit: 'ft' },
    { id: 'arch-1-4', name: '1/4" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 4), displayUnit: 'ft' },
    { id: 'arch-3-8', name: '3/8" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(3 / 8), displayUnit: 'ft' },
    { id: 'arch-1-2', name: '1/2" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1 / 2), displayUnit: 'ft' },
    { id: 'arch-3-4', name: '3/4" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(3 / 4), displayUnit: 'ft' },
    { id: 'arch-1', name: '1" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1), displayUnit: 'ft' },
    { id: 'arch-1-1-2', name: '1-1/2" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(1.5), displayUnit: 'ft' },
    { id: 'arch-3', name: '3" = 1\'0"', category: 'architectural', pixelsPerFoot: archScale(3), displayUnit: 'ft' },
];

// ============================================================================
// ENGINEERING SCALES (Imperial)
// Format: 1" = X' (1 inch on paper represents X feet in reality)
// ============================================================================
export const ENGINEERING_SCALES: PageScale[] = [
    { id: 'eng-10', name: '1" = 10\'', category: 'engineering', pixelsPerFoot: engScale(10), displayUnit: 'ft' },
    { id: 'eng-20', name: '1" = 20\'', category: 'engineering', pixelsPerFoot: engScale(20), displayUnit: 'ft' },
    { id: 'eng-30', name: '1" = 30\'', category: 'engineering', pixelsPerFoot: engScale(30), displayUnit: 'ft' },
    { id: 'eng-40', name: '1" = 40\'', category: 'engineering', pixelsPerFoot: engScale(40), displayUnit: 'ft' },
    { id: 'eng-50', name: '1" = 50\'', category: 'engineering', pixelsPerFoot: engScale(50), displayUnit: 'ft' },
    { id: 'eng-60', name: '1" = 60\'', category: 'engineering', pixelsPerFoot: engScale(60), displayUnit: 'ft' },
    { id: 'eng-100', name: '1" = 100\'', category: 'engineering', pixelsPerFoot: engScale(100), displayUnit: 'ft' },
];

// ============================================================================
// METRIC SCALES
// Format: 1:X (1 unit on paper represents X units in reality)
// ============================================================================
export const METRIC_SCALES: PageScale[] = [
    { id: 'metric-1-10', name: '1:10', category: 'metric', pixelsPerFoot: metricScale(10), displayUnit: 'm' },
    { id: 'metric-1-20', name: '1:20', category: 'metric', pixelsPerFoot: metricScale(20), displayUnit: 'm' },
    { id: 'metric-1-25', name: '1:25', category: 'metric', pixelsPerFoot: metricScale(25), displayUnit: 'm' },
    { id: 'metric-1-50', name: '1:50', category: 'metric', pixelsPerFoot: metricScale(50), displayUnit: 'm' },
    { id: 'metric-1-75', name: '1:75', category: 'metric', pixelsPerFoot: metricScale(75), displayUnit: 'm' },
    { id: 'metric-1-100', name: '1:100', category: 'metric', pixelsPerFoot: metricScale(100), displayUnit: 'm' },
    { id: 'metric-1-125', name: '1:125', category: 'metric', pixelsPerFoot: metricScale(125), displayUnit: 'm' },
    { id: 'metric-1-150', name: '1:150', category: 'metric', pixelsPerFoot: metricScale(150), displayUnit: 'm' },
    { id: 'metric-1-200', name: '1:200', category: 'metric', pixelsPerFoot: metricScale(200), displayUnit: 'm' },
    { id: 'metric-1-250', name: '1:250', category: 'metric', pixelsPerFoot: metricScale(250), displayUnit: 'm' },
    { id: 'metric-1-500', name: '1:500', category: 'metric', pixelsPerFoot: metricScale(500), displayUnit: 'm' },
    { id: 'metric-1-1000', name: '1:1000', category: 'metric', pixelsPerFoot: metricScale(1000), displayUnit: 'm' },
];

// Combined list for easy lookup
export const ALL_SCALES: PageScale[] = [
    ...ARCHITECTURAL_SCALES,
    ...ENGINEERING_SCALES,
    ...METRIC_SCALES,
];

/**
 * Find a scale by its ID
 */
export const getScaleById = (id: string): PageScale | undefined => {
    return ALL_SCALES.find(s => s.id === id);
};

/**
 * Create a custom scale from calibration data
 */
export const createCustomScale = (calibration: PageCalibration): PageScale => {
    // Convert real distance to feet for standardization
    let realDistanceInFeet: number;
    switch (calibration.realUnit) {
        case 'in':
            realDistanceInFeet = calibration.realDistance / 12;
            break;
        case 'cm':
            realDistanceInFeet = calibration.realDistance / 30.48;
            break;
        case 'm':
            realDistanceInFeet = calibration.realDistance * 3.28084;
            break;
        case 'ft':
        default:
            realDistanceInFeet = calibration.realDistance;
    }

    const pixelsPerFoot = calibration.pixelDistance / realDistanceInFeet;

    // Determine display unit based on input unit
    const displayUnit = (calibration.realUnit === 'm' || calibration.realUnit === 'cm') ? 'm' : 'ft';

    return {
        id: 'custom',
        name: 'Custom (Calibrated)',
        category: 'custom',
        pixelsPerFoot,
        displayUnit,
    };
};

/**
 * Default scale (1/4" = 1'-0" - common architectural detail scale)
 */
export const DEFAULT_SCALE = ARCHITECTURAL_SCALES.find(s => s.id === 'arch-1-4')!;

/**
 * Convert pixel distance to real-world feet using a scale
 */
export const pixelsToFeet = (pixels: number, scale: PageScale): number => {
    return pixels / scale.pixelsPerFoot;
};

/**
 * Convert pixel distance to real-world meters using a scale
 */
export const pixelsToMeters = (pixels: number, scale: PageScale): number => {
    return pixelsToFeet(pixels, scale) / 3.28084;
};

/**
 * Convert pixel area to real-world square feet using a scale
 */
export const pixelsSqToSqFeet = (pixelsSq: number, scale: PageScale): number => {
    return pixelsSq / (scale.pixelsPerFoot * scale.pixelsPerFoot);
};

/**
 * Convert pixel area to real-world square meters using a scale
 */
export const pixelsSqToSqMeters = (pixelsSq: number, scale: PageScale): number => {
    return pixelsSqToSqFeet(pixelsSq, scale) / 10.7639;
};
