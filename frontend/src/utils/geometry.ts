/**
 * Geometry utilities for spatial operations
 */
import type { Point } from '../stores/useProjectStore';

/**
 * Ray-casting algorithm to detect if a point is inside a polygon.
 * @param point - The point to test
 * @param polygon - Array of points forming the polygon
 * @returns true if the point is inside the polygon
 */
export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
    if (polygon.length < 3) return false;

    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
};

/**
 * Calculate the bounding box of a polygon
 * @param polygon - Array of points forming the polygon
 * @returns { minX, minY, maxX, maxY }
 */
export const polygonBounds = (polygon: Point[]): { minX: number; minY: number; maxX: number; maxY: number } => {
    if (polygon.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = polygon[0].x, maxX = polygon[0].x;
    let minY = polygon[0].y, maxY = polygon[0].y;

    for (const p of polygon) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    return { minX, minY, maxX, maxY };
};

/**
 * Check if a point is near a polygon edge (for edge hit-testing)
 * @param point - The point to test
 * @param polygon - Array of points forming the polygon
 * @param threshold - Distance threshold
 * @returns true if the point is within threshold distance of any edge
 */
export const pointNearPolygonEdge = (point: Point, polygon: Point[], threshold: number): boolean => {
    if (polygon.length < 2) return false;

    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        const dist = pointToLineDistance(point, polygon[i], polygon[j]);
        if (dist <= threshold) return true;
    }

    return false;
};


/**
 * Find the nearest segment in a path to a given point
 * @param point - The point to test
 * @param path - Array of points forming the path
 * @param threshold - Distance threshold
 * @param closed - Whether the path is closed (polygon) or open (polyline)
 * @returns Object containing index of segment start, projected point, and distance, or null if strictly outside threshold
 */
export const getNearestSegment = (point: Point, path: Point[], threshold: number, closed: boolean = false): { index: number; point: Point; distance: number } | null => {
    if (path.length < 2) return null;

    let minDistance = threshold;
    let result: { index: number; point: Point; distance: number } | null = null;

    const count = closed ? path.length : path.length - 1;

    for (let i = 0; i < count; i++) {
        const p1 = path[i];
        const p2 = path[(i + 1) % path.length];

        const { distance, point: projected } = pointToLineProjection(point, p1, p2);

        if (distance < minDistance) {
            minDistance = distance;
            result = {
                index: i,
                point: projected,
                distance: distance
            };
        }
    }

    return result;
};

/**
 * Calculate the distance and projected point from a point to a line segment
 */
export const pointToLineProjection = (point: Point, lineStart: Point, lineEnd: Point): { distance: number; point: Point } => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        // Line segment is a point
        const dist = Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
        return { distance: dist, point: { x: lineStart.x, y: lineStart.y } };
    }

    // Parameter t represents position along the line segment (0 = start, 1 = end)
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    const dist = Math.hypot(point.x - closestX, point.y - closestY);
    return { distance: dist, point: { x: closestX, y: closestY } };
};

/**
 * Calculate the distance from a point to a line segment
 */
export const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
    return pointToLineProjection(point, lineStart, lineEnd).distance;
};
