/**
 * MarkupManager - Centralized dirty tracking for markup rendering optimization.
 * 
 * Instead of re-rendering all 300+ markups on every state change,
 * this manager tracks which markups have actually changed (are "dirty")
 * and only those need to be redrawn.
 */

export class MarkupManager {
    private static instance: MarkupManager | null = null;

    // Set of markup IDs that need redrawing
    private dirtyIds: Set<string> = new Set();

    // Version tracking for cache invalidation
    private versions: Map<string, number> = new Map();

    // Track deleted markup IDs (need graphics cleanup)
    private deletedIds: Set<string> = new Set();

    // Track newly added markup IDs
    private addedIds: Set<string> = new Set();

    // Selection state tracking (selection changes require redraw)
    private lastSelectedIds: Set<string> = new Set();

    // Render hash tracking - stores hash of last rendered state to detect real changes
    private renderHashes: Map<string, string> = new Map();

    private constructor() { }

    static getInstance(): MarkupManager {
        if (!MarkupManager.instance) {
            MarkupManager.instance = new MarkupManager();
        }
        return MarkupManager.instance;
    }

    /**
     * Mark a markup as dirty (needs redraw on next render cycle)
     */
    markDirty(id: string): void {
        this.dirtyIds.add(id);
        this.versions.set(id, (this.versions.get(id) || 0) + 1);
    }

    /**
     * Mark multiple markups as dirty
     */
    markDirtyBatch(ids: string[]): void {
        ids.forEach(id => this.markDirty(id));
    }

    /**
     * Mark a markup as deleted (graphics need cleanup)
     */
    markDeleted(id: string): void {
        this.deletedIds.add(id);
        this.dirtyIds.delete(id);
        this.versions.delete(id);
    }

    /**
     * Mark a markup as newly added
     */
    markAdded(id: string): void {
        this.addedIds.add(id);
        this.dirtyIds.add(id);
        this.versions.set(id, 1);
    }

    /**
     * Check if a markup is dirty
     */
    isDirty(id: string): boolean {
        return this.dirtyIds.has(id);
    }

    /**
     * Get all dirty markup IDs
     */
    getDirtyIds(): string[] {
        return Array.from(this.dirtyIds);
    }

    /**
     * Get all deleted markup IDs
     */
    getDeletedIds(): string[] {
        return Array.from(this.deletedIds);
    }

    /**
     * Get all added markup IDs
     */
    getAddedIds(): string[] {
        return Array.from(this.addedIds);
    }

    /**
     * Get the version number for a markup (for cache key generation)
     */
    getVersion(id: string): number {
        return this.versions.get(id) || 0;
    }

    /**
     * Clear all dirty flags after a render cycle
     */
    clearDirty(): void {
        this.dirtyIds.clear();
        this.deletedIds.clear();
        this.addedIds.clear();
    }

    /**
     * Update selection tracking and mark affected markups as dirty
     * Returns the set of IDs that need redraw due to selection change
     */
    updateSelection(newSelectedIds: string[]): string[] {
        const newSet = new Set(newSelectedIds);
        const affectedIds: string[] = [];

        // Items that were selected but no longer are
        this.lastSelectedIds.forEach(id => {
            if (!newSet.has(id)) {
                affectedIds.push(id);
                this.markDirty(id);
            }
        });

        // Items that are now selected but weren't before
        newSelectedIds.forEach(id => {
            if (!this.lastSelectedIds.has(id)) {
                affectedIds.push(id);
                this.markDirty(id);
            }
        });

        this.lastSelectedIds = newSet;
        return affectedIds;
    }

    /**
     * Force all markups to be dirty (e.g., on page change)
     */
    markAllDirty(allIds: string[]): void {
        allIds.forEach(id => this.markDirty(id));
    }

    /**
     * Check if any markups need processing
     */
    hasDirtyMarkups(): boolean {
        return this.dirtyIds.size > 0 || this.deletedIds.size > 0 || this.addedIds.size > 0;
    }

    /**
     * Check if a markup needs re-rendering based on its current state.
     * Uses a simple hash comparison to avoid unnecessary PixiJS redraws.
     * 
     * @param id - Markup ID
     * @param paths - Markup paths array
     * @param properties - Markup properties object
     * @returns true if markup needs redraw, false if unchanged
     */
    needsRender(id: string, paths: unknown, properties: unknown): boolean {
        // Generate a simple hash of the markup state
        const hash = JSON.stringify({ paths, properties });
        const lastHash = this.renderHashes.get(id);

        if (lastHash === hash) {
            return false; // No change, skip redraw
        }

        this.renderHashes.set(id, hash);
        return true;
    }

    /**
     * Clear the render cache for a specific markup (e.g., when deleted)
     */
    clearRenderCache(id: string): void {
        this.renderHashes.delete(id);
    }

    /**
     * Reset all tracking state (e.g., on project switch)
     */
    reset(): void {
        this.dirtyIds.clear();
        this.versions.clear();
        this.deletedIds.clear();
        this.addedIds.clear();
        this.lastSelectedIds.clear();
        this.renderHashes.clear();
    }
}

// Export singleton instance
export const markupManager = MarkupManager.getInstance();
