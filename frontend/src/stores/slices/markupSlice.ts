
import { type StateCreator } from 'zustand';
import { type ProjectState, type Markup, type BaseProperties, type Project } from '../../types/store';
import { markupManager } from '../../utils/MarkupManager';
import { persistenceManager } from '../../utils/PersistenceManager';
import { calculateMarkupProperties } from '../../utils/measurement';
import { pointInPolygon } from '../../utils/geometry';
import { getHistoryManager } from '../../utils/HistoryManager';

const historyManager = getHistoryManager<Project>(100);

const COLOR_PALETTE = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e',
];

export interface MarkupSlice {
    // State
    selectedMarkupIds: string[];
    selectedPointIndices: Record<string, number[]>;
    selectedShapeIndices: Record<string, number[]>;
    clipboard: Markup[] | null;
    isCutoutMode: boolean;
    cutoutParentId: string | null;
    isCuttingOut: boolean;
    recordingMarkupId: string | null;

    // Actions
    addMarkup: (markup: Markup) => void;
    updateMarkup: (id: string, updates: Partial<Markup> | Partial<Markup['properties']>) => void;
    deleteMarkup: (id: string) => void;
    toggleMarkupVisibility: (id: string) => void;

    setSelectedMarkupIds: (ids: string[]) => void;
    setSelection: (ids: string[], indices?: Record<string, number[]>, shapeIndices?: Record<string, number[]>) => void;
    deleteSelection: () => void;
    moveSelection: (delta: { x: number; y: number }) => void;
    moveVertex: (markupId: string, pathIdx: number, pointIdx: number, delta: { x: number; y: number }) => void;

    copySelection: () => void;
    paste: () => void;

    toggleCutoutMode: () => void;
    startCutout: (areaId: string) => void;
    cancelCutout: () => void;
    continueRecording: (markupId: string) => void;
    setRecordingMarkupId: (id: string | null) => void;
}

export const createMarkupSlice: StateCreator<
    ProjectState,
    [],
    [],
    MarkupSlice
