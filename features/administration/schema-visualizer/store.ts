// features/administration/schema-visualizer/store.ts
// Standalone zustand store — uses raw table names (no `EntityKeys`).

import { create } from "zustand";
import type { SelectedElement } from "./types-standalone";

interface SchemaVisualizerState {
    selectedElement: SelectedElement | null;
    setSelectedElement: (element: SelectedElement | null) => void;
    isDetailsOpen: boolean;
    setDetailsOpen: (open: boolean) => void;
}

export const useSchemaVisualizerStore = create<SchemaVisualizerState>((set, get) => ({
    selectedElement: null,
    setSelectedElement: (element) =>
        set({
            selectedElement: element,
            isDetailsOpen: element !== null,
        }),
    isDetailsOpen: false,
    setDetailsOpen: (open) =>
        set({
            isDetailsOpen: open,
            selectedElement: open ? get().selectedElement : null,
        }),
}));
