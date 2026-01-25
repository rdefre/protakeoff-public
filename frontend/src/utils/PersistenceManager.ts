/**
 * PersistenceManager - Sharded file-system persistence via Tauri.
 * 
 * Problem: LocalStorage has a 5MB limit and blocks the main thread.
 * Solution: Save each project to its own {id}.json file in the app data directory.
 * 
 * Structure:
 * - APP_DATA/projects/index.json -> List of { id, name, updatedAt }
 * - APP_DATA/projects/{id}.json  -> Full Project data
 */

import { BaseDirectory, mkdir, readTextFile, writeTextFile, remove, exists } from '@tauri-apps/plugin-fs';
import type { Project } from '../stores/useProjectStore';
import { MigrationService } from './MigrationService';

/** Minimal project info for the index */
interface ProjectIndexItem {
    id: string;
    name: string;
    updatedAt: string;
    createdAt: string;
}

export class PersistenceManager {
    private static instance: PersistenceManager | null = null;

    /** Pending project saves */
    private pendingSaves: Map<string, Project> = new Map();

    /** Debounce timer ID */
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly DEBOUNCE_MS = 1000;
    private readonly PROJECTS_DIR = 'projects';
    private readonly INDEX_FILE = 'projects/index.json';

    private isSaving: boolean = false;
    private isInitialized: boolean = false;

    private onSaveComplete?: (projectId: string) => void;

    private constructor() {
        // Initialize as part of boot
    }

    static getInstance(): PersistenceManager {
        if (!PersistenceManager.instance) {
            PersistenceManager.instance = new PersistenceManager();
        }
        return PersistenceManager.instance;
    }

    /**
     * Ensure the projects directory exists and perform migration if needed
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // 1. Ensure projects directory exists
            const dirExists = await exists(this.PROJECTS_DIR, { baseDir: BaseDirectory.AppData });
            if (!dirExists) {
                await mkdir(this.PROJECTS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
            }

            // 2. Run migration service (decoupled)
            await MigrationService.runIfNeeded();

            this.isInitialized = true;

        } catch (error) {
            console.error('[Persistence] Initialization failed:', error);
        }
    }

    /**
     * Queue a project save (debounced)
     */
    queueSave(project: Project): void {
        this.pendingSaves.set(project.id, project);

        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.persist();
        }, this.DEBOUNCE_MS);
    }

    /**
     * Force immediate save of all pending changes
     */
    async flush(): Promise<void> {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        await this.persist();
    }

    /**
     * Persist all pending changes to the file system
     */
    private async persist(): Promise<void> {
        if (this.pendingSaves.size === 0) return;
        if (this.isSaving) return;

        this.isSaving = true;

        try {
            if (!this.isInitialized) await this.init();

            // 1. Load current index
            let index: ProjectIndexItem[] = [];
            try {
                if (await exists(this.INDEX_FILE, { baseDir: BaseDirectory.AppData })) {
                    const indexData = await readTextFile(this.INDEX_FILE, { baseDir: BaseDirectory.AppData });
                    index = JSON.parse(indexData);
                }
            } catch (e) {
                console.error('[Persistence] Error parsing index file:', e);
            }

            // 2. Save each pending project and update index
            for (const [id, project] of this.pendingSaves.entries()) {
                const filePath = `${this.PROJECTS_DIR}/${id}.json`;

                // Save project file (async)
                await writeTextFile(filePath, JSON.stringify(project, null, 2), { baseDir: BaseDirectory.AppData });

                // Update index
                const indexIdx = index.findIndex(item => item.id === id);
                const indexItem: ProjectIndexItem = {
                    id: project.id,
                    name: project.name,
                    updatedAt: project.updatedAt,
                    createdAt: project.createdAt
                };

                if (indexIdx !== -1) {
                    index[indexIdx] = indexItem;
                } else {
                    index.push(indexItem);
                }

                this.onSaveComplete?.(id);
            }

            // 3. Save updated index
            await writeTextFile(this.INDEX_FILE, JSON.stringify(index, null, 2), { baseDir: BaseDirectory.AppData });

            // Clear pending
            this.pendingSaves.clear();


        } catch (error) {
            console.error('[Persistence] Failed to persist projects:', error);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Load all projects (metadata list only)
     */
    async loadAll(): Promise<ProjectIndexItem[]> {
        if (!this.isInitialized) await this.init();
        try {
            if (!(await exists(this.INDEX_FILE, { baseDir: BaseDirectory.AppData }))) {
                return [];
            }
            const data = await readTextFile(this.INDEX_FILE, { baseDir: BaseDirectory.AppData });
            const index: ProjectIndexItem[] = JSON.parse(data);
            return index.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        } catch (error) {
            console.error('[Persistence] Failed to load projects index:', error);
            return [];
        }
    }

    /**
     * Load a single project by ID (full data)
     */
    async loadProject(projectId: string): Promise<Project | null> {
        if (!this.isInitialized) await this.init();
        try {
            const filePath = `${this.PROJECTS_DIR}/${projectId}.json`;
            const data = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
            return JSON.parse(data);
        } catch (error) {
            console.error(`[Persistence] Failed to load project ${projectId}:`, error);
            return null;
        }
    }

    /**
     * Delete a project
     */
    async deleteProject(projectId: string): Promise<void> {
        if (!this.isInitialized) await this.init();
        try {
            // 1. Remove individual file
            const filePath = `${this.PROJECTS_DIR}/${projectId}.json`;
            if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
                await remove(filePath, { baseDir: BaseDirectory.AppData });
            }

            // 2. Remove from index
            let index: ProjectIndexItem[] = [];
            try {
                const indexData = await readTextFile(this.INDEX_FILE, { baseDir: BaseDirectory.AppData });
                index = JSON.parse(indexData);
                const newIndex = index.filter(p => p.id !== projectId);
                await writeTextFile(this.INDEX_FILE, JSON.stringify(newIndex, null, 2), { baseDir: BaseDirectory.AppData });
            } catch (e) { /* ignore */ }

            // 3. Remove from pending
            this.pendingSaves.delete(projectId);


        } catch (error) {
            console.error('[Persistence] Failed to delete project:', error);
        }
    }

    onSave(callback: (projectId: string) => void): void {
        this.onSaveComplete = callback;
    }
}

// Export singleton instance
export const persistenceManager = PersistenceManager.getInstance();
