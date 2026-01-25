import { convex } from '../lib/convex';
import { api } from '../../convex/_generated/api';
import type { ItemTemplate, ToolType, MeasurementProperties } from '../stores/useProjectStore';

// Extended template type with source and category metadata
export interface ExtendedTemplate extends ItemTemplate {
    source: 'bundled' | 'remote';
    category: string;
}

/**
 * Load bundled templates from the public JSON file
 */
export async function loadBundledTemplates(): Promise<ExtendedTemplate[]> {
    try {
        const response = await fetch('/example_templates.json');
        if (!response.ok) {
            console.warn('Failed to load bundled templates:', response.statusText);
            return [];
        }
        const data = await response.json();

        const templates: ItemTemplate[] = data.templates || [];

        return templates.map(t => ({
            ...t,
            source: 'bundled' as const,
            category: (t.properties as MeasurementProperties)?.group || 'General',
        }));
    } catch (error) {
        console.error('Error loading bundled templates:', error);
        return [];
    }
}

/**
 * Fetch active templates from Convex
 */
export async function fetchRemoteTemplates(): Promise<ExtendedTemplate[]> {
    try {
        // We use the convex client directly here since this service is outside the React tree
        const data = await convex.query(api.templates.getActiveTemplates);

        if (!data || data.length === 0) {
            return [];
        }

        // Transform Convex docs to ExtendedTemplate format
        return data.map(row => ({
            id: (row.template_data as any).id || row._id,
            name: row.name,
            description: row.description || (row.template_data as any).description,
            toolType: (row.template_data as any).toolType as ToolType,
            properties: (row.template_data as any).properties as Partial<MeasurementProperties>,
            source: 'remote' as const,
            category: row.category || (row.template_data as any).properties?.group || 'General',
        }));
    } catch (error) {
        console.error('Error fetching remote templates from Convex:', error);
        return [];
    }
}

/**
 * Get all templates (bundled + remote), deduplicated by ID
 * Remote templates take precedence if same ID exists
 */
export async function getAllTemplates(): Promise<ExtendedTemplate[]> {
    // Load both in parallel
    const [bundled, remote] = await Promise.all([
        loadBundledTemplates(),
        fetchRemoteTemplates(),
    ]);

    const templateMap = new Map<string, ExtendedTemplate>();

    // Add bundled first
    for (const t of bundled) {
        templateMap.set(t.id, t);
    }

    // Remote overwrites bundled if same ID
    for (const t of remote) {
        templateMap.set(t.id, t);
    }

    const result = Array.from(templateMap.values());
    return result;
}

/**
 * Get unique categories from a list of templates
 */
export function getTemplateCategories(templates: ExtendedTemplate[]): string[] {
    const categories = new Set<string>();
    for (const t of templates) {
        if (t.category) {
            categories.add(t.category);
        }
    }
    return ['All', ...Array.from(categories).sort()];
}

/**
 * Filter templates by category
 */
export function filterTemplatesByCategory(
    templates: ExtendedTemplate[],
    category: string
): ExtendedTemplate[] {
    if (category === 'All') {
        return templates;
    }
    return templates.filter(t => t.category === category);
}

/**
 * Filter templates by tool type
 */
export function filterTemplatesByToolType(
    templates: ExtendedTemplate[],
    toolType: ToolType | 'all'
): ExtendedTemplate[] {
    if (toolType === 'all') {
        return templates;
    }
    return templates.filter(t => t.toolType === toolType);
}
