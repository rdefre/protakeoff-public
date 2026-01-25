import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useProjectStore } from '../../stores/useProjectStore';

interface UseSearchHighlightsProps {
    markupsContainerRef: React.MutableRefObject<PIXI.Container | null>;
    mainContainerRef: React.MutableRefObject<PIXI.Container | null>;
    appRef: React.MutableRefObject<PIXI.Application | null>;
    isAppReady: boolean;
    cullVisibleMarkups: () => void;
}

/**
 * Hook to render search hit highlights on the canvas.
 * Creates yellow semi-transparent quads over text matches.
 * Also zooms/pans the viewport to focus on the highlights when they change.
 */
export function useSearchHighlights({
    markupsContainerRef,
    mainContainerRef,
    appRef,
    isAppReady,
    cullVisibleMarkups,
}: UseSearchHighlightsProps) {
    const graphicsRef = useRef<PIXI.Graphics | null>(null);
    const searchHighlights = useProjectStore((s) => s.searchHighlights);

    useEffect(() => {
        if (!isAppReady || !markupsContainerRef.current) return;



        // Clean up previous graphics
        if (graphicsRef.current) {
            graphicsRef.current.destroy();
            graphicsRef.current = null;
        }

        // Nothing to render
        if (!searchHighlights || searchHighlights.length === 0) {

            return;
        }

        // Create new graphics object for search highlights
        const g = new PIXI.Graphics();
        g.label = 'searchHighlights';
        g.zIndex = 600; // Above markups but below labels

        const zoom = mainContainerRef.current?.scale.x ?? 1;



        for (const hit of searchHighlights) {
            // Draw the quad
            g.moveTo(hit.ul[0], hit.ul[1]);
            g.lineTo(hit.ur[0], hit.ur[1]);
            g.lineTo(hit.lr[0], hit.lr[1]);
            g.lineTo(hit.ll[0], hit.ll[1]);
            g.closePath();

            // Semi-transparent yellow fill
            g.fill({ color: 0xFFFF00, alpha: 0.35 });

            // Orange outline
            g.stroke({ width: 2 / zoom, color: 0xFF8800, alpha: 0.9 });
        }

        markupsContainerRef.current.addChild(g);
        graphicsRef.current = g;

        // --- Auto-Zoom Logic ---
        if (appRef.current && mainContainerRef.current) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const hit of searchHighlights) {
                minX = Math.min(minX, hit.ul[0], hit.ll[0]);
                maxX = Math.max(maxX, hit.ur[0], hit.lr[0]);
                minY = Math.min(minY, hit.ul[1], hit.ur[1]);
                maxY = Math.max(maxY, hit.ll[1], hit.lr[1]);
            }

            if (minX !== Infinity) {
                const width = maxX - minX;
                const height = maxY - minY;
                const screenW = appRef.current.screen.width;
                const screenH = appRef.current.screen.height;

                // Add padding (e.g., 20% or 100px)
                const padding = 100;

                // Calculate target scale
                // If it's a single word (tiny width), limit max zoom to e.g. 2.0 or 3.0
                const targetScaleX = (screenW - padding * 2) / width;
                const targetScaleY = (screenH - padding * 2) / height;
                let scale = Math.min(targetScaleX, targetScaleY);

                // Clamp scale (don't zoom in crazy close for 1 word, but don't zoom out too far)
                scale = Math.min(scale, 2.5);
                scale = Math.max(scale, 0.1);

                // Center point of the highlights
                const centerX = minX + width / 2;
                const centerY = minY + height / 2;

                // Set Viewport
                // formula: container.position = screenCenter - (worldCenter * scale)
                mainContainerRef.current.scale.set(scale);
                mainContainerRef.current.position.set(
                    (screenW / 2) - (centerX * scale),
                    (screenH / 2) - (centerY * scale)
                );

                // Re-cull to ensure markups/tiles are sharp/loaded
                cullVisibleMarkups();
            }
        }

        // Cleanup on unmount
        return () => {
            if (graphicsRef.current) {
                graphicsRef.current.destroy();
                graphicsRef.current = null;
            }
        };
    }, [searchHighlights, isAppReady, markupsContainerRef, mainContainerRef, appRef, cullVisibleMarkups]);

    return null;
}
