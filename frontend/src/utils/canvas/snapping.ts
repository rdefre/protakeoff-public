/**
 * Canvas Snapping Utilities
 * Functions for finding snap points on markups
 */
import type { Markup } from '@/stores/useProjectStore';

export interface Point {
    x: number;
    y: number;
}

/**
 * Find the nearest snap point within a given radius
 * Used for magnetic snapping when drawing
 */
export const findSnapPoint = (
    worldPos: Point,
    pageMarkups: Markup[],
    snapRadius: number = 4
): Point | null => {
    let closest: Point | null = null;
    let minDist = snapRadius;

    for (const m of pageMarkups) {
        // Do not snap to legend
        if (m.type === 'legend') continue;

        for (const path of m.paths) {
            for (const p of path) {
                const dist = Math.hypot(worldPos.x - p.x, worldPos.y - p.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = p;
                }
            }
        }
    }

    return closest;
};

/**
 * Check if a position is within snap distance of any existing point
 */
export const isNearSnapPoint = (
    worldPos: Point,
    pageMarkups: Markup[],
    snapRadius: number = 4
): boolean => {
    return findSnapPoint(worldPos, pageMarkups, snapRadius) !== null;
};
