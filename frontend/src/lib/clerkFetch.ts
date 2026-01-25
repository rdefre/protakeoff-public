/**
 * Clerk Fetch Adapter for Tauri
 * 
 * Provides an isolated fetch wrapper for Clerk API calls that routes through
 * Tauri's native HTTP client to bypass CORS restrictions in desktop apps.
 * 
 * This module is separated from the global fetch patch to:
 * 1. Limit the attack surface of origin spoofing
 * 2. Make the patch explicitly visible and auditable
 * 3. Allow easier testing and debugging
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/** Domains that should be routed through the Clerk adapter */
const CLERK_DOMAINS = [
    'clerk.protakeoff.org',
    'clerk.com',
    'api.clerk.com',
    '.clerk.accounts.dev'
];

/** Origin to spoof for Clerk security checks */
const CLERK_ORIGIN = 'https://clerk.protakeoff.org';

/**
 * Check if a URL should be handled by the Clerk fetch adapter
 */
function isClerkRequest(url: string): boolean {
    return CLERK_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Fetch adapter for Clerk requests in Tauri
 * Routes requests through native HTTP to bypass webview CORS restrictions
 */
export async function clerkFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {




    // Build modified headers with spoofed origin
    const headers = new Headers(init?.headers || {});
    headers.set('Origin', CLERK_ORIGIN);
    headers.set('Referer', `${CLERK_ORIGIN}/`);

    const modifiedInit: RequestInit = {
        ...init,
        headers
    };

    try {
        const response = await tauriFetch(input, modifiedInit);


        // Intercept JSON responses to rewrite redirect URLs
        // This fixes the issue where Clerk (using pk_live) redirects to the production domain
        // instead of localhost because localhost isn't whitelisted or Origin is spoofed.
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();



            // Rewrite all variations of the production domain to local origin
            // We target all App Domains, NOT the Clerk Domain "clerk.protakeoff.org"
            const localOrigin = window.location.origin; // e.g. http://localhost:1420

            // List of production APP domains that should be rewritten to localhost
            // DO NOT include accounts.protakeoff.org - that's Clerk's Account Portal
            // where sign-up/email verification flows happen and must remain accessible
            const productionDomains = [
                'https://app.protakeoff.org',
                'https://www.protakeoff.org',
                'https://protakeoff.org'
            ];

            let newText = text;
            for (const domain of productionDomains) {
                if (newText.includes(domain)) {

                    newText = newText.replaceAll(domain, localOrigin);
                }
            }



            return new Response(newText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        }

        // Pass through non-JSON responses (images, etc)
        const data = await response.arrayBuffer();
        return new Response(data, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
    } catch (error) {
        console.error(`[ClerkFetch] Error:`, error);
        throw error;
    }
}

// Store original fetch reference
const originalFetch = window.fetch.bind(window);

/**
 * Install the Clerk fetch patch
 * 
 * This patches window.fetch to route Clerk requests through the native adapter.
 * Only call this once during app initialization.
 */
export function installClerkFetchPatch(): void {
    window.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> => {
        const url = typeof input === 'string'
            ? input
            : (input instanceof URL ? input.toString() : input.url);

        if (isClerkRequest(url)) {
            return clerkFetch(input, init);
        }

        return originalFetch(input, init);
    };


}

/**
 * Uninstall the Clerk fetch patch
 * Restores the original window.fetch (useful for testing)
 */
export function uninstallClerkFetchPatch(): void {
    window.fetch = originalFetch;

}