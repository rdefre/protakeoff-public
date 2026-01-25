/**
 * Canvas Drawing Utilities
 * Pure utility functions for drawing shapes on PIXI Graphics
 */
import * as PIXI from 'pixi.js';

export interface Point {
    x: number;
    y: number;
}

/**
 * Draws a shape (circle, square, or triangle) at the specified position
 */
export const drawShape = (
    g: PIXI.Graphics,
    x: number,
    y: number,
    shape: string,
    size: number,
    color: string | number,
    isSelected: boolean
): void => {
    // Safety check
    if (!g || g.destroyed) return;

    const fillAlpha = 1;
    const colorValue = typeof color === 'string'
        ? PIXI.Color.shared.setValue(color).toNumber()
        : color;

    // PixiJS v8: Draw shape first, then chain fill/stroke
    if (shape === 'square') {
        g.rect(x - size, y - size, size * 2, size * 2);
    } else if (shape === 'triangle') {
        const h = size * Math.sqrt(3);
        g.poly([
            x, y - h / 1.5,
            x - size, y + h / 2,
            x + size, y + h / 2
        ]);
    } else {
        g.circle(x, y, size);
    }

    // Apply fill and stroke after drawing shape
    g.fill({ color: colorValue, alpha: fillAlpha });
    if (isSelected) {
        g.stroke({ width: 0.5, color: 0x2563eb });
    }
};

/**
 * Draws a dashed line between two points
 * Fixes texture stretching issues by drawing individual segments
 */
export const drawDashedLine = (
    g: PIXI.Graphics,
    p1: Point,
    p2: Point,
    color: string | number,
    width: number = 1,
    dashLen: number = 5,
    gapLen: number = 5
): void => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const count = Math.floor(len / (dashLen + gapLen));
    const colorValue = typeof color === 'string'
        ? PIXI.Color.shared.setValue(color).toNumber()
        : color;

    // Draw segments
    for (let i = 0; i < count; i++) {
        const t1 = i * (dashLen + gapLen) / len;
        const t2 = (i * (dashLen + gapLen) + dashLen) / len;

        g.moveTo(p1.x + dx * t1, p1.y + dy * t1);
        g.lineTo(p1.x + dx * t2, p1.y + dy * t2);
        g.stroke({ width: width, color: colorValue });
    }

    // Final segment if space remains
    const lastT = count * (dashLen + gapLen) / len;
    if (lastT < 1) {
        const tEnd = Math.min(1, lastT + (dashLen / len));
        g.moveTo(p1.x + dx * lastT, p1.y + dy * lastT);
        g.lineTo(p1.x + dx * tEnd, p1.y + dy * tEnd);
        g.stroke({ width: width, color: colorValue });
    }
};
