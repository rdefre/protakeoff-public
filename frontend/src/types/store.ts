import type { PageScale, PageCalibration } from '../utils/scales';
import type { SearchHitQuad } from './search';
export type { PageScale, PageCalibration };

export type ToolType = 'select' | 'segment' | 'linear' | 'area' | 'count' | 'note' | 'draw' | 'highlight' | 'legend' | 'ruler';

export interface Point {
    x: number;
    y: number;
}

// Expanded UnitType to support all metrics requested
export type UnitType =
    | 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi' // Linear
    | 'mm²' | 'cm²' | 'm²' | 'ha' | 'km²' | 'in²' | 'ft²' | 'yd²' | 'ac' | 'mi²'; // Area
export type ShapeType = 'circle' | 'square' | 'triangle';

export interface BaseProperties {
    color: string;
    alpha?: number;
    hidden?: boolean;
}

// Item Properties Interfaces
export interface ItemVariable {
    id: string;
    name: string;
    value: number;
    unit: string;
}

export interface ItemSubItem {
    id: string;
    name: string;
    quantityFormula: string;
    unit: string;
    unitPrice: number;
}

export interface MeasurementProperties extends BaseProperties {
    name: string;
    value: number; // length or area
    unit: UnitType;
    deduction?: boolean; // New: For Cut Out mode (Area only)
    showLabel?: boolean; // Show label on canvas (default true)

    // New Properties
    variables: ItemVariable[];
    formula: string;
    subItems: ItemSubItem[];
    unitCost: number;
    group: string;
}

export interface ItemTemplate {
    id: string;
    name: string;
    description?: string;
    toolType: ToolType;
    properties: Partial<MeasurementProperties>;
}

export interface CountProperties extends BaseProperties {
    name: string;
    count: number;
    shape: ShapeType;
    group: string;
    unitCost?: number;
    unit: string;
}

export interface NoteProperties extends BaseProperties {
    text: string;
    fontSize: number;
    color: string;
}

export interface DrawProperties extends BaseProperties {
    thickness: number;
    color: string;
}

export interface HighlightProperties extends BaseProperties {
    name: string;
    color: string;
}

export interface LegendProperties extends BaseProperties {
    title: string;
    showTitle: boolean;
    // We can add configuration here like "includeQuantities", "includeNames", etc.
    fontSize: number;
}

export interface Markup {
    id: string;
    type: ToolType;
    paths: Point[][]; // Refactored from points: Point[] to support multi-part items
    properties: MeasurementProperties | CountProperties | NoteProperties | DrawProperties | HighlightProperties | LegendProperties;
    pageId: string;
}

// Type guards for safer property access
// These allow type-safe access instead of using 'as any' casts

export function isMeasurementMarkup(m: Markup): m is Markup & { properties: MeasurementProperties } {
    return ['area', 'linear', 'segment', 'ruler'].includes(m.type);
}

export function isCountMarkup(m: Markup): m is Markup & { properties: CountProperties } {
    return m.type === 'count';
}

export function isNoteMarkup(m: Markup): m is Markup & { properties: NoteProperties } {
    return m.type === 'note';
}

export function isDrawMarkup(m: Markup): m is Markup & { properties: DrawProperties } {
    return m.type === 'draw';
}

export function isHighlightMarkup(m: Markup): m is Markup & { properties: HighlightProperties } {
    return m.type === 'highlight';
}

export function isLegendMarkup(m: Markup): m is Markup & { properties: LegendProperties } {
    return m.type === 'legend';
}

export interface PdfFile {
    id: string;
    name: string;
    pageCount: number;
    url: string;          // Blob URL for displaying in canvas
    path?: string;        // Local file path (required for backend re-hydration)
    fileSize?: number;    // File size in bytes
    thumbnails?: string[]; // Base64 PNG thumbnails for each page (cached for sidebar)
    ingestionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

// Page-level metadata including scale and calibration
export interface PageMetadata {
    scale?: PageScale;            // Selected or calibrated scale
    calibration?: PageCalibration; // Manual calibration data if used
    name?: string;                // Custom page name (optional)
}

export interface Project {
    id: string;
    name: string;
    pdfs: PdfFile[];
    // Index by Page ID for O(1) access. Key: "pdfId:pageIndex" or "default"
    markups: Record<string, Markup[]>;
    // Per-page scale metadata. Key: pageId
    pageMetadata: Record<string, PageMetadata>;
    createdAt: string;
    updatedAt: string; // Last modification timestamp
    // DEPRECATED: legend prop replaced by native Markup logic
}

export interface ToolDefaults {
    segment: MeasurementProperties;
    linear: MeasurementProperties;
    area: MeasurementProperties;
    count: CountProperties;
    note: NoteProperties;
    draw: DrawProperties;
    highlight: HighlightProperties;
    legend: LegendProperties;
    ruler: MeasurementProperties;
    select: {}; // No defaults needed
}

export type ExtendedTemplate = ItemTemplate & { category: string; source: 'bundled' | 'remote' };

export interface ProjectState {
    // Current state
    currentProject: Project | null;
    projects: Project[];
    currentPageId: string | null;
    activeTool: ToolType;
    lastActiveTool: ToolType; // New: For toggling record (R)
    selectedMarkupIds: string[];
    selectedPointIndices: Record<string, number[]>; // For selecting specific points in Count/Poly
    selectedShapeIndices: Record<string, number[]>; // For selecting specific shapes/paths within an item
    isCutoutMode: boolean; // New: Deduction mode status
    cutoutParentId: string | null; // Area ID being cut out from
    isCuttingOut: boolean; // Actively drawing a cutout

    // Session State
    toolSessionId: number; // Increment to signal tool re-activation / new item start

