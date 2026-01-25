/**
 * SpatialIndex - R-Tree based spatial indexing for viewport culling.
 * 
 * With 300+ markups per page, we need efficient spatial queries to determine
 * which markups are visible in the current viewport. This uses rbush,
 * a high-performance R-Tree implementation.
 * 
 * Viewport culling reduces rendering from O(n) to O(log n + k) where k is visible items.
 */

import RBush from 'rbush';
import type { Point } from '../stores/useProjectStore';

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface IndexEntry extends BoundingBox {
    id: string;
}

export class SpatialIndex {
    private static instance: SpatialIndex | null = null;

    private tree: RBush<IndexEntry>;

    // Cache entries by ID for efficient updates/removals
    private entriesById: Map<string, IndexEntry> = new Map();

    // Track current page to reset on page change
    private currentPageId: string | null = null;

    private constructor() {
        // Initialize with node capacity of 16 (good for ~1000 items)
        this.tree = new RBush<IndexEntry>(16);
    }

    static getInstance(): SpatialIndex {
        if (!SpatialIndex.instance) {
            SpatialIndex.instance = new SpatialIndex();
        }
        return SpatialIndex.instance;
    }

    /**
     * Calculate bounding box for a set of paths (points)
     */
    static calculateBounds(paths: Point[][]): BoundingBox {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const path of paths) {
            for (const p of path) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            }
        }

        // Handle empty paths
        if (minX === Infinity) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        // Add small padding for point/line hit detection
        const PADDING = 10;
        return {
            minX: minX - PADDING,
            minY: minY - PADDING,
            maxX: maxX + PADDING,
            maxY: maxY + PADDING
        };
    }

    /**
     * Insert or update a markup's bounding box
     */
    upsert(id: string, paths: Point[][]): void {
        const bounds = SpatialIndex.calculateBounds(paths);
        const entry: IndexEntry = { ...bounds, id };

        // Remove existing entry if present
        const existing = this.entriesById.get(id);
        if (existing) {
            this.tree.remove(existing, (a, b) => a.id === b.id);
        }

        // Insert new entry
        this.tree.insert(entry);
        this.entriesById.set(id, entry);
    }

    /**
     * Remove a markup from the index
     */
    remove(id: string): void {
        const existing = this.entriesById.get(id);
        if (existing) {
            this.tree.remove(existing, (a, b) => a.id === b.id);
            this.entriesById.delete(id);
        }
    }

    /**
     * Query for all markup IDs within a viewport
     */
    queryViewport(viewport: BoundingBox): string[] {
        const results = this.tree.search(viewport);
        return results.map(entry => entry.id);
    }

    /**
     * Query for all markup IDs that intersect a point (with tolerance)
     */
    queryPoint(x: number, y: number, tolerance: number = 10): string[] {
        const viewport: BoundingBox = {
            minX: x - tolerance,
            minY: y - tolerance,
            maxX: x + tolerance,
            maxY: y + tolerance
        };
        return this.queryViewport(viewport);
    }

    /**
     * Get all indexed markup IDs
     */
    getAllIds(): string[] {
        return Array.from(this.entriesById.keys());
    }

    /**
     * Check if a markup is indexed
     */
    has(id: string): boolean {
        return this.entriesById.has(id);
    }

    /**
     * Get bounds for a specific markup
     */
    getBounds(id: string): BoundingBox | undefined {
        const entry = this.entriesById.get(id);
        if (entry) {
            return {
                minX: entry.minX,
                minY: entry.minY,
                maxX: entry.maxX,
                maxY: entry.maxY
            };
        }
        return undefined;
    }

    /**
     * Clear and rebuild index for a new page
     */
    setPage(pageId: string, markups: { id: string; paths: Point[][] }[]): void {
        if (this.currentPageId !== pageId) {
            this.clear();
            this.currentPageId = pageId;
        }

        // Bulk insert is more efficient than individual inserts
        const entries: IndexEntry[] = markups.map(m => ({
            ...SpatialIndex.calculateBounds(m.paths),
            id: m.id
        }));

        this.tree.load(entries);
        entries.forEach(e => this.entriesById.set(e.id, e));
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.tree.clear();
        this.entriesById.clear();
        this.currentPageId = null;
    }

    /**
     * Get count of indexed items
     */
    get size(): number {
        return this.entriesById.size;
    }
}

// Export singleton instance
export const spatialIndex = SpatialIndex.getInstance();
