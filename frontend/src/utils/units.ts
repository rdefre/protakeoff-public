
export type LinearUnit = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi';
export type AreaUnit = 'mm²' | 'cm²' | 'm²' | 'ha' | 'km²' | 'in²' | 'ft²' | 'yd²' | 'ac' | 'mi²';

export const LINEAR_UNITS: LinearUnit[] = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'];
export const AREA_UNITS: AreaUnit[] = ['mm²', 'cm²', 'm²', 'ha', 'km²', 'in²', 'ft²', 'yd²', 'ac', 'mi²'];

// Feet to target unit conversion factors
const FEET_TO_UNIT: Record<LinearUnit, number> = {
    mm: 304.8,
    cm: 30.48,
    m: 0.3048,
    km: 0.0003048,
    in: 12,
    ft: 1,
    yd: 1 / 3,
    mi: 1 / 5280
};

// Default pixelsPerFoot when no scale is set (legacy: assumes 1px = 1in)
// Legacy was: 1 pixel = 1 inch, so 12 pixels = 1 foot
const LEGACY_PIXELS_PER_FOOT = 12;

/**
 * Convert pixel distance to target linear unit using scale.
 * @param valueInPixels - Raw pixel distance measured on canvas
 * @param targetUnit - Desired output unit
 * @param pixelsPerFoot - Scale factor: how many pixels equal 1 real-world foot
 *                        Default uses legacy assumption (1px = 1in)
 */
export const convertLinear = (
    valueInPixels: number,
    targetUnit: LinearUnit,
    pixelsPerFoot: number = LEGACY_PIXELS_PER_FOOT
): number => {
    // First convert pixels to feet using scale
    const valueInFeet = valueInPixels / pixelsPerFoot;
    // Then convert feet to target unit
    return valueInFeet * FEET_TO_UNIT[targetUnit];
};

/**
 * Convert pixel area to target area unit using scale.
 * @param valueInSqPixels - Raw square pixel area measured on canvas
 * @param targetUnit - Desired output unit
 * @param pixelsPerFoot - Scale factor: how many pixels equal 1 real-world foot
 */
export const convertArea = (
    valueInSqPixels: number,
    targetUnit: AreaUnit,
    pixelsPerFoot: number = LEGACY_PIXELS_PER_FOOT
): number => {
    // Convert sq pixels to sq feet
    const sqPixelsPerSqFoot = pixelsPerFoot * pixelsPerFoot;
    const valueInSqFeet = valueInSqPixels / sqPixelsPerSqFoot;

    // Convert sq feet to target unit
    switch (targetUnit) {
        case 'mm²': return valueInSqFeet * Math.pow(304.8, 2);
        case 'cm²': return valueInSqFeet * Math.pow(30.48, 2);
        case 'm²': return valueInSqFeet * Math.pow(0.3048, 2);
        case 'km²': return valueInSqFeet * Math.pow(0.3048, 2) / 1e6;
        case 'in²': return valueInSqFeet * 144;
        case 'ft²': return valueInSqFeet;
        case 'yd²': return valueInSqFeet / 9;
        case 'mi²': return valueInSqFeet / (5280 * 5280);
        case 'ac': return valueInSqFeet / 43560;
        case 'ha': return valueInSqFeet * Math.pow(0.3048, 2) / 10000;
        default: return valueInSqFeet;
    }
};

export const formatUnitValue = (value: number, unit: string): string => {
    // Smart formatting
    if (value === 0) return `0 ${unit}`;

    // For very small numbers use more precision
    if (Math.abs(value) < 0.01) return `${value.toFixed(4)} ${unit}`;

    // For larger values, use 2 decimals
    return `${value.toFixed(2)} ${unit}`;
};

/**
 * Formats a value in feet to Architectural format:
 * e.g. 10.5 -> 10' 6"
 * e.g. 10.375 -> 10' 4 1/2"
 * e.g. 78.40625 -> 78' 4 7/8"
 */
export const formatArchitectural = (feet: number): string => {
    if (feet === 0) return `0"`;

    const sign = feet < 0 ? "-" : "";
    const absFeet = Math.abs(feet);

    const wholeFeet = Math.floor(absFeet);
    const remainderFeet = absFeet - wholeFeet;
    const inches = remainderFeet * 12;

    const wholeInches = Math.floor(inches);
    const remainderInches = inches - wholeInches;

    // Nearest 1/16th
    const sixteenths = Math.round(remainderInches * 16);

    let displayInches = wholeInches;
    let displaySixteenths = sixteenths;
    let displayFeet = wholeFeet;

    // Handle overflow (e.g. 15.9/16 -> 16/16 -> 1 inch)
    if (displaySixteenths === 16) {
        displaySixteenths = 0;
        displayInches++;
    }

    if (displayInches === 12) {
        displayInches = 0;
        displayFeet++;
    }

    let fraction = "";
    if (displaySixteenths > 0) {
        // Reduce fraction
        let num = displaySixteenths;
        let den = 16;
        while (num % 2 === 0 && den % 2 === 0) {
            num /= 2;
            den /= 2;
        }
        fraction = ` ${num}/${den}`;
    }

    // Format: F' I N/D"
    // If feet is 0, we can still show 0' if desired, or just inches. 
    // Standard notation usually keeps feet if present, or just inches if < 1ft. 
    // But consistent 0' 5" is also common. Let's do 5" if 0 feet? 
    // User screenshot shows "78' 4 7/8"". So F' I" is preferred.

    if (displayFeet === 0) {
        if (displayInches === 0 && fraction === "") return `0"`; // Should be handled by top check but good for safety
        return `${sign}${displayInches}${fraction}"`;
    }

    // 10' 0" is valid. 10' is also valid. Let's do 10' 0" to be explicit like screenshot implies precision.
    // Actually screenshot is "78' 4 7/8"". It has space between feet and inches.
    return `${sign}${displayFeet}' ${displayInches}${fraction}"`;
};
