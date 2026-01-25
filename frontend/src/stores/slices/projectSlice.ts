
import { type StateCreator } from 'zustand';
import { type ProjectState, type Project, type PdfFile } from '../../types/store';
import { persistenceManager } from '../../utils/PersistenceManager';
import { serializeProject, deserializeProject } from '../../utils/projectFileUtils';
import { save, open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { getHistoryManager } from '../../utils/HistoryManager';
import { buildProtocolUrl } from '../../utils/platformUrl';

// Initialize history manager (lazy init if needed, but here we can't easily)
// Actually we need to share history manager.
// For now, let's keep history manager usage within the slices or pass it in?
// The original store had it at top level. We can keep it outside or use a shared one.
// Let's import the getter.
const historyManager = getHistoryManager<Project>(100);

// Helper to re-hydrate backend state
const hydrateBackend = async (project: Project, updatePdf: (id: string, updates: Partial<PdfFile>) => void) => {
    console.log('[Store] Hydrating backend for project:', project.name);
    for (const pdf of project.pdfs) {
        if (pdf.path) {
            try {
                console.log(`[Store] Re-opening PDF: ${pdf.name} (${pdf.id})`);
                await invoke('open_file', { id: pdf.id, path: pdf.path });

                // Auto-retry ingestion if it was left stuck or failed
                if (pdf.ingestionStatus === 'processing' || pdf.ingestionStatus === 'failed') {
                    console.log(`[Store] Retrying stuck ingestion for: ${pdf.name}`);
                    invoke('ingest_file', { id: pdf.id, path: pdf.path })
                        .then(() => {
                            console.log(`[Ingestion] Retry success for ${pdf.name}`);
                            updatePdf(pdf.id, { ingestionStatus: 'completed' });
                        })
                        .catch(e => {
                            console.error(`[Ingestion] Retry failed for ${pdf.name}`, e);
                            updatePdf(pdf.id, { ingestionStatus: 'failed' });
                        });
                }

            } catch (e) {
                console.error(`[Store] Failed to re-open PDF ${pdf.name}:`, e);
            }
        } else {
            console.warn(`[Store] PDF ${pdf.name} (${pdf.id}) is missing path. Cannot re-hydrate.`);
        }
    }
};

export interface ProjectSlice {
    // State
    currentProject: Project | null;
    projects: Project[];
    currentPageId: string | null;
    projectFilePath: string | null;
    hasUnsavedChanges: boolean;
    isLoadingProject: boolean;
    isUploadingPdfs: boolean;
    isSaving: boolean;
    history: { past: Project[]; future: Project[] };

    // Actions
    setCurrentProject: (project: Project | null) => void;
    setCurrentPageId: (pageId: string | null) => void;
    createProject: (name: string, initialPdfs?: PdfFile[]) => void;
    saveProject: () => void;
    loadProject: (id: string) => void;
    deleteProject: (id: string) => void;
    getProjectList: () => Project[];
    addPdf: (pdf: PdfFile) => void;
    uploadPdfs: (files: (File | { path: string, name: string, size?: number })[]) => Promise<void>;
    renamePdf: (pdfId: string, name: string) => void;
    updatePdf: (pdfId: string, updates: Partial<PdfFile>) => void; // General update action
    renamePage: (pageId: string, name: string) => void;
    refreshProjects: () => void;
    saveProjectToFile: () => Promise<boolean>;
    saveProjectAs: () => Promise<boolean>;
    openProjectFile: () => Promise<void>;
    setProjectFilePath: (path: string | null) => void;
    markAsClean: () => void;
    undo: () => void;
    redo: () => void;
}

export const createProjectSlice: StateCreator<
    ProjectState,
    [],
    [],
    ProjectSlice
> = (set, get) => ({
    currentProject: null,
    projects: [],
    currentPageId: null,
    projectFilePath: null,
    hasUnsavedChanges: false,
    isLoadingProject: false,
    isUploadingPdfs: false,
    isSaving: false,
    history: { past: [], future: [] },

    setCurrentProject: (project) => {
        console.log('[Store] setCurrentProject:', project?.name);
        historyManager.clear(); // Reset history on project load

        let initialPageId = null;
        if (project) {
            // Re-hydrate backend state asynchronously
            hydrateBackend(project, get().updatePdf);

            // Always default to first page of the project (0-index)
            if (project.pdfs && project.pdfs.length > 0) {
                initialPageId = `${project.pdfs[0].id}:0`;
            }
        }

        set({
            currentProject: project,
            currentPageId: initialPageId,
            history: { past: [], future: [] }
        });
    },

    setCurrentPageId: (pageId) => {
        console.log('[Store] setCurrentPageId:', pageId);
        set({ currentPageId: pageId });
    },

    createProject: (name, initialPdfs = []) => {
        const id = crypto.randomUUID();
        const newProject: Project = {
            id,
            name,
            pdfs: initialPdfs,
            markups: {},
            pageMetadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Initialize markups for PDFs - logic removed as unused

        persistenceManager.queueSave(newProject);
        set((state) => ({
            currentProject: newProject,
            projects: [newProject, ...state.projects],
            currentPageId: initialPdfs.length > 0 ? `${initialPdfs[0].id}:0` : null,
            hasUnsavedChanges: true,
            projectFilePath: null
        }));
    },

    saveProject: () => {
        const { currentProject } = get();
        if (currentProject) {
            const updated = { ...currentProject, updatedAt: new Date().toISOString() };
            persistenceManager.queueSave(updated);
            set({ currentProject: updated, isSaving: false });
        }
    },

    loadProject: async (id) => {
        set({ isLoadingProject: true });
        try {
            const project = await persistenceManager.loadProject(id);
            if (project) {
                historyManager.clear();
                // Re-hydrate backend state
                await hydrateBackend(project, get().updatePdf);

                set({
                    currentProject: project,
                    currentPageId: project.pdfs.length > 0 ? `${project.pdfs[0].id}:0` : null,
                    isLoadingProject: false,
                    history: { past: [], future: [] }
                });

                // Fix currentPageId if it's null and we have PDFs
                if (!get().currentPageId && project.pdfs.length > 0) {
                    set({ currentPageId: `${project.pdfs[0].id}:0` });
                }
            } else {
                set({ isLoadingProject: false });
            }
        } catch (e) {
            console.error(e);
            set({ isLoadingProject: false });
        }
    },

    deleteProject: async (id) => {
        await persistenceManager.deleteProject(id);
        const projects = get().projects.filter(p => p.id !== id);
        if (get().currentProject?.id === id) {
            set({ currentProject: null, projects });
        } else {
            set({ projects });
        }
    },

    getProjectList: () => get().projects,

    addPdf: (pdf) => set((state) => {
        if (!state.currentProject) return { currentProject: null }; // Should not happen
        const newProject = {
            ...state.currentProject,
            pdfs: [...state.currentProject.pdfs, pdf],
            updatedAt: new Date().toISOString()
        };
        persistenceManager.queueSave(newProject);
        return { currentProject: newProject };
    }),

    uploadPdfs: async (files) => {
        set({ isUploadingPdfs: true });
        const { currentProject } = get();
        if (!currentProject) {
            set({ isUploadingPdfs: false });
            return;
        }

        try {
            const newPdfs: PdfFile[] = [];

            for (const file of files) {
                const fileId = crypto.randomUUID();
                let pageCount = 0;
                let fileSize = 0;
                let fileName = 'document.pdf';
                let filePath = '';
                // URL for virtual host loading (platform-aware)
                const virtualUrl = buildProtocolUrl(`/page/${fileId}`);

                // Check if it's a path object (Tauri)
                if ('path' in file && typeof (file as any).path === 'string') {
                    filePath = (file as any).path;
                    fileName = (file as any).name || fileName;

                    // Invoke backend to open file and get page count
                    pageCount = await invoke<number>('open_file', {
                        id: fileId,
                        path: filePath
                    });

                    // Note: We don't have file size easily here without another invoke, 
                    // but it's optional in UI usually.
                }
                // Check if it's a browser File object
                else if (file instanceof File) {
                    fileName = file.name;
                    fileSize = file.size;

                    // If we are in Tauri, we might have a path on the File object (if from DnD)
                    // @ts-ignore
                    filePath = file.path;

                    if (filePath) {
                        pageCount = await invoke<number>('open_file', {
                            id: fileId,
                            path: filePath
                        });
                    } else {
                        // If no path (e.g. pure web File), we can't easily use 'open_file' which expects a path.
                        // We would need to read bytes and save to temp file.
                        // For now, consistent with "Zero-Serialization", we assume we have paths.
                        // If we fall here, we might fail or need fallback.
                        // Let's log warning and skip or try legacy way? 
                        // Legacy way used arrayBuffer which is banned for large files.
                        // We will throw error for now as we want to enforce efficient path usage.
                        console.error('File object missing path. Cannot upload in zero-serialization mode.');
                        continue;
                    }
                }

                newPdfs.push({
                    id: fileId,
                    name: fileName,
                    pageCount: pageCount,
                    url: virtualUrl,
                    fileSize: fileSize,

                    path: filePath, // Persist path
                    thumbnails: [], // Will be populated below
                    ingestionStatus: 'processing' // Start as processing
                });

                // Generate thumbnails for the newly added PDF
                const thumbnails: string[] = [];
                const CHUNK_SIZE = 5;
                for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
                    const chunk = Array.from(
                        { length: Math.min(CHUNK_SIZE, pageCount - i) },
                        (_, j) => i + j
                    );

                    const chunkThumbs = await Promise.all(
                        chunk.map(pageNum =>
                            invoke<string>('generate_page_thumbnail', {
                                id: fileId,
                                pageNumber: pageNum
                            })
                        )
                    );
                    thumbnails.push(...chunkThumbs);
                }

                // Update the last added PDF with its thumbnails
                newPdfs[newPdfs.length - 1].thumbnails = thumbnails;

                // Fire and forget ingestion
                // We do this AFTER adding the PDF to state so the UI shows it immediately
                invoke('ingest_file', { id: fileId, path: filePath })
                    .then(() => {
                        console.log(`[Ingestion] Success for ${fileName}`);
                        get().updatePdf(fileId, { ingestionStatus: 'completed' });
                    })
                    .catch((err) => {
                        console.error(`[Ingestion] Failed for ${fileName}`, err);
                        get().updatePdf(fileId, { ingestionStatus: 'failed' });
                    });
            }

            const updatedProject = {
                ...currentProject,
                pdfs: [...currentProject.pdfs, ...newPdfs],
                updatedAt: new Date().toISOString()
            };

            persistenceManager.queueSave(updatedProject);
            set({
                currentProject: updatedProject,
                isUploadingPdfs: false,
                currentPageId: (!get().currentPageId && newPdfs.length > 0) ? `${newPdfs[0].id}:0` : get().currentPageId
            });

        } catch (e) {
            console.error('Upload failed', e);
            set({ isUploadingPdfs: false });
        }
    },

    renamePdf: (pdfId, name) => set((state) => {
        if (!state.currentProject) return {};
        const newPdfs = state.currentProject.pdfs.map(p =>
            p.id === pdfId ? { ...p, name } : p
        );
        const newProject = {
            ...state.currentProject,
            pdfs: newPdfs,
            updatedAt: new Date().toISOString()
        };
        persistenceManager.queueSave(newProject);
        return { currentProject: newProject };
    }),

    updatePdf: (pdfId, updates) => set((state) => {
        if (!state.currentProject) return {};
        const newPdfs = state.currentProject.pdfs.map(p =>
            p.id === pdfId ? { ...p, ...updates } : p
        );
        // Don't necessarily trigger save for transient fields like ingestionStatus?
        // Actually we do want to verify if ingestionStatus should be persisted.
        // It's fine to persist 'completed' or 'failed'.
        const newProject = {
            ...state.currentProject,
            pdfs: newPdfs,
            updatedAt: new Date().toISOString()
        };
        // Use debounce for saving if updates are frequent?
        // For ingestion status it's just once per file, so fine.
        persistenceManager.queueSave(newProject);
        return { currentProject: newProject };
    }),

    renamePage: (pageId, name) => set((state) => {
        if (!state.currentProject) return {};
        const newMeta = {
            ...state.currentProject.pageMetadata,
            [pageId]: {
                ...state.currentProject.pageMetadata[pageId],
                name
            }
        };
        const newProject = {
            ...state.currentProject,
            pageMetadata: newMeta,
            updatedAt: new Date().toISOString()
        };
        persistenceManager.queueSave(newProject);
        return { currentProject: newProject };
    }),

    refreshProjects: async () => {
        const index = await persistenceManager.loadAll();
        // Index items are already projects (metadata subset) or we can just map them
        // For the sidebar list, we only need metadata.
        // We'll treat the index items as Project objects for UI consistency
        set({ projects: index as any[] });
    },

    // .ptf File Operations
    saveProjectToFile: async () => {
        const { currentProject, projectFilePath } = get();
        if (!currentProject) return false;

        set({ isSaving: true });
        try {
            let path = projectFilePath;
            if (!path) {
                path = await save({
                    filters: [{ name: 'ProTakeoff Project', extensions: ['ptf'] }],
                    defaultPath: `${currentProject.name}.ptf`
                });
            }

            if (path) {
                const projectData = await serializeProject(currentProject); // Utils to implement
                await invoke('save_project_file', { path, data: projectData });
                set({
                    projectFilePath: path,
                    hasUnsavedChanges: false,
                    isSaving: false
                });
                return true;
            }
            set({ isSaving: false });
            return false;
        } catch (e) {
            console.error('Save to file failed', e);
            set({ isSaving: false });
            return false;
        }
    },

    saveProjectAs: async () => {
        const { currentProject } = get();
        if (!currentProject) return false;

        set({ isSaving: true });
        try {
            const path = await save({
                filters: [{ name: 'ProTakeoff Project', extensions: ['ptf'] }],
                defaultPath: `${currentProject.name}.ptf`
            });

            if (path) {
                const projectData = await serializeProject(currentProject);
                await invoke('save_project_file', { path, data: projectData });
                set({
                    projectFilePath: path,
                    hasUnsavedChanges: false,
                    isSaving: false
                });
                return true;
            }
            set({ isSaving: false });
            return false;
        } catch (e) {
            console.error('Save As failed', e);
            set({ isSaving: false });
            return false;
        }
    },

    openProjectFile: async () => {
        try {
            const path = await open({
                filters: [{ name: 'ProTakeoff Project', extensions: ['ptf'] }],
                multiple: false
            });

            if (path && typeof path === 'string') {
                set({ isLoadingProject: true });
                const content = await invoke<string>('load_project_file', { path });
                const project = await deserializeProject(content); // Utils to implement

                if (project) {
                    historyManager.clear();
                    set({
                        currentProject: project,
                        projectFilePath: path,
                        hasUnsavedChanges: false,
                        isLoadingProject: false,
                        history: { past: [], future: [] },
                        currentPageId: project.pdfs.length > 0 ? `${project.pdfs[0].id}:0` : null
                    });

                    // Re-hydrate backend
                    hydrateBackend(project, get().updatePdf);
                } else {
                    set({ isLoadingProject: false });
                }
            }
        } catch (e) {
            console.error('Open file failed', e);
            set({ isLoadingProject: false });
        }
    },

    setProjectFilePath: (path) => set({ projectFilePath: path }),
    markAsClean: () => set({ hasUnsavedChanges: false }),

    undo: () => {
        // Delegate to HistoryManager
        const { currentProject } = get();
        if (!currentProject) return;
        const previous = historyManager.undo(currentProject);
        if (previous) {
            set({ currentProject: previous });
            persistenceManager.queueSave(previous);
        }
    },

    redo: () => {
        const { currentProject } = get();
        if (!currentProject) return;
        const next = historyManager.redo(currentProject);
        if (next) {
            set({ currentProject: next });
            persistenceManager.queueSave(next);
        }
    }
});
