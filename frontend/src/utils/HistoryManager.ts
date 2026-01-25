/**
 * HistoryManager - Diff-based undo/redo system using JSON Patch.
 * 
 * Instead of storing full project snapshots (which explodes memory with 60K+ markups),
 * this manager stores only the differences (patches) between states.
 * 
 * Memory reduction: O(snapshots × project_size) → O(patches × change_size)
 */

import { compare, applyPatch, type Operation } from 'fast-json-patch';

export interface HistoryEntry {
    /** Forward patch: transforms previous state to current state */
    patch: Operation[];
    /** Reverse patch: transforms current state back to previous state (for undo) */
    reversePatch: Operation[];
    /** Timestamp for debugging */
    timestamp: number;
    /** Optional label for action type */
    actionType?: string;
}

export class HistoryManager<T extends object> {
    private static instance: HistoryManager<any> | null = null;

    /** Undo stack */
    private past: HistoryEntry[] = [];

    /** Redo stack */
    private future: HistoryEntry[] = [];

    /** Maximum history entries to keep */
    private maxHistory: number = 100;

    /** Flag to prevent recording during undo/redo */
    private isUndoingOrRedoing: boolean = false;

    private constructor(maxHistory: number = 100) {
        this.maxHistory = maxHistory;
    }

    static getInstance<T extends object>(maxHistory: number = 100): HistoryManager<T> {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager<T>(maxHistory);
        }
        return HistoryManager.instance as HistoryManager<T>;
    }

    /**
     * Record a state change as a patch
     * @param before - State before the change
     * @param after - State after the change
     * @param actionType - Optional label for the action
     */
    push(before: T, after: T, actionType?: string): void {
        if (this.isUndoingOrRedoing) return;

        // Generate patches
        const patch = compare(before, after);
        const reversePatch = compare(after, before);

        // Skip if no actual changes
        if (patch.length === 0) return;

        const entry: HistoryEntry = {
            patch,
            reversePatch,
            timestamp: Date.now(),
            actionType
        };

        // Add to past
        this.past.push(entry);

        // Clear future (new branch of history)
        this.future = [];

        // Limit history size
        if (this.past.length > this.maxHistory) {
            this.past.shift();
        }
    }

    /**
     * Undo the last action
     * @param currentState - Current state to patch
     * @returns New state after undo, or null if nothing to undo
     */
    undo(currentState: T): T | null {
        if (this.past.length === 0) return null;

        const entry = this.past.pop()!;

        try {
            this.isUndoingOrRedoing = true;

            // Deep clone to avoid mutating original (structuredClone is faster than JSON serialization)
            const cloned = structuredClone(currentState);

            // Apply reverse patch
            const result = applyPatch(cloned, entry.reversePatch, true, false);

            // Move to future stack
            this.future.unshift(entry);

            return result.newDocument as T;
        } catch (error) {
            console.error('Undo failed:', error);
            // Restore entry if failed
            this.past.push(entry);
            return null;
        } finally {
            this.isUndoingOrRedoing = false;
        }
    }

    /**
     * Redo the last undone action
     * @param currentState - Current state to patch
     * @returns New state after redo, or null if nothing to redo
     */
    redo(currentState: T): T | null {
        if (this.future.length === 0) return null;

        const entry = this.future.shift()!;

        try {
            this.isUndoingOrRedoing = true;

            // Deep clone to avoid mutating original (structuredClone is faster than JSON serialization)
            const cloned = structuredClone(currentState);

            // Apply forward patch
            const result = applyPatch(cloned, entry.patch, true, false);

            // Move to past stack
            this.past.push(entry);

            return result.newDocument as T;
        } catch (error) {
            console.error('Redo failed:', error);
            // Restore entry if failed
            this.future.unshift(entry);
            return null;
        } finally {
            this.isUndoingOrRedoing = false;
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.past.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.future.length > 0;
    }

    /**
     * Get number of available undo steps
     */
    get undoCount(): number {
        return this.past.length;
    }

    /**
     * Get number of available redo steps
     */
    get redoCount(): number {
        return this.future.length;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.past = [];
        this.future = [];
    }

    /**
     * Get the last action type (for UI display)
     */
    getLastActionType(): string | undefined {
        if (this.past.length === 0) return undefined;
        return this.past[this.past.length - 1].actionType;
    }

    /**
     * Get the next redo action type (for UI display)
     */
    getNextRedoActionType(): string | undefined {
        if (this.future.length === 0) return undefined;
        return this.future[0].actionType;
    }

    /**
     * Start a batch update (groups multiple changes into one undo step)
     */
    private batchBeforeState: T | null = null;

    startBatch(currentState: T): void {
        this.batchBeforeState = structuredClone(currentState);
    }

    /**
     * End a batch update and record as single undo step
     */
    endBatch(currentState: T, actionType?: string): void {
        if (this.batchBeforeState) {
            this.push(this.batchBeforeState, currentState, actionType);
            this.batchBeforeState = null;
        }
    }

    /**
     * Cancel a batch update without recording
     */
    cancelBatch(): void {
        this.batchBeforeState = null;
    }
}

// Export typed singleton factory
export function getHistoryManager<T extends object>(maxHistory: number = 100): HistoryManager<T> {
    return HistoryManager.getInstance<T>(maxHistory);
}
