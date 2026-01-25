import { useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useProjectStore } from '../../stores/useProjectStore';
import type { CanvasHookProps } from './types';
import { RENDER_ZOOM } from '../../utils/scales';
import { buildProtocolUrl } from '../../utils/platformUrl';

interface UsePdfRendererProps extends CanvasHookProps {
    isAppReady: boolean;
}

export const usePdfRenderer = ({ refs, fitToScreen, isAppReady }: UsePdfRendererProps) => {
    const { appRef, pdfLayerRef, themeRef, colorMatrixFilterRef } = refs;
    const { currentProject, currentPageId } = useProjectStore();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadPdf = async () => {
            const app = appRef.current;
            const pdfLayer = pdfLayerRef.current;

            if (!app || !pdfLayer) return;



            if (!currentProject || !currentPageId) {

                pdfLayer.removeChildren();
                return;
            }

            // Standard format: "pdfId:pageIndex" (0-based)
            const parts = currentPageId.split(':');
            if (parts.length < 2) {
                console.warn('[usePdfRenderer] Invalid pageId format:', currentPageId);
                pdfLayer.removeChildren();
                return;
            }

            const pdfId = parts[0];
            const pageIndex = parseInt(parts[1], 10);



            if (isNaN(pageIndex)) {
                console.warn('[usePdfRenderer] Invalid page index:', parts[1], 'fullId:', currentPageId);
                return;
            }

            // Construct Virtual URL (platform-aware)
            const zoom = RENDER_ZOOM;
            const url = buildProtocolUrl(`/page/${pdfId}/${pageIndex}.png?zoom=${zoom}`);
            console.log(`[usePdfRenderer] Loading PDF Page: ${url} (Id: ${pdfId}, Page: ${pageIndex})`);


            setIsLoading(true);

            try {
                console.log('[usePdfRenderer] Starting PIXI.Assets.load...');
                // Ensure we handle CORS
                const texture = await PIXI.Assets.load({
                    src: url,
                    data: { crossOrigin: 'anonymous' }
                });



                if (!pdfLayerRef.current) {
                    console.warn('[usePdfRenderer] Component unmounted during load');
                    return;
                }

                console.log('[usePdfRenderer] Texture loaded successfully:', texture);
                pdfLayer.removeChildren();
                const sprite = new PIXI.Sprite(texture);

                // Adjust position/scale if needed?
                // Usually we just place it at 0,0 and let viewport camera handle zoom/pan.


                pdfLayer.addChild(sprite);

                // Dark Mode Filter
                if (themeRef.current === 'dark') {

                    const filter = new PIXI.ColorMatrixFilter();
                    // Invert: 
                    // R' = 1 - R
                    // G' = 1 - G
                    // B' = 1 - B
                    filter.matrix = [
                        -1, 0, 0, 0, 1,
                        0, -1, 0, 0, 1,
                        0, 0, -1, 0, 1,
                        0, 0, 0, 1, 0
                    ];
                    sprite.filters = [filter];
                    colorMatrixFilterRef.current = filter;
                } else {
                    sprite.filters = [];
                    colorMatrixFilterRef.current = null;
                }

                setIsLoading(false);

                if (fitToScreen) {
                    fitToScreen();
                }

            } catch (err) {
                console.error("[usePdfRenderer] Failed to load PDF page texture", url, err);
                setIsLoading(false);
            }
        };

        loadPdf();

        return () => {
            // Cleanup current page resources if needed
            // Ideally we'd track the last loaded URL and unload it.
        };
    }, [currentPageId, currentProject?.id, appRef, pdfLayerRef, themeRef, fitToScreen, isAppReady]);

    return { isLoading };
};
