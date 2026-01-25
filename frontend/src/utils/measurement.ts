import type { Point, ToolType, Markup } from '../stores/useProjectStore';

/**
 * Parses a construction dimension string into a decimal number (in feet).
 * Supports:
 * - Decimals: "10.5" -> 10.5
 * - Fractions: "1/4" -> 0.25
 * - Feet & Inches: "10' 6\"", "10ft 6in", "10-6" -> 10.5
 * - Complex formats: "10' - 1/4\"", "10' 1/4\""
 * Returns null if invalid.
 */
export const parseDimensionInput = (input: string): number | null => {
    if (!input || !input.trim()) return null;
    const str = input.trim().toLowerCase();

    const parseFraction = (s: string): number => {
        if (s.includes('/')) {
            const parts = s.split('/').map(p => parseFloat(p));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
                return parts[0] / parts[1];
            }
        }
        return parseFloat(s);
    };

    const parseNumeric = (s: string): number => {
        s = s.trim();
        // Handle "10 1/2" -> split by space
        if (s.includes(' ')) {
            const parts = s.split(/\s+/);
            if (parts.length === 2) {
                return parseFloat(parts[0]) + parseFraction(parts[1]);
            }
        }
        return parseFraction(s);
    };

    // Check for Feet/Inches format (contains ' or " or ft or in)
    if (str.match(/['"]|ft|in/)) {
        let feet = 0;
        let inches = 0;

        // Pattern for a number:
        // 1. Whole + Fraction: \d+ \d+/\d+ (e.g., 10 1/2)
        // 2. Fraction: \d+/\d+ (e.g., 1/4)
        // 3. Decimal/Integer: \d+(\.\d+)? (e.g., 10.5 or 10)
        // We use capturing group for the whole number part
        const numPat = "(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)";

        // Extract Feet (looks for ' or ft)
        const feetRegex = new RegExp(`${numPat}\\s*(?:'|ft)`);
        const feetMatch = str.match(feetRegex);

        if (feetMatch) {
            feet = parseNumeric(feetMatch[1]);
        }

        // Extract Inches from remainder
        let remainder = str;
        if (feetMatch) {
            remainder = str.substring(feetMatch.index! + feetMatch[0].length);
        }

        // Remove leading separators like " - ", "-", " "
        remainder = remainder.replace(/^[\s-]+/, '');

        // Extract Inches (looks for " or in, or just the end of string if we had feet)
        const inchesRegex = new RegExp(`${numPat}\\s*(?:"|in)?`);
        const inchesMatch = remainder.match(inchesRegex);

        // Careful: if we haven't matched inches explicitly, make sure it's not empty
        if (inchesMatch && inchesMatch[1]) {
            inches = parseNumeric(inchesMatch[1]);
        }

        return feet + (inches / 12);
    }

    // Handle "10-6" format (10 feet 6 inches) often used in construction
    if (str.includes('-') && !str.includes('/')) {
        const parts = str.split('-').map(x => x.trim());
        if (parts.length === 2) {
            const f = parseFloat(parts[0]);
            const i = parseFloat(parts[1]);
            if (!isNaN(f) && !isNaN(i)) {
                return f + (i / 12);
            }
        }
    }

    // Fallback for simple numbers or simple fractions ("1/4" without units)
    const val = parseNumeric(str);
    return isNaN(val) ? null : val;
};

/**
 * Calculates Euclidean distance between two points
 */
export const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Calculates length of a polyline
 */
export const calculatePolylineLength = (points: Point[]): number => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += calculateDistance(points[i], points[i + 1]);
    }
    return total;
};

/**
 * Shoelace formula for polygon area
 */
export const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

/**
 * Calculates the centroid (geometric center) of a polygon.
 * Uses the standard polygon centroid formula.
 */
export const calculatePolygonCentroid = (points: Point[]): Point => {
    if (points.length < 3) {
        // Fallback for line/point
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return { x, y };
    }

    let cx = 0, cy = 0, area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const p1 = points[i];
        const p2 = points[j];
        const cross = (p1.x * p2.y - p2.x * p1.y);
        area += cross;
        cx += (p1.x + p2.x) * cross;
        cy += (p1.y + p2.y) * cross;
    }

    area /= 2;
    if (area === 0) return points[0]; // Degenerate polygon

    cx /= (6 * area);
    cy /= (6 * area);

    return { x: cx, y: cy };
};

/**
 * Calculates current properties (count, length, area) for a markup based on its paths.
 */
export const calculateMarkupProperties = (paths: Point[][], tool: ToolType, defaults: any = {}): Markup['properties'] => {
    if (tool === 'count') {
        const count = paths.reduce((sum, path) => sum + path.length, 0);
        return { ...defaults, count } as any;
    }

    if (tool === 'area') {
        const holeIndices = (defaults as any).holeIndices || [];
        let totalArea = 0;

        paths.forEach((path, index) => {
            const area = calculatePolygonArea(path);
            if (holeIndices.includes(index)) {
                totalArea -= area;
            } else {
                totalArea += area;
            }
        });

        const isDeduction = defaults.deduction === true;
        return {
            ...defaults,
            value: isDeduction ? -totalArea : totalArea,
            deduction: isDeduction,
            holeIndices: holeIndices
        } as any;
    }

    if (tool === 'segment' || tool === 'linear' || tool === 'ruler') {
        let totalLength = 0;
        paths.forEach(path => {
            totalLength += calculatePolylineLength(path);
        });
        return { ...defaults, value: totalLength } as any;
    }

    return defaults;
};