> = (set, _get) => ({
    selectedMarkupIds: [],
    selectedPointIndices: {},
    selectedShapeIndices: {},
    clipboard: null,
    isCutoutMode: false,
    cutoutParentId: null,
    isCuttingOut: false,
    recordingMarkupId: null,

    setRecordingMarkupId: (id) => set({ recordingMarkupId: id }),

    addMarkup: (markup) => set((state) => {
        if (!state.currentProject) return {};
        const pageId = markup.pageId || 'default';
        const pageMarkups = state.currentProject.markups[pageId] || [];

        const newMarkupsMap = {
            ...state.currentProject.markups,
            [pageId]: [...pageMarkups, markup]
        };

        const newProject: Project = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: newMarkupsMap
        };

        markupManager.markAdded(markup.id);
        historyManager.push(state.currentProject, newProject, 'addMarkup');
        persistenceManager.queueSave(newProject);

        // Pick a random color for the NEXT item of this type
        let newToolDefaults = state.toolDefaults;
        if (markup.type !== 'select' && 'color' in markup.properties) {
            const currentColor = (markup.properties as BaseProperties).color;
            let nextColor = currentColor;

            // Try to find a different random color
            if (COLOR_PALETTE.length > 1) {
                const available = COLOR_PALETTE.filter(c => c !== currentColor);
                nextColor = available[Math.floor(Math.random() * available.length)];
            }

            newToolDefaults = {
                ...state.toolDefaults,
                [markup.type]: {
                    ...state.toolDefaults[markup.type],
                    color: nextColor
                }
            };
        }

        return { currentProject: newProject, toolDefaults: newToolDefaults };
    }),

    updateMarkup: (id, updates) => set((state) => {
        if (!state.currentProject) return {};

        const pageId = state.currentPageId || 'default';
        let pageMarkups = state.currentProject.markups[pageId];
        let foundPageId = pageId;

        if (!pageMarkups?.find(m => m.id === id)) {
            foundPageId = Object.keys(state.currentProject.markups).find(pid =>
                state.currentProject!.markups[pid].some(m => m.id === id)
            ) || pageId;
            pageMarkups = state.currentProject.markups[foundPageId];
        }

        if (!pageMarkups) return {};

        const index = pageMarkups.findIndex(m => m.id === id);
        if (index === -1) return {};

        const currentMarkup = pageMarkups[index];
        let newMarkup: Markup;

        const isMarkupUpdate = 'paths' in updates || 'type' in updates || 'pageId' in updates || 'properties' in updates;

        if (isMarkupUpdate) {
            const markupUpdates = updates as Partial<Markup>;
            newMarkup = {
                ...currentMarkup,
                ...markupUpdates,
                properties: markupUpdates.properties
                    ? { ...currentMarkup.properties, ...markupUpdates.properties }
                    : currentMarkup.properties
            };
        } else {
            newMarkup = {
                ...currentMarkup,
                properties: { ...currentMarkup.properties, ...(updates as any) }
            };
        }

        const newPageMarkups = [...pageMarkups];
        newPageMarkups[index] = newMarkup;

        const newProject: Project = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: {
                ...state.currentProject.markups,
                [foundPageId]: newPageMarkups
            }
        };

        markupManager.markDirty(id);
        historyManager.push(state.currentProject, newProject, 'updateMarkup');
        persistenceManager.queueSave(newProject);

        return { currentProject: newProject };
    }),

    deleteMarkup: (id) => set((state) => {
        if (!state.currentProject) return {};

        const pageId = state.currentPageId || 'default';
        let foundPageId = pageId;

        const markups = state.currentProject.markups;
        let targetList = markups[pageId];

        if (!targetList?.some(m => m.id === id)) {
            foundPageId = Object.keys(markups).find(pid => markups[pid].some(m => m.id === id)) || pageId;
            targetList = markups[foundPageId];
        }

        if (!targetList) return {};

        const newPageMarkups = targetList.filter(m => m.id !== id);
        const newProject = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: {
                ...markups,
                [foundPageId]: newPageMarkups
            }
        };

        markupManager.markDeleted(id);
        historyManager.push(state.currentProject, newProject, 'deleteMarkup');
        persistenceManager.queueSave(newProject);

        return { currentProject: newProject };
    }),

    toggleMarkupVisibility: (id) => set((state) => {
        if (!state.currentProject) return {};
        const pageId = state.currentPageId || 'default';
        let foundPageId = pageId;
        const markups = state.currentProject.markups;
        let targetList = markups[pageId];

        if (!targetList?.some(m => m.id === id)) {
            foundPageId = Object.keys(markups).find(pid => markups[pid].some(m => m.id === id)) || pageId;
            targetList = markups[foundPageId];
        }

        if (!targetList) return {};
        const index = targetList.findIndex(m => m.id === id);
        if (index === -1) return {};

        const current = targetList[index];
        const hidden = !(current.properties as BaseProperties).hidden;

        const newMarkup = { ...current, properties: { ...current.properties, hidden } };
        const newPageMarkups = [...targetList];
        newPageMarkups[index] = newMarkup;

        const newProject = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: { ...markups, [foundPageId]: newPageMarkups }
        };

        markupManager.markDirty(id);
        persistenceManager.queueSave(newProject);

        return { currentProject: newProject };
    }),

    setSelectedMarkupIds: (ids) => set({
        selectedMarkupIds: ids,
        selectedPointIndices: {},
        selectedShapeIndices: {}
    }),

    setSelection: (ids, indices = {}, shapeIndices = {}) => set({
        selectedMarkupIds: ids,
        selectedPointIndices: indices,
        selectedShapeIndices: shapeIndices
    }),

    deleteSelection: () => set((state) => {
        if (!state.currentProject || state.selectedMarkupIds.length === 0) return {};
        const pageId = state.currentPageId || 'default';
        const pageMarkups = state.currentProject.markups[pageId] || [];

        // Re-implementing selection delete logic
        let newPageMarkups = [...pageMarkups];
        const idsToRemove: string[] = [];
        const idsDirty: string[] = [];

        state.selectedMarkupIds.forEach(id => {
            const ptIndices = state.selectedPointIndices[id];
            const shIndices = state.selectedShapeIndices[id];
            const mIndex = newPageMarkups.findIndex(m => m.id === id);

            if (mIndex === -1) return;
            const m = newPageMarkups[mIndex];

            const hasPointSel = ptIndices && ptIndices.length > 0;
            const hasShapeSel = shIndices && shIndices.length > 0;

            if (!hasPointSel && !hasShapeSel) {
                idsToRemove.push(id);
                return;
            }

            // Logic for partial deletes (points/shapes)
            let modified = false;
            let newPaths = m.paths;

            if (m.type === 'count' && hasPointSel) {
                if (m.paths.length > 0) {
                    const newPoints = m.paths[0].filter((_, i) => !ptIndices.includes(i));
                    if (newPoints.length === 0) idsToRemove.push(id);
                    else {
                        newPaths = [newPoints, ...m.paths.slice(1)];
                        modified = true;
                    }
                }
            } else if (hasShapeSel) {
                newPaths = m.paths.filter((_, i) => !shIndices.includes(i));
                if (newPaths.length === 0) idsToRemove.push(id);
                else modified = true;
            } else if (hasPointSel) {
                // For 'note' type, any vertex deletion should remove the entire markup
                // as the text and line are intrinsically linked.
                if (m.type === 'note') {
                    idsToRemove.push(id);
                } else {
                    newPaths = m.paths.map(path =>
                        path.filter((_, i) => !ptIndices.includes(i))
                    ).filter(p => p.length >= (m.type === 'area' ? 3 : 2)); // Min points verification

                    if (newPaths.length === 0) idsToRemove.push(id);
                    else modified = true;
                }
            }

            if (modified && !idsToRemove.includes(id)) {
                newPageMarkups[mIndex] = {
                    ...m,
                    paths: newPaths,
                    properties: calculateMarkupProperties(newPaths, m.type, m.properties)
                };
                idsDirty.push(id);
            }
        });

        newPageMarkups = newPageMarkups.filter(m => !idsToRemove.includes(m.id));

        const newProject = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: {
                ...state.currentProject.markups,
                [pageId]: newPageMarkups
            }
        };

        idsToRemove.forEach(id => markupManager.markDeleted(id));
        idsDirty.forEach(id => markupManager.markDirty(id));
        historyManager.push(state.currentProject, newProject, 'deleteSelection');
        persistenceManager.queueSave(newProject);

        return {
            currentProject: newProject,
            selectedMarkupIds: [],
            selectedPointIndices: {},
            selectedShapeIndices: {}
        };
    }),

    moveSelection: (delta) => set((state) => {
        if (!state.currentProject || state.selectedMarkupIds.length === 0) return {};
        const pageId = state.currentPageId || 'default';
        const pageMarkups = state.currentProject.markups[pageId] || [];

        const newPageMarkups = pageMarkups.map(m => {
            if (state.selectedMarkupIds.includes(m.id)) {
                // Check if specific shapes are selected
                const specificShapes = state.selectedShapeIndices[m.id];
                const holeIndices = (m.properties as any).holeIndices || [];

                // Identify which additive shapes are being moved
                const movingAdditiveIndices = new Set<number>();
                m.paths.forEach((_, idx) => {
                    // Default: if no specific selection -> All move.
                    // If specific selection -> Check inclusion.
                    // Also ensure it is NOT a hole (additive only for parenting check)
                    const explicitlySelected = !specificShapes || specificShapes.length === 0 || specificShapes.includes(idx);
                    if (explicitlySelected && !holeIndices.includes(idx)) {
                        movingAdditiveIndices.add(idx);
                    }
                });

                const newPaths = m.paths.map((path, idx) => {
                    // Holes should NOT move independently - only with their parent
                    // Skip if this is a hole and it's explicitly selected (not auto-moved with parent)
                    if (holeIndices.includes(idx)) {
                        // Only move if parent is moving (auto-move logic handles this case)
                        if (specificShapes && specificShapes.includes(idx)) {
                            // Hole is explicitly selected - don't allow independent whole-shape movement
                            return path;
                        }
                        // Check if should auto-move with parent
                        if (path.length > 0) {
                            const samplePoint = path[0];
                            for (const parentIdx of movingAdditiveIndices) {
                                if (m.paths[parentIdx].length >= 3 && pointInPolygon(samplePoint, m.paths[parentIdx])) {
                                    return path.map(pt => ({ x: pt.x + delta.x, y: pt.y + delta.y }));
                                }
                            }
                        }
                        return path;
                    }

                    // Non-hole paths: move if selected
                    const shouldMove = !specificShapes || specificShapes.length === 0 || specificShapes.includes(idx);
                    if (shouldMove) {
                        const selectedPoints = state.selectedPointIndices[m.id];
                        if (selectedPoints && selectedPoints.length > 0) {
                            return path.map((pt, pIdx) => {
                                if (selectedPoints.includes(pIdx)) {
                                    return { x: pt.x + delta.x, y: pt.y + delta.y };
                                }
                                return pt;
                            });
                        }
                        return path.map(pt => ({ x: pt.x + delta.x, y: pt.y + delta.y }));
                    }
                    return path;
                });

                markupManager.markDirty(m.id);
                return { ...m, paths: newPaths };
            }
            return m;
        });

        const newProject = {
            ...state.currentProject,
            markups: { ...state.currentProject.markups, [pageId]: newPageMarkups }
        };

        historyManager.push(state.currentProject, newProject, 'moveSelection');
        persistenceManager.queueSave(newProject);

        return { currentProject: newProject };
    }),

    moveVertex: (markupId, pathIdx, pointIdx, delta) => set((state) => {
        if (!state.currentProject) return {};
        const pageId = state.currentPageId || 'default';
        const pageMarkups = state.currentProject.markups[pageId] || [];

        const index = pageMarkups.findIndex(m => m.id === markupId);
        if (index === -1) return {};

        const m = pageMarkups[index];
        const newPaths = [...m.paths];
        if (!newPaths[pathIdx]) return {};

        newPaths[pathIdx] = [...newPaths[pathIdx]];
        const pt = newPaths[pathIdx][pointIdx];
        let newX = pt.x + delta.x;
        let newY = pt.y + delta.y;

        // If this is a hole, clamp the new position to stay inside the parent shape
        const holeIndices = (m.properties as any).holeIndices || [];
        if (holeIndices.includes(pathIdx)) {
            // Find parent shape (first additive path that contains this point)
            for (let i = 0; i < m.paths.length; i++) {
                if (i === pathIdx || holeIndices.includes(i)) continue;
                if (m.paths[i].length >= 3 && pointInPolygon(pt, m.paths[i])) {
                    // Check if new position would be outside parent
                    if (!pointInPolygon({ x: newX, y: newY }, m.paths[i])) {
                        // Cancel the move - keep original position
                        return {};
                    }
                    break;
                }
            }
        }

        newPaths[pathIdx][pointIdx] = { x: newX, y: newY };

        const newMarkup = {
            ...m,
            paths: newPaths,
            properties: calculateMarkupProperties(newPaths, m.type, m.properties)
        };
        markupManager.markDirty(markupId);

        const newPageMarkups = [...pageMarkups];
        newPageMarkups[index] = newMarkup;

        const newProject = {
            ...state.currentProject,
            markups: { ...state.currentProject.markups, [pageId]: newPageMarkups }
        };

        historyManager.push(state.currentProject, newProject, 'moveVertex');
        persistenceManager.queueSave(newProject);

        return {
            currentProject: newProject
        };
    }),

    copySelection: () => set((state) => {
        if (!state.currentProject || state.selectedMarkupIds.length === 0) return { clipboard: null };
        const pageId = state.currentPageId || 'default';
        const markups = state.currentProject.markups[pageId] || [];
        const selected = markups.filter(m => state.selectedMarkupIds.includes(m.id));
        return { clipboard: selected };
    }),

    paste: () => set((state) => {
        if (!state.currentProject || !state.clipboard) return {};
        const pageId = state.currentPageId || 'default';
        const pageMarkups = state.currentProject.markups[pageId] || [];

        // Offset pasted items
        const newMarkups = state.clipboard.map(m => ({
            ...m,
            id: crypto.randomUUID(),
            pageId: pageId,
            paths: m.paths.map(path => path.map(pt => ({ x: pt.x + 20, y: pt.y + 20 })))
        }));

        const newProject = {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            markups: {
                ...state.currentProject.markups,
                [pageId]: [...pageMarkups, ...newMarkups]
            }
        };

        newMarkups.forEach(m => markupManager.markAdded(m.id));
        historyManager.push(state.currentProject, newProject, 'paste');
        persistenceManager.queueSave(newProject);

        return {
            currentProject: newProject,
            selectedMarkupIds: newMarkups.map(m => m.id),
            selectedPointIndices: {},
            selectedShapeIndices: {}
        };
    }),

    toggleCutoutMode: () => set((state) => ({
        isCutoutMode: state.activeTool === 'area' ? !state.isCutoutMode : false
    })),

    startCutout: (areaId) => set({
        cutoutParentId: areaId,
        isCuttingOut: true,
        activeTool: 'area',
        selectedMarkupIds: [areaId]
    }),

    cancelCutout: () => set({
        cutoutParentId: null,
        isCuttingOut: false
    }),

    continueRecording: (markupId) => set((state) => {
        if (!state.currentProject) return {};
        const pageId = state.currentPageId || 'default';
        const markups = state.currentProject.markups[pageId] || [];
        const markup = markups.find(m => m.id === markupId);
        if (!markup) return {};

        return {
            activeTool: markup.type,
            recordingMarkupId: markupId,
            toolSessionId: state.toolSessionId + 1,
            lastActiveTool: state.activeTool !== 'select' ? state.activeTool : state.lastActiveTool,
        };
    }),
});
