/**
 * Convert raw pixel values to display quantities with proper unit conversion.
 * Centralizes the duplicated unit conversion logic from PropertiesPanel.
 * 
 * @param value - Raw pixel value from markup
 * @param unit - Target unit (e.g., 'ft', 'm', 'ft²', 'm²')
 * @param pixelsPerFoot - Scale factor from page calibration
 * @param isCount - True if this is a count tool (returns raw count)
 * @param countValue - Raw count value for count tools
 */
export function convertDisplayQuantity(
    value: number,
    unit: string,
    pixelsPerFoot: number,
    isCount: boolean = false,
    countValue: number = 0
): number {
    // Handle count efficiently
    if (isCount) return countValue;

    let convertedVal = value;

    if (pixelsPerFoot > 0) {
        // Linear units
        if (['ft', 'in', 'm', 'mm', 'cm', 'yd', 'mi', 'km'].includes(unit)) {
            convertedVal = value / pixelsPerFoot;
            if (unit === 'in') convertedVal *= 12;
            if (unit === 'm') convertedVal *= 0.3048;
            if (unit === 'cm') convertedVal *= 30.48;
            if (unit === 'mm') convertedVal *= 304.8;
            if (unit === 'yd') convertedVal /= 3;
            if (unit === 'km') convertedVal *= 0.0003048;
            if (unit === 'mi') convertedVal /= 5280;
        }
        // Area units
        else if (['ft²', 'in²', 'm²', 'ha', 'ac', 'yd²', 'km²', 'mi²', 'mm²', 'cm²'].includes(unit)) {
            convertedVal = value / (pixelsPerFoot * pixelsPerFoot);
            if (unit === 'in²') convertedVal *= 144;
            if (unit === 'm²') convertedVal *= 0.092903;
            if (unit === 'yd²') convertedVal /= 9;
            if (unit === 'ac') convertedVal /= 43560;
            if (unit === 'ha') convertedVal *= 0.0000092903;
            if (unit === 'km²') convertedVal *= 9.2903e-8;
            if (unit === 'mi²') convertedVal /= 2.788e+7;
            if (unit === 'mm²') convertedVal *= 92903;
            if (unit === 'cm²') convertedVal *= 929.03;
        }
    }

    return convertedVal;
}
