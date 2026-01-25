import { useCallback, useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import type { CanvasHookProps } from './types';

interface UseCanvasInitProps extends CanvasHookProps {
    cullVisibleMarkups: () => void;
    setIsAppReady: (ready: boolean) => void;
}

/**
 * Hook to handle PixiJS Application initialization and layer setup
 */
export const useCanvasInit = ({ refs, cullVisibleMarkups, setIsAppReady }: UseCanvasInitProps) => {
    const {
        containerRef, appRef, mainContainerRef, themeRef,
        pdfLayerRef, markupsContainerRef, labelsLayerRef, drawingLayerRef,
        cursorLayerRef, cursorGraphicsRef, cursorTextRef, cursorBadgeBgRef,
        dashedTextureRef
    } = refs;

    // Use a ref to track if we're mounted to prevent async state updates after unmount
    const mountedRef = useRef(true);
    const initializingRef = useRef(false); // Guard against double-init

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const initApp = useCallback(async () => {
        if (!containerRef.current) return;
        if (appRef.current) return; // Already initialized
        if (initializingRef.current) return; // Already initializing

        initializingRef.current = true;

        // Brute force cleanup: Clear container if it has stale children
        while (containerRef.current.firstChild) {
            console.warn('[useCanvasInit] Removing stale canvas from container');
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        console.log('Initializing PIXI App...');
        const app = new PIXI.Application();

        await app.init({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: 0xf3f4f6, // Default gray
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            preference: 'webgl',
        });

        initializingRef.current = false;

        if (!mountedRef.current || !containerRef.current) {
            app.destroy(true, { children: true });
            return;
        }

        // Final check effectively acts as a mutex commit
        if (appRef.current) {
            console.warn('[useCanvasInit] App already set by parallel init, destroying duplicate');
            app.destroy(true, { children: true });
            return;
        }

        containerRef.current.appendChild(app.canvas);
        appRef.current = app;
        setIsAppReady(true);

        // Generate Dashed Texture
        const gDash = new PIXI.Graphics();
        gDash.rect(0, 0, 4, 1).fill('white'); // 4px dash
        // 4px gap (total width 8)
        const tex = app.renderer.generateTexture({ target: gDash, resolution: 1, frame: new PIXI.Rectangle(0, 0, 8, 1) });
        tex.source.style.addressMode = 'repeat';
        tex.source.style.scaleMode = 'nearest';
        dashedTextureRef.current = tex;

        // Create MAIN WORLD CONTAINER (The Infinite Canvas)
        const mainContainer = new PIXI.Container();
        mainContainer.position.set(0, 0);
        app.stage.addChild(mainContainer);
        mainContainerRef.current = mainContainer;

        // Create layers attached to WORLD
        const pdfContainer = new PIXI.Container();
        pdfLayerRef.current = pdfContainer;
        mainContainer.addChild(pdfContainer);

        const markupsContainer = new PIXI.Container({ isRenderGroup: true });
        markupsContainer.sortableChildren = true;
        markupsContainerRef.current = markupsContainer;
        mainContainer.addChild(markupsContainer);

        const labelsLayer = new PIXI.Container();
        labelsLayer.sortableChildren = true;
        labelsLayer.zIndex = 500;
        labelsLayerRef.current = labelsLayer;
        mainContainer.addChild(labelsLayer);


        const drawingLayer = new PIXI.Graphics();
        drawingLayerRef.current = drawingLayer;
        mainContainer.addChild(drawingLayer);

        // CAD-style crosshair cursor layer (topmost, SCREEN SPACE)
        const cursorContainer = new PIXI.Container();
        cursorLayerRef.current = cursorContainer;
        cursorContainer.visible = false;
        app.stage.addChild(cursorContainer);

        // 1. Crosshair Lines
        const cursorGraphics = new PIXI.Graphics();
        cursorGraphicsRef.current = cursorGraphics;
        cursorContainer.addChild(cursorGraphics);

        // 2. Badge Background
        const badgeBg = new PIXI.Graphics();
        cursorBadgeBgRef.current = badgeBg;
        cursorContainer.addChild(badgeBg);

        // 3. Badge Text
        const cursorText = new PIXI.Text({ text: '', style: { fontFamily: 'Arial', fontSize: 12, fill: 'black', fontWeight: 'bold' } });
        cursorTextRef.current = cursorText;
        cursorContainer.addChild(cursorText);

        // Setup interaction on the STAGE
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;

        // --- RESIZE HANDLING ---
        let resizeFrameId: number | null = null;
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0] && app) {
                const { width, height } = entries[0].contentRect;
                if (width === 0 || height === 0) return;

                if (resizeFrameId) cancelAnimationFrame(resizeFrameId);

                resizeFrameId = requestAnimationFrame(() => {
                    if (!app || !app.renderer) return;
                    app.renderer.resize(width, height);
                    app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);

                    // Only cull, do not move/zoom
                    cullVisibleMarkups();
                    resizeFrameId = null;
                });
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Return cleanup function for the effect that calls this
        return () => {
            resizeObserver.disconnect();
            if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
            app.destroy(true, { children: true });
            appRef.current = null;
            setIsAppReady(false);
        };

    }, [
        containerRef, appRef, mainContainerRef, themeRef, setIsAppReady,
        pdfLayerRef, markupsContainerRef, drawingLayerRef, dashedTextureRef,
        cursorLayerRef, cursorGraphicsRef, cursorTextRef, cursorBadgeBgRef,
        cullVisibleMarkups
    ]);

    return { initApp };
};
