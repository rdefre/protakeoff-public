
import { type StateCreator } from 'zustand';
import { type ProjectState, type ToolDefaults, type ToolType, type PageScale, type Markup } from '../../types/store';
import type { SearchHitQuad } from '../../types/search';

// Helper: Get defaults based on system
const defaultColors = {
    segment: '#ef4444',
    linear: '#ef4444',
    area: '#3b82f6',
    count: '#10b981',
    note: '#f59e0b',
    draw: '#000000',
    highlight: '#ffff00',
};

const defaultMeasurementProps = {
    name: 'New Measurement',
    color: defaultColors.segment,
    value: 0,
    unit: 'm' as const, // Default, will be overridden
    variables: [],
    formula: '',
    subItems: [],
    unitCost: 0,
    group: '',
};

const getInitialToolDefaults = (system: 'imperial' | 'metric'): ToolDefaults => {
    const unit = system === 'imperial' ? 'ft' : 'm';
    const areaUnit = system === 'imperial' ? 'ft²' : 'm²';

    return {
        segment: { ...defaultMeasurementProps, name: 'Segment measurement', color: defaultColors.segment, unit },
        linear: { ...defaultMeasurementProps, name: 'Linear measurement', color: defaultColors.linear, unit },
        area: { ...defaultMeasurementProps, name: 'Area', color: defaultColors.area, unit: areaUnit },
        count: { name: 'Count', count: 0, shape: 'circle', color: defaultColors.count, group: '', unitCost: 0, unit: 'ea' },
        note: { text: '', fontSize: 14, color: defaultColors.note },
        draw: { thickness: 2, color: defaultColors.draw },
        highlight: { name: 'Highlight', color: defaultColors.highlight, alpha: 0.5 },
        legend: { title: 'Legend', showTitle: true, fontSize: 12, color: '#000000' },
        ruler: { ...defaultMeasurementProps, name: 'Measurement', color: defaultColors.segment, unit },
        select: {},
    };
};

const getInitialPreferences = () => {
    try {
        const stored = localStorage.getItem('protakeoff_prefs');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                measurementSystem: parsed.measurementSystem || 'imperial',
                pageViewMode: parsed.pageViewMode || 'list',
                thumbnailSize: parsed.thumbnailSize || 100,
            };
        }
    } catch (e) {
        console.error('Failed to load preferences', e);
    }
    return { measurementSystem: 'imperial' as const, pageViewMode: 'list' as const, thumbnailSize: 100 };
};


// Tools that require page scale calibration before use
const SCALE_REQUIRED_TOOLS: ToolType[] = ['segment', 'linear', 'area'];

export interface UiSlice {
    // State
    activeTool: ToolType;
    lastActiveTool: ToolType;
    sidebarView: 'projects' | 'pages' | 'tools' | 'estimates' | 'properties' | 'templates' | null;
    sidebarCollapsed: boolean;
    bottomPanelOpen: boolean;
    showWelcomeModal: boolean;
    showNewProjectWizard: boolean;
    showScaleRequiredWarning: boolean; // Shows when trying to use measurement tools without scale
    highlightScaleSelector: boolean; // Highlights the scale selector in red when scale is required
    showLicenseModal: boolean;
    toolSessionId: number;

    preferences: {
        measurementSystem: 'imperial' | 'metric';
        pageViewMode: 'list' | 'thumbnail';
        thumbnailSize: number;
    };
    toolDefaults: ToolDefaults;
    isCalibrating: boolean;

    // Actions
    setActiveTool: (tool: ToolType) => void;
    setSidebarView: (view: 'projects' | 'pages' | 'tools' | 'estimates' | 'properties' | 'templates' | null) => void;
    toggleSidebar: () => void;
    toggleBottomPanel: () => void;
    setShowWelcomeModal: (show: boolean) => void;
    setShowNewProjectWizard: (show: boolean) => void;
    setShowLicenseModal: (show: boolean) => void;
    dismissScaleRequiredWarning: () => void;
    setHighlightScaleSelector: (highlight: boolean) => void;

