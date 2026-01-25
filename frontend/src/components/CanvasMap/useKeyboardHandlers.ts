/**
 * useKeyboardHandlers - Keyboard event handling for the CanvasMap
 * 
 * Extracted from useEventHandlers.ts for better code organization.
 * Handles: Enter (finish), Escape/C (cancel), N (complete shape), 
 * Delete/Backspace (delete), F (fit to screen), Arrow keys (nudge)
 */

import { useEffect, type RefObject } from 'react';
import type { Point, ContextMenuState } from './types';
import { useProjectStore } from '../../stores/useProjectStore';
import * as PIXI from 'pixi.js';

interface KeyboardHandlerRefs {
    isDrawingRef: RefObject<boolean>;
    currentPointsRef: RefObject<Point[]>;
    activeMarkupIdRef: RefObject<string | null>;
    drawingLayerRef: RefObject<PIXI.Graphics | null>;
}

interface UseKeyboardHandlersProps {
    refs: KeyboardHandlerRefs;
    finishCurrentDrawing: () => void;
    fitToScreen: () => void;
    setContextMenu: (state: ContextMenuState | null) => void;
}

export const useKeyboardHandlers = ({
    refs,
    finishCurrentDrawing,
    fitToScreen,
    setContextMenu
}: UseKeyboardHandlersProps) => {
    const { isDrawingRef, currentPointsRef, activeMarkupIdRef, drawingLayerRef } = refs;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const store = useProjectStore.getState();

            // Handle completion with Enter
            if (e.key === 'Enter' && isDrawingRef.current) {
                finishCurrentDrawing();
                return;
            }

            // ESC: Cancel drawing / Deselect
            if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;

                // Clear any active drawing session (persistent or active)
                store.setRecordingMarkupId(null);
                activeMarkupIdRef.current = null;

                if (isDrawingRef.current) {
                    isDrawingRef.current = false;
                    currentPointsRef.current = [];
                    drawingLayerRef.current?.clear();

                    if (store.isCuttingOut) {
                        store.cancelCutout();
                        return;
                    }
                }

                if (store.selectedMarkupIds.length > 0) {
                    store.setSelectedMarkupIds([]); // Deselect all
                } else if (store.activeTool !== 'select') {
                    store.setActiveTool('select');
                }
                setContextMenu(null);
            }

            // COMPLETE SHAPE (n)
            if (e.key.toLowerCase() === 'n' && isDrawingRef.current) {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                finishCurrentDrawing();
            }

            // DELETE / BACKSPACE
            if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedMarkupIds.length > 0) {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;

                store.deleteSelection();
                store.setSelectedMarkupIds([]);
            }

            // AUTO-FIT (f)
            if (e.key.toLowerCase() === 'f') {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                fitToScreen();
            }

            // ARROW KEYS (Nudge)
            if (store.selectedMarkupIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const step = e.shiftKey ? 10 : 1;
                let dx = 0, dy = 0;
                if (e.key === 'ArrowUp') dy = -step;
                if (e.key === 'ArrowDown') dy = step;
                if (e.key === 'ArrowLeft') dx = -step;
                if (e.key === 'ArrowRight') dx = step;

                store.moveSelection({ x: dx, y: dy });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [finishCurrentDrawing, fitToScreen, setContextMenu, isDrawingRef, currentPointsRef, activeMarkupIdRef, drawingLayerRef]);
};
