import { useEffect, useCallback, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { CanvasHookProps, ContextMenuState, Point } from './types';
import { useProjectStore, type ToolType } from '../../stores/useProjectStore';
import { getNearestSegment, pointInPolygon } from '../../utils/geometry';
import { getAggregatedLegendItems } from '../../utils/legend';
import { calculateMarkupProperties } from '../../utils/measurement';
import { formatArchitectural } from '../../utils/units';
import { findSnapPoint } from '../../utils/canvas';
import { useKeyboardHandlers } from './useKeyboardHandlers';

interface UseEventHandlersProps extends CanvasHookProps {
    isAppReady: boolean;
    cullVisibleMarkups: () => void;
    setContextMenu: (state: ContextMenuState | null) => void;
    setCalibrationPoints: React.Dispatch<React.SetStateAction<Point[]>>;
    setShowCalibrationDialog: (show: boolean) => void;
    setCalibPixelDist: (dist: number) => void;
    fitToScreen: () => void;
    renderCurrentDrawing: (g: PIXI.Graphics, points: Point[], tool: string) => void;
    setShowNoteModal: (show: boolean) => void;
    setPendingNoteMarkupId: (id: string | null) => void;
}

export const useEventHandlers = ({
    refs, isAppReady, cullVisibleMarkups, setContextMenu,
    setCalibrationPoints, setShowCalibrationDialog, setCalibPixelDist,
    fitToScreen, renderCurrentDrawing, setShowNoteModal, setPendingNoteMarkupId
}: UseEventHandlersProps) => {
    const {
        appRef, mainContainerRef, themeRef, graphicsCacheRef, labelCacheRef,
        currentPointsRef, isDrawingRef, activeMarkupIdRef, snapPointRef,
        drawingLayerRef, cursorLayerRef, cursorGraphicsRef, cursorTextRef,
        cursorBadgeBgRef, calibPointsRef
    } = refs;

    // Interaction State Refs (must be at hook level to persist across re-renders)
    const isPanningRef = useRef(false);
    const lastPanPosRef = useRef({ x: 0, y: 0 });
    const isBoxSelectingRef = useRef(false);
    const boxStartRef = useRef({ x: 0, y: 0 });
    const isMovingSelectionRef = useRef(false);
    const moveStartPosRef = useRef({ x: 0, y: 0 });
    const isDraggingVertexRef = useRef(false);
    const dragVertexInfoRef = useRef<{ markupId: string; pathIdx: number; pointIdx: number } | null>(null);
    const dragVertexStartRef = useRef<{ x: number; y: number } | null>(null);

    // Highlight rectangle drag state refs
    const isHighlightDraggingRef = useRef(false);
    const highlightStartRef = useRef({ x: 0, y: 0 });
    const highlightMarkupIdRef = useRef<string | null>(null);

    const finishCurrentDrawing = useCallback(() => {
        const store = useProjectStore.getState();
        const pts = currentPointsRef.current;
        if (pts.length === 0) return;

        const tool = store.activeTool;
        const pageId = store.currentPageId || 'default';

        if (store.isCuttingOut && store.cutoutParentId) {
            if (pts.length >= 3) {
                const parentArea = store.currentProject?.markups[pageId]?.find(m => m.id === store.cutoutParentId);
                if (parentArea) {
                    const holeIndices = (parentArea.properties as any).holeIndices || [];
                    const updatedPaths = [...parentArea.paths, [...pts]];
                    const newHoleIndices = [...holeIndices, updatedPaths.length - 1];

                    store.updateMarkup(store.cutoutParentId, {
                        paths: updatedPaths,
                        properties: calculateMarkupProperties(updatedPaths, 'area', {
                            ...parentArea.properties,
                            holeIndices: newHoleIndices
                        })
                    });
                }
            }
            store.cancelCutout();
        } else if (activeMarkupIdRef.current) {
            const mId = activeMarkupIdRef.current;
            const m = store.currentProject?.markups[pageId]?.find(x => x.id === mId);
            if (m) {
                const minPts = (tool === 'area' || tool === 'highlight') ? 3 : 2;
                if (pts.length >= minPts) {

                    const updatedPaths = [...m.paths, [...pts]];
                    const newProps = calculateMarkupProperties(updatedPaths, tool as ToolType, m.properties);

                    // Zero-Validation Rule: If total value is 0 for measurement tools, delete the item entirely
                    if (['area', 'linear', 'segment'].includes(tool) && (newProps as any).value <= 0.0001) {
                        store.deleteMarkup(mId);
                        activeMarkupIdRef.current = null;
                        store.setRecordingMarkupId(null); // Stop recording if invalid
                    } else {
                        store.updateMarkup(mId, {
                            paths: updatedPaths,
                            properties: newProps
                        });
                    }
                } else if (m.paths.length === 0) {
                    store.deleteMarkup(mId);
                }
            }
        }

        currentPointsRef.current = [];
        isDrawingRef.current = false;

        // BATCHABLE TOOLS: Keep the ID active so next clicks append to same item
        // NON-BATCHABLE: Clear immediately
        const BATCHABLE_TOOLS: ToolType[] = ['area', 'linear', 'draw', 'segment'];
        const isBatchable = BATCHABLE_TOOLS.includes(tool);

        if (!isBatchable && !store.recordingMarkupId) {
            activeMarkupIdRef.current = null;
        }
        drawingLayerRef.current?.clear();
        useProjectStore.setState(s => ({ toolSessionId: s.toolSessionId + 1 }));
        cullVisibleMarkups();
    }, [refs, cullVisibleMarkups]);

    // KEYBOARD HANDLERS (extracted to separate hook for maintainability)
    useKeyboardHandlers({
        refs: {
            isDrawingRef,
            currentPointsRef,
            activeMarkupIdRef,
            drawingLayerRef
        },
        finishCurrentDrawing,
        fitToScreen,
        setContextMenu
    });

    // POINTER, WHEEL, CONTEXT MENU HANDLERS
    useEffect(() => {
        if (!isAppReady || !appRef.current || !mainContainerRef.current) return;

        const app = appRef.current;
        const mainContainer = mainContainerRef.current;

        // --- ZOOM HANDLER ---
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = app.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            const worldPosBefore = mainContainer.toLocal({ x: screenX, y: screenY });

            const ZOOM_FACTOR = 1.1;
            const direction = e.deltaY > 0 ? -1 : 1;
            let newScale = mainContainer.scale.x * (direction > 0 ? ZOOM_FACTOR : (1 / ZOOM_FACTOR));
            newScale = Math.max(0.1, Math.min(newScale, 20));

            mainContainer.scale.set(newScale);

            const newX = screenX - (worldPosBefore.x * newScale);
            const newY = screenY - (worldPosBefore.y * newScale);

            mainContainer.position.set(newX, newY);
            cullVisibleMarkups();
        };
        app.canvas.addEventListener('wheel', onWheel, { passive: false });

        // --- CONTEXT MENU ---
        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            const store = useProjectStore.getState();
            const pageId = store.currentPageId || 'default';
            const markups = store.currentProject?.markups[pageId] || [];

            const rect = app.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const worldPos = mainContainer.toLocal({ x: screenX, y: screenY });

            const zoom = mainContainer.scale.x;
            let hitFound = false;
            const SEGMENT_HIT_THRESHOLD = 5 / zoom;

            // Prioritize segment hits (Add Point)
            for (const m of markups) {
                if (m.type === 'legend') continue;
                for (let pathIdx = 0; pathIdx < m.paths.length; pathIdx++) {
                    if (['area', 'linear', 'segment', 'highlight'].includes(m.type)) {
                        const path = m.paths[pathIdx];
                        const isClosed = m.type === 'area' || m.type === 'highlight';
                        const segmentHit = getNearestSegment(worldPos, path, SEGMENT_HIT_THRESHOLD, isClosed);

                        if (segmentHit) {
                            setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                markupId: m.id,
                                pathIdx,
                                insertIndex: segmentHit.index,
                                insertPoint: segmentHit.point,
                                type: 'add_point'
                            });
                            hitFound = true;
                            break;
                        }
                    }
                }
                if (hitFound) break;
            }

            if (!hitFound) {
                // Fallback: Cutout check
                for (const m of markups) {
                    if (m.type === 'area' && m.paths.length > 0) {
                        const holeIndices = (m.properties as any).holeIndices || [];
                        let foundPathIdx = -1;

                        for (let i = 0; i < m.paths.length; i++) {
                            if (holeIndices.includes(i)) continue;
                            if (m.paths[i].length >= 3 && pointInPolygon(worldPos, m.paths[i])) {
                                foundPathIdx = i;
                                break;
                            }
                        }

                        if (foundPathIdx !== -1) {
                            setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                markupId: m.id,
                                type: 'area_context',
                                pathIdx: foundPathIdx,
                            });
                            hitFound = true;
                            break;
                        }
                    }
                }
            }

            if (!hitFound) setContextMenu(null);
        };
        app.canvas.addEventListener('contextmenu', onContextMenu);

        // --- DOUBLE CLICK ---
        const onDoubleClick = () => {
            if (isDrawingRef.current) {
                finishCurrentDrawing();
            }
        };
        app.canvas.addEventListener('dblclick', onDoubleClick);

        // --- POINTER EVENTS ---
        const onPointerDown = (e: PIXI.FederatedPointerEvent) => {
            const store = useProjectStore.getState();
            const tool = store.activeTool;

            // Pan
            const isPanAction = e.button === 1 || (e.button === 0 && (e.originalEvent as unknown as MouseEvent).altKey);
            if (isPanAction) {
                isPanningRef.current = true;
                lastPanPosRef.current = { x: e.global.x, y: e.global.y };
                app.canvas.style.cursor = 'grabbing';
                return;
            }

            if (e.button === 0) {
                const worldPos = mainContainer.toLocal(e.global);

                // Calibration
                if (store.isCalibrating) {
                    setCalibrationPoints((prev: Point[]) => {
                        const next = [...prev, worldPos];
                        if (next.length === 2) {
                            const dist = Math.hypot(next[0].x - next[1].x, next[0].y - next[1].y);
                            setCalibPixelDist(dist);
                            setShowCalibrationDialog(true);
                            return [];
                        }
                        return next;
                    });
                    return;
                }

                // Cutout Mode
                if (store.isCuttingOut && store.cutoutParentId) {
                    const clickPos = snapPointRef.current || { x: worldPos.x, y: worldPos.y };
                    currentPointsRef.current.push(clickPos);
                    isDrawingRef.current = true;
                    if (drawingLayerRef.current) {
                        renderCurrentDrawing(drawingLayerRef.current, currentPointsRef.current, 'area');
                    }
                    return;
                }

                // Selection & Interaction
                const pageId = store.currentPageId || 'default';
                const markups = store.currentProject?.markups[pageId] || [];
                const zoom = mainContainer.scale.x;
                const HIT_RADIUS = 5 / zoom;
                const VERTEX_HIT_RADIUS = 6 / zoom;

                // 1. Box Scaling Check (Legend & Highlight)
                let isScalingBox = false;
                let scalingBoxId: string | null = null;
                let scalingHandleIndex = -1;
                const HANDLE_SIZE = 10 / zoom;

                for (const id of store.selectedMarkupIds) {
                    const m = markups.find(x => x.id === id);
                    if (m && (m.type === 'legend' || m.type === 'highlight') && m.paths.length > 0 && m.paths[0].length >= 4) {
                        const p = m.paths[0];
                        const minX = Math.min(...p.map(pt => pt.x)), maxX = Math.max(...p.map(pt => pt.x));
                        const minY = Math.min(...p.map(pt => pt.y)), maxY = Math.max(...p.map(pt => pt.y));
                        const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
                        const handles = [
                            { cx: bounds.x, cy: bounds.y }, { cx: bounds.x + bounds.w / 2, cy: bounds.y },
                            { cx: bounds.x + bounds.w, cy: bounds.y }, { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h / 2 },
                            { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h }, { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h },
                            { cx: bounds.x, cy: bounds.y + bounds.h }, { cx: bounds.x, cy: bounds.y + bounds.h / 2 },
                        ];
                        for (let hi = 0; hi < handles.length; hi++) {
                            if (Math.abs(worldPos.x - handles[hi].cx) <= HANDLE_SIZE / 2 && Math.abs(worldPos.y - handles[hi].cy) <= HANDLE_SIZE / 2) {
                                isScalingBox = true;
                                scalingBoxId = id;
                                scalingHandleIndex = hi;
                                break;
                            }
                        }
                        if (isScalingBox) break;
                    }
                }

                if (isScalingBox && scalingBoxId) {
                    const currentMarkup = markups.find(x => x.id === scalingBoxId);
                    if (currentMarkup) {
                        const cp = currentMarkup.paths[0];
                        const minX = Math.min(...cp.map(pt => pt.x)), maxX = Math.max(...cp.map(pt => pt.x));
                        const minY = Math.min(...cp.map(pt => pt.y)), maxY = Math.max(...cp.map(pt => pt.y));
                        let bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
                        let lastScalePos = { x: worldPos.x, y: worldPos.y };
                        const handleIdx = scalingHandleIndex;
                        const boxId = scalingBoxId;
                        const gfx = graphicsCacheRef.current.get(boxId);

                        const onScaleMove = (ev: PIXI.FederatedPointerEvent) => {
                            const newWorldPos = mainContainer.toLocal(ev.global);
                            const dx = newWorldPos.x - lastScalePos.x, dy = newWorldPos.y - lastScalePos.y;
                            lastScalePos = { x: newWorldPos.x, y: newWorldPos.y };

                            if (handleIdx === 0) { bounds.x += dx; bounds.y += dy; bounds.w -= dx; bounds.h -= dy; }
                            else if (handleIdx === 2) { bounds.y += dy; bounds.w += dx; bounds.h -= dy; }
                            else if (handleIdx === 4) { bounds.w += dx; bounds.h += dy; }
                            else if (handleIdx === 6) { bounds.x += dx; bounds.w -= dx; bounds.h += dy; }
                            else if (handleIdx === 1) { bounds.y += dy; bounds.h -= dy; }
                            else if (handleIdx === 5) { bounds.h += dy; }
                            else if (handleIdx === 7) { bounds.x += dx; bounds.w -= dx; }
                            else if (handleIdx === 3) { bounds.w += dx; }

                            if (currentMarkup.type === 'legend') {
                                const itemCount = getAggregatedLegendItems(markups).length;
                                const minHeight = 30 + (itemCount * 15) + 20;
                                if (bounds.w < 160) bounds.w = 160;
                                if (bounds.h < minHeight) bounds.h = minHeight;
                            } else {
                                if (bounds.w < 10) bounds.w = 10;
                                if (bounds.h < 10) bounds.h = 10;
                            }

                            // Dynamic Cursor Logic
                            if (handleIdx === 0 || handleIdx === 4) app.canvas.style.cursor = 'nwse-resize';
                            else if (handleIdx === 2 || handleIdx === 6) app.canvas.style.cursor = 'nesw-resize';
                            else if (handleIdx === 1 || handleIdx === 5) app.canvas.style.cursor = 'ns-resize';
                            else if (handleIdx === 3 || handleIdx === 7) app.canvas.style.cursor = 'ew-resize';

                            if (gfx) {
                                gfx.clear();
                                gfx.moveTo(bounds.x, bounds.y).lineTo(bounds.x + bounds.w, bounds.y)
                                    .lineTo(bounds.x + bounds.w, bounds.y + bounds.h).lineTo(bounds.x, bounds.y + bounds.h).closePath();
                                const isDark = themeRef.current === 'dark';
                                if (currentMarkup.type === 'legend') {
                                    gfx.fill({ color: isDark ? 0x000000 : 0xffffff, alpha: 0.9 })
                                        .stroke({ width: 2, color: 0x2563eb });
                                } else {
                                    const props = currentMarkup.properties;
                                    const hColor = new PIXI.Color((props as any).color || 0xffff00).toNumber();
                                    const hAlpha = (props as any).alpha ?? 0.4;
                                    gfx.fill({ color: hColor, alpha: hAlpha })
                                        .stroke({ width: 2, color: 0x2563eb });
                                }
                            }
                        };
                        const onScaleEnd = () => {
                            app.stage.off('pointermove', onScaleMove);
                            app.stage.off('pointerup', onScaleEnd);
                            app.stage.off('pointerupoutside', onScaleEnd);
                            app.canvas.style.cursor = 'default';
                            const newPaths = [[
                                { x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.w, y: bounds.y },
                                { x: bounds.x + bounds.w, y: bounds.y + bounds.h }, { x: bounds.x, y: bounds.y + bounds.h }
                            ]];
                            store.updateMarkup(boxId, { paths: newPaths });
                        };
                        app.stage.on('pointermove', onScaleMove);
                        app.stage.on('pointerup', onScaleEnd);
                        app.stage.on('pointerupoutside', onScaleEnd);
                        return;
                    }
                }

                // 2. Vertex Dragging Check
                for (const id of store.selectedMarkupIds) {
                    const m = markups.find(x => x.id === id);
                    if (m && !['count', 'legend', 'draw', 'highlight'].includes(m.type)) {
                        for (let pathIdx = 0; pathIdx < m.paths.length; pathIdx++) {
                            for (let ptIdx = 0; ptIdx < m.paths[pathIdx].length; ptIdx++) {
                                const p = m.paths[pathIdx][ptIdx];
                                if (Math.hypot(worldPos.x - p.x, worldPos.y - p.y) <= VERTEX_HIT_RADIUS) {
                                    isDraggingVertexRef.current = true;
                                    dragVertexInfoRef.current = { markupId: id, pathIdx, pointIdx: ptIdx };
                                    dragVertexStartRef.current = { x: worldPos.x, y: worldPos.y };
                                    app.canvas.style.cursor = 'crosshair';
                                    return;
                                }
                            }
                        }
                    }
                }

                // 3. Markups Hit Test
                let hitMarkupId: string | null = null;
                let hitPointIndex: number | null = null;
                let hitPathIndex: number | null = null;

                // Label Hit Test (e.g. for Notes)
                const visibleIds = new Set(markups.map(m => m.id));

                labelCacheRef.current.forEach((label: PIXI.Text, key: string) => {
                    if (hitMarkupId || !label.visible) return;
                    const b = label.getBounds();
                    if (e.global.x >= b.minX && e.global.x <= b.maxX &&
                        e.global.y >= b.minY && e.global.y <= b.maxY) {

                        // Robust ID extraction
                        for (const vid of visibleIds) {
                            if (key === vid || key.startsWith(vid + '-')) {
                                hitMarkupId = vid;

                                // Extract path index from key
                                const suffix = key.slice(vid.length + 1);

                                // Check for standard area label format: "{id}-{pathIdx}"
                                // We check if suffix is purely numeric
                                if (/^\d+$/.test(suffix)) {
                                    hitPathIndex = parseInt(suffix, 10);
                                }
                                // Check for note format: "{id}-note-{pathIdx}" 
                                else if (key.includes('-note-')) {
                                    const parts = key.split('-note-');
                                    if (parts[1]) hitPathIndex = parseInt(parts[1], 10);
                                }
                                break;
                            }
                        }
                    }
                });

                for (let i = markups.length - 1; i >= 0; i--) {
                    const m = markups[i];
                    if (m.type === 'count' && m.paths.length > 0) {
                        for (let j = 0; j < m.paths[0].length; j++) {
                            if (Math.hypot(worldPos.x - m.paths[0][j].x, worldPos.y - m.paths[0][j].y) <= HIT_RADIUS) {
                                hitMarkupId = m.id;
                                hitPointIndex = j;
                                break;
                            }
                        }
                    } else if (m.type === 'legend' && m.paths.length > 0) {
                        const p = m.paths[0];
                        if (worldPos.x >= Math.min(p[0].x, p[2].x) && worldPos.x <= Math.max(p[0].x, p[2].x) &&
                            worldPos.y >= Math.min(p[0].y, p[2].y) && worldPos.y <= Math.max(p[0].y, p[2].y)) {
                            hitMarkupId = m.id;
                        }
                    } else {
                        // 1. Check Strokes (Lines) - Priority
                        for (let pathIdx = 0; pathIdx < m.paths.length; pathIdx++) {
                            const path = m.paths[pathIdx];
                            for (let j = 0; j < path.length - 1; j++) {
                                const p1 = path[j], p2 = path[j + 1];
                                const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
                                if (l2 === 0) continue;
                                let t = ((worldPos.x - p1.x) * (p2.x - p1.x) + (worldPos.y - p1.y) * (p2.y - p1.y)) / l2;
                                t = Math.max(0, Math.min(1, t));
                                const px = p1.x + t * (p2.x - p1.x), py = p1.y + t * (p2.y - p1.y);
                                if (Math.hypot(worldPos.x - px, worldPos.y - py) <= HIT_RADIUS) {
                                    hitMarkupId = m.id;
                                    hitPathIndex = pathIdx;
                                    break;
                                }
                            }
                            if (hitMarkupId) break;
                        }

                        // 2. Check Fills - Secondary
                        if (!hitMarkupId && (m.type === 'area' || m.type === 'highlight')) {
                            // Check if point is inside any additive path and NOT inside any hole (if we want strict donut selection)
                            // But keeping it simple: match existing logic but after strokes.
                            // We iterate paths. If we hit *any* path physically, we select it.
                            // Limitation: Clicking inside a hole (void) still selects the outer shape because it contains the point.
                            // To fix "clicking hole void shouldn't select", we'd need to subtract holes.
                            // But for now, user just asked to select LINEs.
                            for (let pathIdx = 0; pathIdx < m.paths.length; pathIdx++) {
                                const path = m.paths[pathIdx];
                                if (path.length >= 3 && pointInPolygon(worldPos, path)) {
                                    hitMarkupId = m.id;
                                    hitPathIndex = pathIdx;
                                    break;
                                }
                            }
                        }
                    }
                    if (hitMarkupId) break;
                }

                const isShift = (e.originalEvent as unknown as MouseEvent).shiftKey;

                if (hitMarkupId && tool === 'select') {
                    const currentSelIds = store.selectedMarkupIds;
                    const isAlreadySelected = currentSelIds.includes(hitMarkupId) &&
                        (hitPointIndex === null || (store.selectedPointIndices[hitMarkupId]?.includes(hitPointIndex))) &&
                        (hitPathIndex === null || !store.selectedShapeIndices[hitMarkupId] || store.selectedShapeIndices[hitMarkupId].length === 0 || store.selectedShapeIndices[hitMarkupId].includes(hitPathIndex));

                    if (isAlreadySelected && !isShift) {
                        isMovingSelectionRef.current = true;
                        moveStartPosRef.current = { x: worldPos.x, y: worldPos.y };
                        app.canvas.style.cursor = 'move';
                    } else {
                        if (isShift) {
                            if (hitPointIndex !== null) {
                                const existing = store.selectedPointIndices[hitMarkupId] || [];
                                const newIndices = existing.includes(hitPointIndex) ? existing.filter(x => x !== hitPointIndex) : [...existing, hitPointIndex];
                                store.setSelection([...new Set([...currentSelIds, hitMarkupId])], { ...store.selectedPointIndices, [hitMarkupId]: newIndices }, store.selectedShapeIndices);
                            } else if (hitPathIndex !== null) {
                                const existing = store.selectedShapeIndices[hitMarkupId] || [];
                                const newIndices = existing.includes(hitPathIndex) ? existing.filter(x => x !== hitPathIndex) : [...existing, hitPathIndex];
                                store.setSelection([...new Set([...currentSelIds, hitMarkupId])], store.selectedPointIndices, { ...store.selectedShapeIndices, [hitMarkupId]: newIndices });
                            } else {
                                store.setSelection([...new Set([...currentSelIds, hitMarkupId])], store.selectedPointIndices, store.selectedShapeIndices);
                            }
                        } else {
                            if (hitPointIndex !== null) store.setSelection([hitMarkupId], { [hitMarkupId]: [hitPointIndex] }, {});
                            else if (hitPathIndex !== null) store.setSelection([hitMarkupId], {}, { [hitMarkupId]: [hitPathIndex] });
                            else store.setSelection([hitMarkupId], {}, {});
                            isMovingSelectionRef.current = true;
                            moveStartPosRef.current = { x: worldPos.x, y: worldPos.y };
                        }
                    }
                    return;
                } else if (tool === 'select') {
                    isBoxSelectingRef.current = true;
                    boxStartRef.current = { x: worldPos.x, y: worldPos.y };
                    return;
                } else if (tool === 'highlight') {
                    // Highlight tool: Rectangle drag mode (like selection box)
                    isHighlightDraggingRef.current = true;
                    highlightStartRef.current = { x: worldPos.x, y: worldPos.y };

                    // Create the highlight markup immediately
                    const newId = crypto.randomUUID();
                    highlightMarkupIdRef.current = newId;
                    store.addMarkup({
                        id: newId,
                        type: 'highlight',
                        paths: [],
                        properties: (store.toolDefaults as any).highlight,
                        pageId
                    });
                    return;
                }

                // DRAWING LOGIC (New Item)
                isDrawingRef.current = true;
                const clickPos = snapPointRef.current || { x: worldPos.x, y: worldPos.y };
                currentPointsRef.current.push(clickPos);

                let markupId = activeMarkupIdRef.current;
                if (!markupId) {
                    const currentRecordingId = store.recordingMarkupId;
                    if (currentRecordingId) {
                        markupId = currentRecordingId;
                        activeMarkupIdRef.current = markupId;
                    } else {
                        const newId = crypto.randomUUID();
                        markupId = newId;
                        activeMarkupIdRef.current = markupId;
                        store.addMarkup({
                            id: newId, type: tool, paths: [], properties: (store.toolDefaults as any)[tool], pageId
                        });
                    }
                }

                if (tool === 'count') {
                    const freshStore = useProjectStore.getState();
                    const m = freshStore.currentProject?.markups[pageId]?.find(x => x.id === markupId);
                    if (m) {
                        const existingPaths = m.paths.length > 0 ? m.paths : [[]];
                        const updatedPaths = [[...existingPaths[0], clickPos], ...existingPaths.slice(1)];
                        freshStore.updateMarkup(markupId, { paths: updatedPaths, properties: calculateMarkupProperties(updatedPaths, tool, freshStore.toolDefaults[tool as ToolType]) });
                    }
                    currentPointsRef.current = [];
                    isDrawingRef.current = false;
                } else if (tool === 'ruler' && currentPointsRef.current.length === 2) {
                    const p1 = currentPointsRef.current[0];
                    const p2 = currentPointsRef.current[1];
                    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                    if (dist > 0.1) {
                        store.updateMarkup(markupId, { paths: [[p1, p2]] });
                    } else {
                        store.deleteMarkup(markupId);
                    }

                    currentPointsRef.current = [];
                    activeMarkupIdRef.current = null;
                    isDrawingRef.current = false;
                    drawingLayerRef.current?.clear();
                    useProjectStore.setState(s => ({ toolSessionId: s.toolSessionId + 1 }));
                } else if ((tool === 'note' || tool === 'segment') && currentPointsRef.current.length === 2) {
                    const m = store.currentProject?.markups[pageId]?.find(x => x.id === markupId);
                    if (m) {
                        const updatedPaths = [...m.paths, [...currentPointsRef.current]];
                        const newProps = calculateMarkupProperties(updatedPaths, tool, m.properties);

                        // Zero-Validation for Segment
                        if (tool === 'segment' && (newProps as any).value <= 0.0001) {
                            store.deleteMarkup(markupId);
                            activeMarkupIdRef.current = null; // Reset since it's gone
                        } else {
                            store.updateMarkup(markupId, {
                                paths: updatedPaths,
                                properties: newProps
                            });

                            if (tool === 'note') {
                                setPendingNoteMarkupId(markupId);
                                setShowNoteModal(true);
                                store.setActiveTool('select');
                                store.setRecordingMarkupId(null);
                                activeMarkupIdRef.current = null;
                            }
                        }
                    }
                    currentPointsRef.current = [];
                    isDrawingRef.current = false;
                    drawingLayerRef.current?.clear();
                    if (!['area', 'linear', 'highlight', 'draw', 'segment', 'note'].includes(tool) && !store.recordingMarkupId) {
                        activeMarkupIdRef.current = null;
                    }
                } else {
                    renderCurrentDrawing(drawingLayerRef.current!, currentPointsRef.current, tool);
                }
            }
        };
        app.stage.on('pointerdown', onPointerDown);

        const onPointerMove = (e: PIXI.FederatedPointerEvent) => {
            const store = useProjectStore.getState();
            const tool = store.activeTool;

            if (isPanningRef.current) {
                const dx = e.global.x - lastPanPosRef.current.x;
                const dy = e.global.y - lastPanPosRef.current.y;
                mainContainer.position.x += dx;
                mainContainer.position.y += dy;
                lastPanPosRef.current = { x: e.global.x, y: e.global.y };
                cullVisibleMarkups();
                return;
            }

            const worldPos = mainContainer.toLocal(e.global);

            if (isBoxSelectingRef.current) {
                const g = drawingLayerRef.current!;
                g.clear();
                const x = Math.min(boxStartRef.current.x, worldPos.x);
                const y = Math.min(boxStartRef.current.y, worldPos.y);
                const w = Math.abs(worldPos.x - boxStartRef.current.x);
                const h = Math.abs(worldPos.y - boxStartRef.current.y);
                g.rect(x, y, w, h).fill({ color: 0x3b82f6, alpha: 0.2 }).stroke({ width: 1, color: 0x3b82f6 });
                return;
            }

            if (isHighlightDraggingRef.current) {
                const g = drawingLayerRef.current!;
                g.clear();
                const x = Math.min(highlightStartRef.current.x, worldPos.x);
                const y = Math.min(highlightStartRef.current.y, worldPos.y);
                const w = Math.abs(worldPos.x - highlightStartRef.current.x);
                const h = Math.abs(worldPos.y - highlightStartRef.current.y);
                const props = store.toolDefaults.highlight;
                const highlightColor = new PIXI.Color(props.color || 0xffff00).toNumber();
                const highlightAlpha = props.alpha ?? 0.4;
                g.rect(x, y, w, h).fill({ color: highlightColor, alpha: highlightAlpha }).stroke({ width: 1, color: highlightColor });
                return;
            }

            if (isMovingSelectionRef.current) {
                const g = drawingLayerRef.current!;
                g.clear();
                g.moveTo(moveStartPosRef.current.x, moveStartPosRef.current.y).lineTo(worldPos.x, worldPos.y)
                    .stroke({ width: 1, color: themeRef.current === 'dark' ? 0xffffff : 0x000000, alpha: 0.5 });
                return;
            }

            if (isDraggingVertexRef.current && dragVertexInfoRef.current && dragVertexStartRef.current) {
                const g = drawingLayerRef.current!;
                g.clear();
                const dx = worldPos.x - dragVertexStartRef.current.x;
                const dy = worldPos.y - dragVertexStartRef.current.y;
                const m = store.currentProject?.markups[store.currentPageId || 'default']?.find(x => x.id === dragVertexInfoRef.current!.markupId);
                if (m) {
                    const path = m.paths[dragVertexInfoRef.current.pathIdx];
                    const previewPath = path.map((p, i) => i === dragVertexInfoRef.current!.pointIdx ? { x: p.x + dx, y: p.y + dy } : p);
                    g.moveTo(previewPath[0].x, previewPath[0].y);
                    for (let i = 1; i < previewPath.length; i++) g.lineTo(previewPath[i].x, previewPath[i].y);
                    if (m.type === 'area') g.closePath();
                    g.stroke({ width: 1, color: 0x2563eb, alpha: 0.8 });
                }
                return;
            }

            // Snap & Cursor
            const isDrawingTool = tool !== 'select';
            let effectivePos = { x: worldPos.x, y: worldPos.y };
            if (isDrawingTool || store.isCalibrating) {
                const pageId = store.currentPageId || 'default';
                const markups = store.currentProject?.markups[pageId] || [];
                const snapPoint = findSnapPoint({ x: worldPos.x, y: worldPos.y }, markups);
                snapPointRef.current = snapPoint;
                if (snapPoint) effectivePos = snapPoint;
            } else {
                snapPointRef.current = null;
            }

            // Update Crosshair
            const cursorContainer = cursorLayerRef.current;
            const cursorG = cursorGraphicsRef.current;
            const cursorText = cursorTextRef.current;
            const cursorBadge = cursorBadgeBgRef.current;

            if (cursorContainer && cursorG && cursorText && cursorBadge) {
                cursorContainer.visible = true;
                const screenPos = mainContainer.toGlobal(effectivePos);
                cursorContainer.position.set(screenPos.x, screenPos.y);
                cursorG.clear();

                const screenW = app.screen.width, screenH = app.screen.height;
                const reticleRadius = 26;
                const isDark = themeRef.current === 'dark';
                const mainColor = isDark ? 0xffffff : 0x000000;

                cursorG.circle(0, 0, 14).stroke({ width: 2, color: mainColor, alpha: 0.8 });
                // Small crosshair inside circle
                cursorG.moveTo(-10, 0).lineTo(10, 0);
                cursorG.moveTo(0, -10).lineTo(0, 10);
                cursorG.moveTo(0, -reticleRadius).lineTo(0, -screenPos.y);
                cursorG.moveTo(0, reticleRadius).lineTo(0, screenH - screenPos.y);
                cursorG.moveTo(-reticleRadius, 0).lineTo(-screenPos.x, 0);
                cursorG.moveTo(reticleRadius, 0).lineTo(screenW - screenPos.x, 0);
                cursorG.stroke({ width: 1, color: mainColor, alpha: 0.2 });

                if (snapPointRef.current) cursorG.rect(-3, -3, 6, 6).fill({ color: 0x10b981 });

                // Badge Logic
                let badgeText = "";
                let showBadge = false;
                if (isDrawingRef.current && currentPointsRef.current.length > 0) {
                    const lastPt = currentPointsRef.current[currentPointsRef.current.length - 1];
                    const ppf = store.getPageScale(store.currentPageId || 'default').pixelsPerFoot;
                    const distFt = Math.hypot(effectivePos.x - lastPt.x, effectivePos.y - lastPt.y) / ppf;
                    badgeText = formatArchitectural(distFt);
                    showBadge = true;
                }

                if (showBadge) {
                    cursorText.text = badgeText;
                    cursorText.visible = true;
                    cursorBadge.visible = true;
                    cursorText.position.set(15, 15);
                    cursorBadge.clear().rect(11, 11, cursorText.width + 8, cursorText.height + 8)
                        .fill({ color: isDark ? 0x262626 : 0xffffff, alpha: 0.9 })
                        .stroke({ width: 1, color: isDark ? 0x525252 : 0xe5e5e5 });
                } else {
                    cursorText.visible = false;
                    cursorBadge.visible = false;
                }
            }

            // Drawing Previews
            if (store.isCalibrating && calibPointsRef.current.length === 1) {
                const preview = [...calibPointsRef.current, effectivePos];
                drawingLayerRef.current!.clear().moveTo(preview[0].x, preview[0].y).lineTo(preview[1].x, preview[1].y).stroke({ width: 2, color: 0x3b82f6 });
            } else if (isDrawingRef.current) {
                if (tool === 'draw') {
                    const lastPt = currentPointsRef.current[currentPointsRef.current.length - 1];
                    if (lastPt && Math.hypot(worldPos.x - lastPt.x, worldPos.y - lastPt.y) > 5) {
                        currentPointsRef.current.push({ x: worldPos.x, y: worldPos.y });
                        renderCurrentDrawing(drawingLayerRef.current!, currentPointsRef.current, tool);
                    }
                } else if (currentPointsRef.current.length > 0) {
                    const preview = [...currentPointsRef.current, effectivePos];
                    renderCurrentDrawing(drawingLayerRef.current!, preview, tool);
                }
            }
        };
        app.stage.on('pointermove', onPointerMove);

        const onPointerUp = () => {
            const store = useProjectStore.getState();
            const tool = store.activeTool;

            if (isDrawingRef.current && tool === 'draw') {
                if (currentPointsRef.current.length > 1) {
                    const mId = activeMarkupIdRef.current;
                    const m = store.currentProject?.markups[store.currentPageId || 'default']?.find(x => x.id === mId);
                    if (m) {
                        const updatedPaths = [...m.paths, [...currentPointsRef.current]];
                        store.updateMarkup(mId!, { paths: updatedPaths, properties: calculateMarkupProperties(updatedPaths, tool, store.toolDefaults.draw) });
                    }
                }
                currentPointsRef.current = [];
                isDrawingRef.current = false;
                drawingLayerRef.current?.clear();

                // Auto-exit recording for draw tool
                store.setRecordingMarkupId(null);
                store.setActiveTool('select');
                activeMarkupIdRef.current = null;
            }

            if (isBoxSelectingRef.current) {
                isBoxSelectingRef.current = false;
                drawingLayerRef.current?.clear();
                const endPos = mainContainer.toLocal(app.renderer.events.pointer.global);
                const dist = Math.hypot(endPos.x - boxStartRef.current.x, endPos.y - boxStartRef.current.y);
                if (dist < 5 / mainContainer.scale.x) {
                    store.setSelectedMarkupIds([]);
                } else {
                    const minX = Math.min(boxStartRef.current.x, endPos.x), maxX = Math.max(boxStartRef.current.x, endPos.x);
                    const minY = Math.min(boxStartRef.current.y, endPos.y), maxY = Math.max(boxStartRef.current.y, endPos.y);
                    const markups = store.currentProject?.markups[store.currentPageId || 'default'] || [];
                    const ids: string[] = [];
                    const shapeIndices: Record<string, number[]> = {};
                    const pointIndices: Record<string, number[]> = {};

                    markups.forEach(m => {
                        if (m.type === 'count' && m.paths.length > 0) {
                            // For count, we check points
                            const pointsInBox: number[] = [];
                            m.paths[0].forEach((p, idx) => {
                                if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
                                    pointsInBox.push(idx);
                                }
                            });

                            if (pointsInBox.length > 0) {
                                ids.push(m.id);
                                const markupPoints = store.selectedPointIndices[m.id] || [];
                                pointIndices[m.id] = [...new Set([...markupPoints, ...pointsInBox])];
                            }
                        } else {
                            // Area, Linear, etc. - check each path
                            const indicesInBox: number[] = [];
                            m.paths.forEach((p, pIdx) => {
                                // Accuracy Fix: Instead of Bounding Box intersection, check if at least one point is inside the selection box.
                                // This prevents "over-selection" when the selection box is near but not touching the shape.
                                const isAnyPointInBox = p.some(pt =>
                                    pt.x >= minX && pt.x <= maxX &&
                                    pt.y >= minY && pt.y <= maxY
                                );

                                if (isAnyPointInBox) {
                                    indicesInBox.push(pIdx);
                                }
                            });

                            if (indicesInBox.length > 0) {
                                ids.push(m.id);
                                shapeIndices[m.id] = indicesInBox;
                            }
                        }
                    });

                    if (ids.length > 0) {
                        store.setSelection(ids, pointIndices, shapeIndices);
                    } else {
                        store.setSelectedMarkupIds([]);
                    }
                }
            }

            if (isHighlightDraggingRef.current && highlightMarkupIdRef.current) {
                isHighlightDraggingRef.current = false;
                drawingLayerRef.current?.clear();
                const endPos = mainContainer.toLocal(app.renderer.events.pointer.global);
                const dist = Math.hypot(endPos.x - highlightStartRef.current.x, endPos.y - highlightStartRef.current.y);

                if (dist < 10 / mainContainer.scale.x) {
                    // Too small, delete the markup
                    store.deleteMarkup(highlightMarkupIdRef.current);
                } else {
                    // Create rectangle path (4 corners)
                    const x = Math.min(highlightStartRef.current.x, endPos.x);
                    const y = Math.min(highlightStartRef.current.y, endPos.y);
                    const w = Math.abs(endPos.x - highlightStartRef.current.x);
                    const h = Math.abs(endPos.y - highlightStartRef.current.y);

                    const rectPath = [
                        { x: x, y: y },
                        { x: x + w, y: y },
                        { x: x + w, y: y + h },
                        { x: x, y: y + h }
                    ];

                    store.updateMarkup(highlightMarkupIdRef.current, {
                        paths: [rectPath],
                        properties: { ...store.toolDefaults.highlight }
                    });

                    // Trigger re-render and select the new highlight
                    store.setSelectedMarkupIds([highlightMarkupIdRef.current]);
                    store.setActiveTool('select'); // Switch to select after highlighting
                    useProjectStore.setState(s => ({ toolSessionId: s.toolSessionId + 1 }));
                    cullVisibleMarkups();
                }

                highlightMarkupIdRef.current = null;
                cullVisibleMarkups();
            }

            if (isMovingSelectionRef.current) {
                isMovingSelectionRef.current = false;
                app.canvas.style.cursor = 'default';
                drawingLayerRef.current?.clear();
                const worldPos = mainContainer.toLocal(app.renderer.events.pointer.global);
                const dx = worldPos.x - moveStartPosRef.current.x, dy = worldPos.y - moveStartPosRef.current.y;
                if (dx !== 0 || dy !== 0) store.moveSelection({ x: dx, y: dy });
            }

            if (isDraggingVertexRef.current) {
                isDraggingVertexRef.current = false;
                app.canvas.style.cursor = 'default';
                drawingLayerRef.current?.clear();
                const worldPos = mainContainer.toLocal(app.renderer.events.pointer.global);
                const dx = worldPos.x - dragVertexStartRef.current!.x, dy = worldPos.y - dragVertexStartRef.current!.y;
                if (dx !== 0 || dy !== 0) {
                    store.moveVertex(dragVertexInfoRef.current!.markupId, dragVertexInfoRef.current!.pathIdx, dragVertexInfoRef.current!.pointIdx, { x: dx, y: dy });
                    store.setActiveTool('select');
                    store.setRecordingMarkupId(null);
                    activeMarkupIdRef.current = null;
                }
                dragVertexInfoRef.current = null;
                dragVertexStartRef.current = null;
            }

            if (isPanningRef.current) {
                isPanningRef.current = false;
                app.canvas.style.cursor = 'default';
            }
        };
        app.stage.on('pointerup', onPointerUp);
        app.stage.on('pointerupoutside', onPointerUp);

        return () => {
            app.canvas.removeEventListener('wheel', onWheel);
            app.canvas.removeEventListener('contextmenu', onContextMenu);
            app.canvas.removeEventListener('dblclick', onDoubleClick);
            app.stage.off('pointerdown', onPointerDown);
            app.stage.off('pointermove', onPointerMove);
            app.stage.off('pointerup', onPointerUp);
            app.stage.off('pointerupoutside', onPointerUp);
        };
    }, [isAppReady, cullVisibleMarkups, setContextMenu, setCalibrationPoints, setShowCalibrationDialog, setCalibPixelDist, renderCurrentDrawing, refs]);
};
