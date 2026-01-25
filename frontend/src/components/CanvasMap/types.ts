/**
 * CanvasMap Types
 * Shared types for the CanvasMap component module
 */
import * as PIXI from 'pixi.js';

/** Basic 2D point */
export interface Point {
    x: number;
    y: number;
}

/** Context menu state */
export interface ContextMenuState {
    x: number;
    y: number;
    markupId: string;
    type?: 'area_context' | 'add_point';
    pathIdx?: number;
    insertIndex?: number;
    insertPoint?: Point;
}

/** Refs shared across CanvasMap hooks */
export interface CanvasRefs {
    containerRef: React.RefObject<HTMLDivElement | null>;
    appRef: React.MutableRefObject<PIXI.Application | null>;
    mainContainerRef: React.MutableRefObject<PIXI.Container | null>;
    pdfLayerRef: React.MutableRefObject<PIXI.Container | null>;
    markupsContainerRef: React.MutableRefObject<PIXI.Container | null>;
    labelsLayerRef: React.MutableRefObject<PIXI.Container | null>;
    drawingLayerRef: React.MutableRefObject<PIXI.Graphics | null>;
    cursorLayerRef: React.MutableRefObject<PIXI.Container | null>;
    cursorGraphicsRef: React.MutableRefObject<PIXI.Graphics | null>;
    cursorTextRef: React.MutableRefObject<PIXI.Text | null>;
    cursorBadgeBgRef: React.MutableRefObject<PIXI.Graphics | null>;
    colorMatrixFilterRef: React.MutableRefObject<PIXI.ColorMatrixFilter | null>;
    dashedTextureRef: React.MutableRefObject<PIXI.Texture | null>;
}

/** Drawing state refs */
export interface DrawingStateRefs {
    currentPointsRef: React.MutableRefObject<Point[]>;
    calibPointsRef: React.MutableRefObject<Point[]>;
    isDrawingRef: React.MutableRefObject<boolean>;
    activeMarkupIdRef: React.MutableRefObject<string | null>;
    openPdfPathRef: React.MutableRefObject<string | null>;
    snapPointRef: React.MutableRefObject<Point | null>;
    prevSessionRef: React.MutableRefObject<number>;
    lastRenderZoomRef: React.MutableRefObject<number>;
    themeRef: React.MutableRefObject<string | undefined>;
}

/** Cache refs for performance optimization */
export interface CacheRefs {
    graphicsCacheRef: React.MutableRefObject<Map<string, PIXI.Graphics>>;
    labelCacheRef: React.MutableRefObject<Map<string, PIXI.Text>>;
    markupsMapRef: React.MutableRefObject<Map<string, unknown>>;
    visibleIdsRef: React.MutableRefObject<Set<string>>;
}

/** Combined refs interface */
export interface AllCanvasRefs extends CanvasRefs, DrawingStateRefs, CacheRefs { }

/** Props for canvas hooks */
export interface CanvasHookProps {
    refs: AllCanvasRefs;
    fitToScreen?: () => void;
}