    // Tool Defaults
    toolDefaults: ToolDefaults;

    // User Preferences
    preferences: {
        measurementSystem: 'imperial' | 'metric';
        pageViewMode: 'list' | 'thumbnail';
        thumbnailSize: number; // 60-200px
    };

    // UI state
    sidebarView: 'projects' | 'pages' | 'tools' | 'estimates' | 'properties' | 'templates' | null;
    sidebarCollapsed: boolean;
    bottomPanelOpen: boolean;
    recordingMarkupId: string | null; // Tracks current markup being batch-recorded
    showWelcomeModal: boolean; // New: Global state for Welcome/Projects modal
    showNewProjectWizard: boolean; // New: Global state for New Project Wizard
    showScaleRequiredWarning: boolean; // Shows when trying to use measurement tools without scale
    highlightScaleSelector: boolean; // Highlights the scale selector in red when scale is required
    showLicenseModal: boolean;

    // Project File State (for .ptf files)
    projectFilePath: string | null; // Path to the currently loaded .ptf file
    hasUnsavedChanges: boolean;     // Dirty flag for "Save" vs "Save As" logic

    // Loading States
    isLoadingProject: boolean;   // True while loading a project
    isUploadingPdfs: boolean;    // True while uploading PDFs
    isSaving: boolean;           // True while saving project

    // History State
    history: {
        past: Project[];
        future: Project[];
    };

    // Clipboard State
    clipboard: Markup[] | null;

    // Search State
    searchHighlights: SearchHitQuad[];

    // Actions
    setCurrentProject: (project: Project | null) => void;
    setCurrentPageId: (pageId: string | null) => void;

    // Preference Actions
    setMeasurementSystem: (system: 'imperial' | 'metric') => void;

    setActiveTool: (tool: ToolType) => void;
    continueRecording: (markupId: string) => void;
    setRecordingMarkupId: (id: string | null) => void;
    toggleCutoutMode: () => void; // New
    startCutout: (areaId: string) => void; // Enter cutout drawing mode for specific area
    cancelCutout: () => void; // Exit cutout mode
    setSelectedMarkupIds: (ids: string[]) => void;
    setSidebarView: (view: 'projects' | 'pages' | 'tools' | 'estimates' | 'properties' | 'templates' | null) => void;
    toggleSidebar: () => void;
    toggleBottomPanel: () => void;
    refreshProjects: () => void;
    setShowWelcomeModal: (show: boolean) => void;
    setShowNewProjectWizard: (show: boolean) => void;
    setShowLicenseModal: (show: boolean) => void;
    dismissScaleRequiredWarning: () => void;
    setHighlightScaleSelector: (highlight: boolean) => void;
    setPageViewMode: (mode: 'list' | 'thumbnail') => void;
    setThumbnailSize: (size: number) => void;

    // Tool Property Actions
    updateToolDefault: <T extends ToolType>(tool: T, updates: Partial<ToolDefaults[T]>) => void;

    // Markup Actions
    addMarkup: (markup: Markup) => void;
    updateMarkup: (id: string, updates: Partial<Markup> | Partial<Markup['properties']>) => void; // Support both
    deleteMarkup: (id: string) => void;

    // Legend Actions
    toggleLegend: () => void;
    toggleMarkupVisibility: (id: string) => void;
    hasLegendForPage: (pageId: string) => boolean;

    // History Actions
    undo: () => void;
    redo: () => void;

    // Clipboard Actions
    copySelection: () => void;
    paste: () => void;

    // Project actions
    createProject: (name: string, initialPdfs?: PdfFile[]) => void;
    saveProject: () => void;
    loadProject: (id: string) => void;
    deleteProject: (id: string) => void;
    getProjectList: () => Project[];
    addPdf: (pdf: PdfFile) => void;
    uploadPdfs: (files: (File | { path: string, name: string, size?: number })[]) => Promise<void>;
    renamePdf: (pdfId: string, name: string) => void; // New Action
    updatePdf: (pdfId: string, updates: Partial<PdfFile>) => void; // General update action
    renamePage: (pageId: string, name: string) => void; // New Action

    // Project File Actions (.ptf files)
    saveProjectToFile: () => Promise<boolean>;       // Save to existing path or prompt for new
    saveProjectAs: () => Promise<boolean>;           // Always prompt for save location
    openProjectFile: () => Promise<void>;         // Open .ptf file dialog
    setProjectFilePath: (path: string | null) => void;
    markAsClean: () => void;

    // Advanced Selection Actions
    setSelection: (ids: string[], indices?: Record<string, number[]>, shapeIndices?: Record<string, number[]>) => void;
    deleteSelection: () => void;
    moveSelection: (delta: { x: number; y: number }) => void;
    moveVertex: (markupId: string, pathIdx: number, pointIdx: number, delta: { x: number; y: number }) => void;

    // Scale Actions
    setPageScale: (pageId: string, scale: PageScale) => void;
    calibratePage: (pageId: string, pixelDist: number, realDist: number, realUnit: 'ft' | 'm' | 'in' | 'cm') => void;
    getPageScale: (pageId: string) => PageScale;
    isCalibrating: boolean;
    setIsCalibrating: (calibrating: boolean) => void;

    // Search Actions
    setSearchHighlights: (highlights: SearchHitQuad[]) => void;
    clearSearchHighlights: () => void;

    // Templates
    templates: ExtendedTemplate[];
    isLoadingTemplates: boolean;
    selectedTemplateCategory: string;
    setSelectedTemplateCategory: (category: string) => void;
    addTemplate: (template: ItemTemplate) => void;
    updateTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
    deleteTemplate: (id: string) => void;
    loadTemplates: () => Promise<void>;
}
