// lib/redux/slices/overlaySlice.ts

import { createSlice } from '@reduxjs/toolkit';

// Define interface for overlay state
export interface OverlayState {
  overlays: {
    [key: string]: {
      isOpen: boolean;
      data: any;
    };
  };
}

const initialState: OverlayState = {
  overlays: {
    brokerState: { isOpen: false, data: null },
    markdownEditor: { isOpen: false, data: null },
    socketAccordion: { isOpen: false, data: null },
    adminStateAnalyzer: { isOpen: false, data: null },
    adminIndicator: { isOpen: false, data: null },
    // Quick Action Overlays
    quickNotes: { isOpen: false, data: null },
    quickTasks: { isOpen: false, data: null },
    quickChat: { isOpen: false, data: null },
    quickData: { isOpen: false, data: null },
    quickFiles: { isOpen: false, data: null },
    quickUtilities: { isOpen: false, data: null },
    quickAIResults: { isOpen: false, data: null },
    fullScreenEditor: { isOpen: false, data: null },
    htmlPreview: { isOpen: false, data: null },
    userPreferences: { isOpen: false, data: null },
    announcements: { isOpen: false, data: null },
    // ... other overlays
  },
};

const overlaySlice = createSlice({
  name: 'overlays',
  initialState,
  reducers: {
    openOverlay: (state, action) => {
      const { overlayId, data } = action.payload;
      state.overlays[overlayId] = { 
        isOpen: true, 
        data: data || null 
      };
    },
    closeOverlay: (state, action) => {
      const { overlayId } = action.payload;
      if (state.overlays[overlayId]) {
        state.overlays[overlayId].isOpen = false;
        state.overlays[overlayId].data = null;
      }
    },
    closeAllOverlays: (state) => {
      Object.keys(state.overlays).forEach(key => {
        state.overlays[key].isOpen = false;
        state.overlays[key].data = null;
      });
    },
    toggleOverlay: (state, action) => {
      const { overlayId, data } = action.payload;
      if (!state.overlays[overlayId]) {
        state.overlays[overlayId] = { isOpen: true, data: data || null };
      } else {
        state.overlays[overlayId].isOpen = !state.overlays[overlayId].isOpen;
        state.overlays[overlayId].data = state.overlays[overlayId].isOpen ? (data || state.overlays[overlayId].data) : null;
      }
    }
  },
});

// Selectors - use generic state type to avoid importing full RootState
// which would pull in the entire store.ts and its dependencies
type StateWithOverlays = { overlays: OverlayState };

export const selectOverlay = (state: StateWithOverlays, overlayId: string) => 
  state.overlays.overlays[overlayId] || { isOpen: false, data: null };

export const selectIsOverlayOpen = (state: StateWithOverlays, overlayId: string) => 
  selectOverlay(state, overlayId).isOpen;

export const selectOverlayData = (state: StateWithOverlays, overlayId: string) =>
  selectOverlay(state, overlayId).data;

export const { openOverlay, closeOverlay, closeAllOverlays, toggleOverlay } = overlaySlice.actions;
export default overlaySlice.reducer;

// ============================================================================
// TYPED OVERLAY ACTION CREATORS
// ============================================================================
// Convenience dispatchers that apply defaults and enforce the correct data
// shape for specific overlays. Usage: dispatch(openFullScreenEditor({ ... }))

type EditorTabId = "write" | "matrx_split" | "markdown" | "wysiwyg" | "preview";

interface FullScreenEditorPayload {
  content: string;
  onSave?: (newContent: string) => void;
  tabs?: EditorTabId[];
  initialTab?: EditorTabId;
  analysisData?: Record<string, unknown>;
  messageId?: string;
  title?: string;
  showSaveButton?: boolean;
  showCopyButton?: boolean;
}

export const openFullScreenEditor = (options: FullScreenEditorPayload) =>
  openOverlay({
    overlayId: "fullScreenEditor",
    data: {
      content: options.content,
      onSave: options.onSave,
      tabs: options.tabs ?? ["write", "matrx_split", "markdown", "wysiwyg", "preview"],
      initialTab: options.initialTab ?? "matrx_split",
      analysisData: options.analysisData,
      messageId: options.messageId,
      title: options.title,
      showSaveButton: options.showSaveButton ?? true,
      showCopyButton: options.showCopyButton ?? true,
    },
  });

interface PreferencesPayload {
  initialTab?: string;
}

export const openUserPreferences = (options?: PreferencesPayload) =>
  openOverlay({
    overlayId: "userPreferences",
    data: options ?? null,
  });

interface HtmlPreviewPayload {
  content: string;
  messageId?: string;
  title?: string;
  description?: string;
  onSave?: (markdownContent: string) => void;
  showSaveButton?: boolean;
}

export const openHtmlPreview = (options: HtmlPreviewPayload) =>
  openOverlay({
    overlayId: "htmlPreview",
    data: {
      content: options.content,
      messageId: options.messageId,
      title: options.title ?? "HTML Preview & Publishing",
      description: options.description ?? "Edit markdown, preview HTML, and publish your content",
      onSave: options.onSave,
      showSaveButton: options.showSaveButton ?? false,
    },
  });

export const openAnnouncements = () =>
  openOverlay({ overlayId: "announcements" });

