/**
 * MigrationService - Handles one-time migration from LocalStorage to FileSystem.
 * 
 * This service is intentionally separate from PersistenceManager to:
 * 1. Follow Single Responsibility Principle
 * 2. Allow the migration logic to be removed in future versions
 * 3. Prevent migration code from being loaded after initial completion
 */

import { BaseDirectory, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import type { Project } from '../stores/useProjectStore';

interface ProjectIndexItem {
    id: string;
    name: string;
    updatedAt: string;
    createdAt: string;
}

export class MigrationService {
    private static readonly MIGRATION_COMPLETE_KEY = 'protakeoff_migration_v2_complete';
    private static readonly LEGACY_KEY = 'protakeoff_projects';
    private static readonly PROJECTS_DIR = 'projects';
    private static readonly INDEX_FILE = 'projects/index.json';

    /**
     * Run migration if not already complete.
     * Uses localStorage flag to prevent re-running.
     */
    static async runIfNeeded(): Promise<boolean> {
        // Skip if already completed
        if (localStorage.getItem(this.MIGRATION_COMPLETE_KEY)) {
            return false;
        }

        // Check for legacy data
        const legacyData = localStorage.getItem(this.LEGACY_KEY);
        if (!legacyData) {
            // No legacy data, mark as complete to prevent future checks
            localStorage.setItem(this.MIGRATION_COMPLETE_KEY, 'true');
            return false;
        }

        if (import.meta.env.DEV) {
            console.log('[MigrationService] Found legacy data, starting migration...');
        }

        const success = await this.migrateLocalStorageToFileSystem(legacyData);

        if (success) {
            // Clear legacy data and mark complete
            localStorage.removeItem(this.LEGACY_KEY);
            localStorage.setItem(this.MIGRATION_COMPLETE_KEY, 'true');

            if (import.meta.env.DEV) {
                console.log('[MigrationService] Migration complete. LocalStorage cleared.');
            }
        }

        return success;
    }

    /**
     * Migrate projects from LocalStorage JSON to individual files.
     */
    private static async migrateLocalStorageToFileSystem(legacyData: string): Promise<boolean> {
        try {
            const projects: Record<string, Project> = JSON.parse(legacyData);
            const index: ProjectIndexItem[] = [];

            // Check if there's already data (don't overwrite)
            const indexExists = await exists(this.INDEX_FILE, { baseDir: BaseDirectory.AppData });
            if (indexExists) {
                if (import.meta.env.DEV) {
                    console.log('[MigrationService] Index already exists, skipping migration to avoid overwrite.');
                }
                return true;
            }

            for (const [id, project] of Object.entries(projects)) {
                const filePath = `${this.PROJECTS_DIR}/${id}.json`;
                await writeTextFile(filePath, JSON.stringify(project, null, 2), { baseDir: BaseDirectory.AppData });

                index.push({
                    id: project.id,
                    name: project.name,
                    updatedAt: project.updatedAt,
                    createdAt: project.createdAt
                });

                if (import.meta.env.DEV) {
                    console.log(`[MigrationService] Migrated project: ${project.name}`);
                }
            }

            // Save index
            await writeTextFile(this.INDEX_FILE, JSON.stringify(index, null, 2), { baseDir: BaseDirectory.AppData });

            return true;
        } catch (error) {
            console.error('[MigrationService] Migration failed:', error);
            return false;
        }
    }
}
