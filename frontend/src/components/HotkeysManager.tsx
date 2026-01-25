import React, { useEffect } from 'react';
import { useProjectStore } from '../stores/useProjectStore';

export const HotkeysManager: React.FC = () => {
    const {
        setActiveTool,
        activeTool, // New
        lastActiveTool, // New
        undo,
        redo,
        currentProject,
        currentPageId,
        setCurrentPageId,
        deleteMarkup,
        selectedMarkupIds,
        setSelectedMarkupIds, // New
        copySelection,
        paste,
        toggleCutoutMode, // New
        isCutoutMode, // New
        // Scale Selection
        highlightScaleSelector,
        setHighlightScaleSelector,
        // Project File Actions
        saveProjectToFile,
        saveProjectAs,
        openProjectFile
    } = useProjectStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // --- TOOLS ---
            if (e.key === '1') setActiveTool('area');
            if (e.key === '2') setActiveTool('linear');
            if (e.key === '3') setActiveTool('segment');
            if (e.key === '4') setActiveTool('count');
            if (e.key === '5') setActiveTool('note');

            if (e.key.toLowerCase() === 'v') setActiveTool('select');
            // Scale and Dimension mapped to segment for now, or TODO
            // if (e.key.toLowerCase() === 's') setActiveTool('scale');
            // if (e.key.toLowerCase() === 'd') setActiveTool('dimension');

            // --- ADVANCED TOOL ACTIONS ---

            // Toggle Record (R): Swaps between last active tool and Select
            if (e.key.toLowerCase() === 'r') {
                if (activeTool === 'select' && lastActiveTool !== 'select') {
                    setActiveTool(lastActiveTool);
                } else if (activeTool !== 'select') {
                    setActiveTool('select');
                }
            }

            // Cut Out / Deduction (X): Only works if Area tool is active
            if (e.key.toLowerCase() === 'x') {
                if (activeTool === 'area') {
                    toggleCutoutMode();
                }
            }

            // Finish Shape (C): Usually handled in canvas by double click, but we can have a global listener
            // Ideally this should trigger a "finalize" action in the store/canvas.
            // For now, we'll leave it as a placeholder or implement if we move drawing state to store.
            // if (e.key.toLowerCase() === 'c') { ... }

            // Cancel / Deselect (Esc)
            if (e.key === 'Escape') {
                e.preventDefault();
                // First priority: cancel scale selection highlight
                if (highlightScaleSelector) {
                    setHighlightScaleSelector(false);
                } else if (isCutoutMode) {
                    toggleCutoutMode();
                } else if (selectedMarkupIds.length > 0) {
                    setSelectedMarkupIds([]);
                } else if (activeTool !== 'select') {
                    setActiveTool('select');
                }
            }

            // Cancel with C key (when not a modifier key press)
            if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
                // Cancel scale selection highlight with C
                if (highlightScaleSelector) {
                    e.preventDefault();
                    setHighlightScaleSelector(false);
                }
            }

            // --- ACTIONS ---
            // Undo: Cmd+Z
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Cmd+Shift+Z
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
                e.preventDefault();
                redo();
            }

            // Copy: Cmd+C
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                copySelection();
            }
            // Paste: Cmd+V
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                paste();
            }
            // Save: Cmd+S
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
                e.preventDefault();
                console.log('[Hotkeys] Save triggered (Ctrl+S)');
                saveProjectToFile();
            }
            // Save As: Cmd+Shift+S
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && e.shiftKey) {
                e.preventDefault();
                console.log('[Hotkeys] Save As triggered (Ctrl+Shift+S)');
                saveProjectAs();
            }
            // Open: Cmd+O
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                console.log('[Hotkeys] Open triggered (Ctrl+O)');
                openProjectFile();
            }

            // Delete: Backspace
            if (e.key === 'Backspace' || e.key === 'Delete') {
                selectedMarkupIds.forEach(id => deleteMarkup(id));
            }

            // Finish Shape: C (Handled in Canvas via dblclick, but can force finish here?)
            // Usually context dependent.

            // Toggle Record: R
            // if (e.key.toLowerCase() === 'r') { ... }

            // --- NAVIGATION ---
            // Next/Prev Page
            if (e.key === 'PageDown') {
                e.preventDefault();
                navigatePage(1);
            }
            if (e.key === 'PageUp') {
                e.preventDefault();
                navigatePage(-1);
            }

            // Zoom: +, - (Handled usually by canvas, but can invoke global zoom actions if exposed)
            // Zoom to Fit: F7
            // Toggle View: F12
        };

        const navigatePage = (delta: number) => {
            if (!currentProject || !currentPageId) return;
            // Parse "pdfId:pageIndex"
            const parts = currentPageId.split(':');
            if (parts.length < 2) return;

            const pdfId = parts[0];
            const pageIndex = parseInt(parts[1], 10);

            const pdf = currentProject.pdfs.find(p => p.id === pdfId);
            if (!pdf) return;

            let newIndex = pageIndex + delta;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= pdf.pageCount) newIndex = pdf.pageCount - 1;

            if (newIndex !== pageIndex) {
                setCurrentPageId(`${pdfId}:${newIndex}`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveTool, undo, redo, currentProject, currentPageId, setCurrentPageId, deleteMarkup, selectedMarkupIds, copySelection, paste, saveProjectToFile, saveProjectAs, openProjectFile, highlightScaleSelector, setHighlightScaleSelector]);

    return null;
};
