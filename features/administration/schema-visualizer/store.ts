import { create } from 'zustand';
import { EntityKeys } from '@/types/entityTypes';

export type SelectedElementType = 'table' | 'field' | 'relationship' | null;

export interface SelectedElement {
    type: SelectedElementType;
    entityName: EntityKeys;
    fieldName?: string;
    relationshipIndex?: number;
}

interface SchemaVisualizerState {
    selectedElement: SelectedElement | null;
    setSelectedElement: (element: SelectedElement | null) => void;
    isDetailsOpen: boolean;
    setDetailsOpen: (open: boolean) => void;
}

export const useSchemaVisualizerStore = create<SchemaVisualizerState>((set, get) => ({
    selectedElement: null,
    setSelectedElement: (element) => set({
        selectedElement: element,
        isDetailsOpen: element !== null // Automatically open details when something is selected
    }),
    isDetailsOpen: false,
    setDetailsOpen: (open) => set({
        isDetailsOpen: open,
        selectedElement: open ? get().selectedElement : null // Clear selection when closing
    })
}));