    setMeasurementSystem: (system: 'imperial' | 'metric') => void;
    setPageViewMode: (mode: 'list' | 'thumbnail') => void;
    setThumbnailSize: (size: number) => void;

    updateToolDefault: <T extends ToolType>(tool: T, updates: Partial<ToolDefaults[T]>) => void;

    // Scale Actions
    setPageScale: (pageId: string, scale: PageScale) => void;
    calibratePage: (pageId: string, pixelDist: number, realDist: number, realUnit: 'ft' | 'm' | 'in' | 'cm') => void;
    getPageScale: (pageId: string) => PageScale;
    setIsCalibrating: (calibrating: boolean) => void;

    // Legend Actions
    toggleLegend: () => void;
    hasLegendForPage: (pageId: string) => boolean;

    // Search Actions
    searchHighlights: SearchHitQuad[];
    setSearchHighlights: (highlights: SearchHitQuad[]) => void;
    clearSearchHighlights: () => void;
}

export const createUiSlice: StateCreator<
    ProjectState,
    [],
    [],
    UiSlice
> = (set, get) => ({
    activeTool: 'select',
    lastActiveTool: 'select',
    sidebarView: 'tools',
    sidebarCollapsed: false,
    bottomPanelOpen: true,
    showWelcomeModal: false,
    showNewProjectWizard: false,
    showScaleRequiredWarning: false,
    highlightScaleSelector: false,
    showLicenseModal: false,
    toolSessionId: 0,

    preferences: getInitialPreferences(),
    toolDefaults: getInitialToolDefaults(getInitialPreferences().measurementSystem),
    isCalibrating: false,
    searchHighlights: [],

    setActiveTool: (tool) => {
        const state = get();

        console.log('[setActiveTool] Tool:', tool, 'SCALE_REQUIRED_TOOLS:', SCALE_REQUIRED_TOOLS);

        // Check if this tool requires page scale calibration
        if (SCALE_REQUIRED_TOOLS.includes(tool)) {
            const pageId = state.currentPageId || 'default';
            const scale = state.currentProject?.pageMetadata?.[pageId]?.scale;

            console.log('[setActiveTool] Scale check - pageId:', pageId, 'scale:', scale);

            // If no scale set at all (undefined means user never set a scale for this page)
            if (!scale) {
                console.log('[setActiveTool] No scale set! Showing warning dialog.');
                set({ showScaleRequiredWarning: true });
                return; // Don't activate the tool
            }
        }

        set({
            activeTool: tool,
            lastActiveTool: state.activeTool !== 'select' ? state.activeTool : state.lastActiveTool,
            isCutoutMode: false,
            recordingMarkupId: null,
            toolSessionId: state.toolSessionId + 1
        });
    },

    setSidebarView: (view) => set({ sidebarView: view }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
    setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),
    setShowNewProjectWizard: (show) => set({ showNewProjectWizard: show }),
    setShowLicenseModal: (show) => set({ showLicenseModal: show }),
    dismissScaleRequiredWarning: () => set({ showScaleRequiredWarning: false }),
    setHighlightScaleSelector: (highlight) => set({ highlightScaleSelector: highlight }),

    setMeasurementSystem: (system) => set((state) => {
        const newPrefs = { ...state.preferences, measurementSystem: system };
        localStorage.setItem('protakeoff_prefs', JSON.stringify(newPrefs));

        const unit = system === 'imperial' ? 'ft' : 'm';
        const areaUnit = system === 'imperial' ? 'ft²' : 'm²';

        const newDefaults = { ...state.toolDefaults };
        newDefaults.segment.unit = unit;
        newDefaults.linear.unit = unit;
        newDefaults.area.unit = areaUnit;

        return { preferences: newPrefs, toolDefaults: newDefaults };
    }),

    setPageViewMode: (mode) => set((state) => {
        const newPrefs = { ...state.preferences, pageViewMode: mode };
        localStorage.setItem('protakeoff_prefs', JSON.stringify(newPrefs));
        return { preferences: newPrefs };
    }),

    setThumbnailSize: (size) => set((state) => {
        const newPrefs = { ...state.preferences, thumbnailSize: size };
        localStorage.setItem('protakeoff_prefs', JSON.stringify(newPrefs));
        return { preferences: newPrefs };
    }),

    updateToolDefault: (tool, updates) => set((state) => ({
        toolDefaults: {
            ...state.toolDefaults,
            [tool]: { ...state.toolDefaults[tool], ...updates },
        },
    })),

    setPageScale: (pageId, scale) => set((state) => {
        if (!state.currentProject) return {};
        const newMeta = {
            ...state.currentProject.pageMetadata,
            [pageId]: {
                ...state.currentProject.pageMetadata[pageId],
                scale
            }
        };
        const newProject = {
            ...state.currentProject,
            pageMetadata: newMeta,
            updatedAt: new Date().toISOString()
        };
        return { currentProject: newProject };
    }),

    calibratePage: (pageId, pixelDist, realDist, realUnit) => set((state) => {
        if (!state.currentProject) return {};

        let distInFeet = realDist;
        if (realUnit === 'in') distInFeet = realDist / 12;
        else if (realUnit === 'm') distInFeet = realDist * 3.28084;
        else if (realUnit === 'cm') distInFeet = realDist * 0.0328084;

        if (distInFeet <= 0 || pixelDist <= 0) return {};

        const ppf = pixelDist / distInFeet;

        const newScale: PageScale = {
            pixelsPerFoot: ppf,
            id: 'custom',
            category: 'custom',
            displayUnit: 'ft',
            name: 'Custom Calibration'
        };

        const newMeta = {
            ...state.currentProject.pageMetadata,
            [pageId]: {
                ...state.currentProject.pageMetadata[pageId],
                scale: newScale
            }
        };

        return {
            currentProject: {
                ...state.currentProject,
                pageMetadata: newMeta,
                updatedAt: new Date().toISOString()
            }
        };
    }),

    getPageScale: (pageId) => {
        const { currentProject } = get();
        return currentProject?.pageMetadata?.[pageId]?.scale || {
            pixelsPerFoot: 1,
            name: '1:1 (Default)',
            id: 'default',
            category: 'custom',
            displayUnit: 'ft'
        };
    },

    setIsCalibrating: (calibrating) => set({ isCalibrating: calibrating }),

    toggleLegend: () => {
        const { currentProject, currentPageId, toolDefaults, addMarkup, deleteMarkup } = get();
        if (!currentProject || !currentPageId) return;

        const pageMarkups = currentProject.markups[currentPageId] || [];
        const existingLegend = pageMarkups.find(m => m.type === 'legend');

        if (existingLegend) {
            deleteMarkup(existingLegend.id);
        } else {
            const legendDefaults = toolDefaults.legend;
            // Default position and size
            const x = 50;
            const y = 50;
            const w = 300;
            const h = 400;

            const newLegend: Markup = {
                id: crypto.randomUUID(),
                type: 'legend',
                pageId: currentPageId,
                paths: [[
                    { x, y },
                    { x: x + w, y },
                    { x: x + w, y: y + h },
                    { x, y: y + h }
                ]],
                properties: {
                    ...legendDefaults,
                    color: legendDefaults.color || '#000000',
                    hidden: false
                }
            };

            addMarkup(newLegend);
        }
    },

    hasLegendForPage: (pageId) => {
        const { currentProject } = get();
        if (!currentProject) return false;
        const markups = currentProject.markups[pageId] || [];
        return markups.some(m => m.type === 'legend');
    },

    // Search
    setSearchHighlights: (highlights) => set({ searchHighlights: highlights }),
    clearSearchHighlights: () => set({ searchHighlights: [] }),
});
