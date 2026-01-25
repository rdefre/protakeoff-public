
import { type StateCreator } from 'zustand';
import { type ProjectState, type ExtendedTemplate, type ItemTemplate } from '../../types/store';
import { getAllTemplates } from '../../utils/templateService';

export interface TemplateSlice {
    templates: ExtendedTemplate[];
    isLoadingTemplates: boolean;
    selectedTemplateCategory: string;

    setSelectedTemplateCategory: (category: string) => void;
    addTemplate: (template: ItemTemplate) => void;
    updateTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
    deleteTemplate: (id: string) => void;
    loadTemplates: () => Promise<void>;
}

export const createTemplateSlice: StateCreator<
    ProjectState,
    [],
    [],
    TemplateSlice
> = (set, _get) => ({
    templates: [],
    isLoadingTemplates: false,
    selectedTemplateCategory: 'All',

    setSelectedTemplateCategory: (category) => set({ selectedTemplateCategory: category }),

    // These would typically interact with templateService persistence
    // For now mocking or calling service

    addTemplate: (_template) => { }, // Implement
    updateTemplate: (_id, _updates) => { }, // Implement
    deleteTemplate: (_id) => { }, // Implement

    loadTemplates: async () => {
        set({ isLoadingTemplates: true });
        try {
            const templates = await getAllTemplates();
            set({ templates, isLoadingTemplates: false });
        } catch (e) {
            console.error('Failed to load templates', e);
            set({ isLoadingTemplates: false });
        }
    }
});
