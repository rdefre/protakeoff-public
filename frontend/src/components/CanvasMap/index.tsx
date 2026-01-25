
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import * as PIXI from 'pixi.js';
import { type Point } from '../../types/store';
import { useProjectStore } from '../../stores/useProjectStore';
import { CalibrationDialog } from '../CalibrationDialog';
import { NoteTextModal } from '../NoteTextModal';
import { ContextMenu, getMarkupContextMenuItems } from '../ContextMenu';
import { useCanvasInit } from './useCanvasInit';
import { useMarkupRenderer } from './useMarkupRenderer';
import { usePdfRenderer } from './usePdfRenderer';
import { useEventHandlers } from './useEventHandlers';
import { useSearchHighlights } from './useSearchHighlights';
import type { AllCanvasRefs, ContextMenuState } from './types';

// Styles
const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: 'var(--background)',
    },
    emptyState: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: '#9ca3af',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8,
        color: '#6b7280',
    },
    emptyText: {
        fontSize: 14,
    },
    cutoutIndicator: {
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 8,
        fontSize: 13,
    }
};

const CanvasMap: React.FC = () => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const mainContainerRef = useRef<PIXI.Container | null>(null);
    const pdfLayerRef = useRef<PIXI.Container | null>(null);
    const markupsContainerRef = useRef<PIXI.Container | null>(null);
    const labelsLayerRef = useRef<PIXI.Container | null>(null);
    const drawingLayerRef = useRef<PIXI.Graphics | null>(null);
    const cursorLayerRef = useRef<PIXI.Container | null>(null);
    const cursorGraphicsRef = useRef<PIXI.Graphics | null>(null);
    const cursorTextRef = useRef<PIXI.Text | null>(null);
    const cursorBadgeBgRef = useRef<PIXI.Graphics | null>(null);
    const dashedTextureRef = useRef<PIXI.Texture | null>(null);

    // State-like Refs
    const visibleIdsRef = useRef<Set<string>>(new Set());
    const markupsMapRef = useRef<Map<string, unknown>>(new Map());
    const labelCacheRef = useRef<Map<string, PIXI.Text>>(new Map());
    const graphicsCacheRef = useRef<Map<string, PIXI.Graphics>>(new Map());

    const isDrawingRef = useRef(false);
    const currentPointsRef = useRef<Point[]>([]);
    const snapPointRef = useRef<Point | null>(null);
    const activeMarkupIdRef = useRef<string | null>(null);
    const calibPointsRef = useRef<Point[]>([]);

    // Additional Refs required by AllCanvasRefs
    const openPdfPathRef = useRef<string | null>(null);
    const prevSessionRef = useRef<number>(0);
    const lastRenderZoomRef = useRef<number>(1);
    const colorMatrixFilterRef = useRef<PIXI.ColorMatrixFilter | null>(null);

    const { resolvedTheme } = useTheme();
    const themeRef = useRef(resolvedTheme);
    useEffect(() => { themeRef.current = resolvedTheme; }, [resolvedTheme]);

    // Component State
    const [isAppReady, setIsAppReady] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Calibration State
    const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
    const [calibPixelDist, setCalibPixelDist] = useState<number>(0);

    // Note Text Modal State
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [pendingNoteMarkupId, setPendingNoteMarkupId] = useState<string | null>(null);

    const refs: AllCanvasRefs = {
        containerRef, appRef, mainContainerRef, pdfLayerRef, markupsContainerRef, labelsLayerRef,
        drawingLayerRef, cursorLayerRef, cursorGraphicsRef, cursorTextRef, cursorBadgeBgRef,
        dashedTextureRef, visibleIdsRef, markupsMapRef, labelCacheRef, graphicsCacheRef,
        isDrawingRef, currentPointsRef, snapPointRef, activeMarkupIdRef, calibPointsRef,
        themeRef, openPdfPathRef, prevSessionRef, lastRenderZoomRef, colorMatrixFilterRef
    };

    // 3. Initialization Logic (Before Event Handlers)

    // A. Markup Renderer (Provides updateMarkupGraphics)
    const { updateMarkupGraphics, renderCurrentDrawing } = useMarkupRenderer({ refs });

    // B. Culling Logic (Uses updateMarkupGraphics)
    const cullVisibleMarkups = useCallback(() => {
        if (!appRef.current || !mainContainerRef.current || !markupsContainerRef.current) return;

        const store = useProjectStore.getState();
        const pageId = store.currentPageId || 'default';
        const project = store.currentProject;
        if (!project) return;
        const markups = project.markups[pageId] || [];

        // Update Map Ref
        markupsMapRef.current.clear();
        markups.forEach(m => markupsMapRef.current.set(m.id, m));

        const visibleIds = new Set<string>();
        const selectionIds = store.selectedMarkupIds;
        const selectedIndices = store.selectedPointIndices;
        const selectedShapeIndices = store.selectedShapeIndices;

        markups.forEach(m => {
            visibleIds.add(m.id);
            updateMarkupGraphics(m, selectionIds.includes(m.id), selectedIndices[m.id], selectedShapeIndices[m.id], markups);
        });

        // Cleanup invisible graphics
        graphicsCacheRef.current.forEach((g, id) => {
            if (!visibleIds.has(id)) {
                g.destroy();
                graphicsCacheRef.current.delete(id);
            }
        });

        // Cleanup invisible labels
        labelCacheRef.current.forEach((label, key) => {
            // Find the markup ID. Since keys are like "markupId-note-0" or "markupId-0",
            // we check if the key starts with any visible ID followed by a hyphen.
            let isVisibleId = false;
            for (const vid of visibleIds) {
                if (key === vid || key.startsWith(vid + '-')) {
                    isVisibleId = true;
                    break;
                }
            }

            if (!isVisibleId) {
                label.destroy();
                labelCacheRef.current.delete(key);
            }
        });

    }, [updateMarkupGraphics]);

    // C. App Initialization (Uses cullVisibleMarkups)
    const { initApp } = useCanvasInit({ refs, cullVisibleMarkups, setIsAppReady });

    // D. Fit To Screen Helper (Uses cullVisibleMarkups)
    const fitToScreen = useCallback(() => {
        if (!appRef.current || !mainContainerRef.current || !pdfLayerRef.current) return;

        // Guard: Don't call getLocalBounds on empty container
        if (pdfLayerRef.current.children.length === 0) return;

        try {
            const bounds = pdfLayerRef.current.getLocalBounds();
            const screenW = appRef.current.screen.width;
            const screenH = appRef.current.screen.height;

            if (bounds.width === 0) return;

            const scale = Math.min(screenW / bounds.width, screenH / bounds.height) * 0.9;

            mainContainerRef.current.scale.set(scale);
            mainContainerRef.current.position.set(
                (screenW - bounds.width * scale) / 2,
                (screenH - bounds.height * scale) / 2
            );
            cullVisibleMarkups();
        } catch (err) {
            console.warn('[CanvasMap] fitToScreen error:', err);
        }
    }, [cullVisibleMarkups]);

    // E. PDF Renderer (Uses fitToScreen)
    usePdfRenderer({ refs, fitToScreen, isAppReady });

    // F. Events & Handlers
    const setCalibPointsWrapper = (val: React.SetStateAction<Point[]>) => {
        if (typeof val === 'function') calibPointsRef.current = val(calibPointsRef.current);
        else calibPointsRef.current = val;
    };

    useEventHandlers({
        refs, isAppReady, cullVisibleMarkups,
        setContextMenu,
        setCalibrationPoints: setCalibPointsWrapper,
        setShowCalibrationDialog,
        setCalibPixelDist,
        fitToScreen,
        renderCurrentDrawing,
        setShowNoteModal,
        setPendingNoteMarkupId
    });

    // Lifecycle
    useEffect(() => {
        initApp();
        return () => {
            appRef.current?.destroy(true, { children: true, texture: false, context: true });
            appRef.current = null;
        };
    }, [initApp]);

    // G. Search Highlights
    useSearchHighlights({
        markupsContainerRef,
        mainContainerRef,
        appRef,
        isAppReady,
        cullVisibleMarkups,
    });

    const storeState = useProjectStore();
    // Re-cull when markups change
    useEffect(() => {
        if (isAppReady) {
            cullVisibleMarkups();
        }
    }, [
        isAppReady,
        storeState.currentProject?.markups,
        storeState.selectedMarkupIds,
        storeState.selectedPointIndices,
        storeState.selectedShapeIndices,
        cullVisibleMarkups
    ]);

    // Sync state and handle tool transitions
    useEffect(() => {
        // If we are explicitly recording to an item, ensure the ref matches
        if (storeState.recordingMarkupId) {
            activeMarkupIdRef.current = storeState.recordingMarkupId;
        } else {
            // Otherwise, when tool changes, we start fresh
            activeMarkupIdRef.current = null;
            currentPointsRef.current = [];
            isDrawingRef.current = false;
            drawingLayerRef.current?.clear();
        }
    }, [storeState.activeTool, storeState.recordingMarkupId]);


    return (
        <div style={styles.container}>
            {/* Dedicated PixiJS Container - MUST BE EMPTY of React Children */}
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />

            {/* React Overlays (Managed by React, independent of Pixi container) */}

            {/* Empty State */}
            {!storeState.currentPageId && (
                <div style={styles.emptyState}>
                    <div style={styles.emptyTitle}>No PDF Loaded</div>
                    <div style={styles.emptyText}>Upload a PDF to start takeoff</div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getMarkupContextMenuItems(
                        contextMenu.markupId,
                        (id) => { // onCutout
                            useProjectStore.getState().startCutout(id);
                            setContextMenu(null);
                        },
                        contextMenu.type === 'add_point' ? () => { // onAddPoint
                            if (contextMenu.insertPoint && contextMenu.insertIndex !== undefined && contextMenu.pathIdx !== undefined) {
                                const store = useProjectStore.getState();
                                const pageId = store.currentPageId || 'default';
                                const m = store.currentProject?.markups[pageId]?.find(m => m.id === contextMenu.markupId);
                                if (m) {
                                    const newPaths = m.paths.map(p => p.map(pt => ({ ...pt })));
                                    const path = newPaths[contextMenu.pathIdx];
                                    path.splice(contextMenu.insertIndex + 1, 0, contextMenu.insertPoint);
                                    store.updateMarkup(m.id, { paths: newPaths });
                                }
                            }
                            setContextMenu(null);
                        } : undefined,
                        contextMenu.type === 'add_point'
                    )}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Calibration Dialog */}
            <CalibrationDialog
                open={showCalibrationDialog}
                onClose={() => { setShowCalibrationDialog(false); calibPointsRef.current = []; storeState.setIsCalibrating(false); }}
                pixelDistance={calibPixelDist}
            />

            {/* Note Text Modal */}
            <NoteTextModal
                open={showNoteModal}
                onClose={() => {
                    setShowNoteModal(false);
                    // Delete the note if user cancels without text
                    if (pendingNoteMarkupId) {
                        const store = useProjectStore.getState();
                        const pageId = store.currentPageId || 'default';
                        const m = store.currentProject?.markups[pageId]?.find(x => x.id === pendingNoteMarkupId);
                        if (m && !(m.properties as any).text?.trim()) {
                            store.deleteMarkup(pendingNoteMarkupId);
                        }
                    }
                    setPendingNoteMarkupId(null);
                }}
                onSubmit={(text) => {
                    const store = useProjectStore.getState();
                    if (pendingNoteMarkupId && text.trim()) {
                        const pageId = store.currentPageId || 'default';
                        const m = store.currentProject?.markups[pageId]?.find(x => x.id === pendingNoteMarkupId);
                        if (m) {
                            store.updateMarkup(pendingNoteMarkupId, {
                                properties: { ...m.properties, text }
                            });
                        }
                    }
                    setPendingNoteMarkupId(null);
                }}
            />

            {/* Cutout Indicator */}
            {storeState.isCuttingOut && storeState.cutoutParentId && (
                <div style={styles.cutoutIndicator as React.CSSProperties}>
                    CUTOUT MODE - Draw polygon to remove area. Press Enter to finish, Esc to cancel.
                </div>
            )}
        </div>
    );
};

export default CanvasMap;
