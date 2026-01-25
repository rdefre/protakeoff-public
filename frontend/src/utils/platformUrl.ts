/**
 * Platform-aware URL utility for Tauri custom protocols
 * 
 * Tauri v2 uses different URL formats on different platforms:
 * - Windows/Android: http://<scheme>.localhost/<path>
 * - macOS/Linux: <scheme>://localhost/<path>
 */

import { platform } from '@tauri-apps/plugin-os';

/** Cached platform value to avoid repeated async calls */
let cachedPlatform: string | null = null;

/**
 * Initialize the platform cache. Call this early in app startup.
 */
export async function initPlatform(): Promise<string> {
    if (!cachedPlatform) {
        // Initialize
        cachedPlatform = await platform();
        console.log(`[platformUrl] Initialized platform: ${cachedPlatform}`);
    }
    return cachedPlatform;
}

/**
 * Get the cached platform synchronously. 
 * Returns null if initPlatform() hasn't been called yet.
 */
export function getCachedPlatform(): string | null {
    return cachedPlatform;
}

/**
 * Build a URL for the protakeoff custom protocol.
 * Handles platform differences automatically.
 * 
 * @param path - The path portion (should start with /)
 * @returns Platform-appropriate URL
 */
export function buildProtocolUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Windows uses http://scheme.localhost, macOS/Linux uses scheme://localhost
    const isWindows = cachedPlatform === 'windows';

    if (isWindows) {
        return `http://protakeoff.localhost${normalizedPath}`;
    } else {
        return `protakeoff://localhost${normalizedPath}`;
    }
}

/**
 * Synchronous helper that checks if we're on Windows.
 * Requires initPlatform() to have been called first.
 */
export function isWindows(): boolean {
    return cachedPlatform === 'windows';
}
