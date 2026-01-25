
import { create } from 'zustand';
import { type ProjectState } from '../types/store';
import { createProjectSlice } from './slices/projectSlice';
import { createMarkupSlice } from './slices/markupSlice';
import { createUiSlice } from './slices/uiSlice';
import { createTemplateSlice } from './slices/templateSlice';

// Export types from central location for backward compatibility if imports point here
export * from '../types/store';

export const useProjectStore = create<ProjectState>()((...a) => ({
    ...createProjectSlice(...a),
    ...createMarkupSlice(...a),
    ...createUiSlice(...a),
    ...createTemplateSlice(...a),
}));
