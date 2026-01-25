/**
 * Project File Utilities
 * 
 * Handles serialization/deserialization of .ptf (ProTakeoff File) project files.
 * Embeds PDFs as Base64 for full shareability across machines.
 */

// import { invoke } from '@tauri-apps/api/core'; // Unused now
import type { Project, PdfFile } from '../stores/useProjectStore';
import { buildProtocolUrl } from './platformUrl';

/** Version for file format migrations */
export const PTF_VERSION = '1.0';

/** Structure of embedded PDF data */
export interface EmbeddedPdf {
    id: string;
    name: string;
    pageCount: number;
    originalPath: string;
    base64Data: string;
    fileSize?: number;
}

/** Serialized project file structure */
export interface SerializedProject {
    version: string;
    project: Omit<Project, 'pdfs'> & { pdfs: Omit<PdfFile, 'url'>[] };
    embeddedPdfs: Record<string, string>; // pdfId -> base64 data
}

/**
 * Serialize a project to JSON string with embedded PDFs
 * 
 * @param project - The project to serialize
 * @returns JSON string ready for saving to .ptf file
 */
export async function serializeProject(project: Project): Promise<string> {
    const embeddedPdfs: Record<string, string> = {};

    // Embed each PDF as base64
    // Optimization: Skip embedding PDFs in frontend. 
    // The backend now handles reading the files from disk and embedding them.
    // This prevents freezing the main thread during save.

    // Create serialized structure (strip blob URLs from pdfs)
    const serializedPdfs = project.pdfs.map(pdf => ({
        id: pdf.id,
        name: pdf.name,
        pageCount: pdf.pageCount,
        fileSize: pdf.fileSize,
        // Persist the local path so backend can re-hydrate
        path: pdf.path,
        // Provide the path as 'url' so the backend optimization logic can find the file to embed
        // If it's a blob url (not a path), we can't embed it easily via backend
        url: pdf.path || (pdf.url.startsWith('blob:') ? '' : pdf.url),
        // Persist thumbnails
        thumbnails: pdf.thumbnails
    }));

    const serialized: SerializedProject = {
        version: PTF_VERSION,
        project: {
            ...project,
            pdfs: serializedPdfs as any
        },
        embeddedPdfs
    };

    return JSON.stringify(serialized, null, 2);
}

/**
 * Deserialize a project from JSON string
 * 
 * @param json - JSON string from .ptf file
 * @returns Reconstructed project with blob URLs for PDFs
 */
export async function deserializeProject(json: string): Promise<Project> {
    const parsed: SerializedProject = JSON.parse(json);

    // Version check for future migrations
    if (parsed.version !== PTF_VERSION) {
        console.warn(`[ProjectFileUtils] File version ${parsed.version} differs from current ${PTF_VERSION}`);
        // Add migration logic here if needed in future
    }

    // Reconstruct PDFs with blob URLs from embedded base64 data
    const reconstructedPdfs: PdfFile[] = [];

    for (const pdfData of parsed.project.pdfs) {
        // If backend extracted embedded PDF, it put the temp path in 'url'
        let extractedPath: string | undefined;
        let originalPath: string | undefined = (pdfData as any).path || (pdfData as any).originalPath;

        // Check if backend provided a local path (extracted temp file)
        if ((pdfData as any).url && !(pdfData as any).url.startsWith('http')) {
            extractedPath = (pdfData as any).url;
        }

        // The path we should use for 'open_file' (re-hydration)
        // Prefer extracted temp file if available (it definitely exists)
        // Fallback to original path
        const rehydratePath = extractedPath || originalPath;

        // The URL for the frontend renderer (Virtual Host - platform-aware)
        const virtualUrl = buildProtocolUrl(`/page/${pdfData.id}`);

        // Legacy: Check for embedded base64 usage (should be rare with backend optimization)
        const base64 = parsed.embeddedPdfs[pdfData.id];
        if (base64 && !extractedPath) {
            // If we have base64 but backend didn't extract it (maybe older file?), we might need to handle it.
            // But for now, we assume backend handles extraction if 'embeddedPdfs' was present.
            // If this is a purely frontend load (unlikely in Tauri app), we'd need base64ToBlobUrl.
        }

        reconstructedPdfs.push({
            id: pdfData.id,
            name: pdfData.name,
            pageCount: pdfData.pageCount,
            url: virtualUrl,
            fileSize: pdfData.fileSize,
            path: rehydratePath,
            thumbnails: (pdfData as any).thumbnails
        });
    }

    return {
        ...parsed.project,
        pdfs: reconstructedPdfs
    } as Project;
}

/**
 * Convert base64 string to blob URL
 * 
 * @param base64 - Base64 encoded file content
 * @param mimeType - MIME type for the blob
 * @returns Blob URL that can be used as src
 */
export function base64ToBlobUrl(base64: string, mimeType: string): string {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL to free memory
 * Should be called when a project is closed
 * 
 * @param url - Blob URL to revoke
 */
export function revokeBlobUrl(url: string): void {
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
