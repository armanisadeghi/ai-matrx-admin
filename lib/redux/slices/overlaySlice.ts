// lib/redux/slices/overlaySlice.ts
//
// Instanced overlay state management.
//
// Every overlay supports two modes:
//   Singleton (default): dispatch(openHtmlPreview({ content }))
//     → uses instanceId 'default', one shared instance, existing behavior unchanged
//   Instanced: dispatch(openHtmlPreview({ content, instanceId: 'my-uuid' }))
//     → isolated instance, independent open/close/data, multiple can coexist
//
// State shape:
//   overlays: Record<overlayId, Record<instanceId, { isOpen: boolean; data: any }>>
//
// All existing callers that omit instanceId continue to work with zero changes.

import { createSlice, createSelector } from "@reduxjs/toolkit";

export const DEFAULT_INSTANCE_ID = "default";

// ============================================================================
// TYPES
// ============================================================================

export interface OverlayInstance {
  isOpen: boolean;
  data: any;
}

export interface OverlayState {
  overlays: Record<string, Record<string, OverlayInstance>>;
}

// ============================================================================
// HELPERS
// ============================================================================

function makeDefaultInstance(): Record<string, OverlayInstance> {
  return { [DEFAULT_INSTANCE_ID]: { isOpen: false, data: null } };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: OverlayState = {
  overlays: {
    brokerState: makeDefaultInstance(),
    markdownEditor: makeDefaultInstance(),
    socketAccordion: makeDefaultInstance(),
    adminStateAnalyzer: makeDefaultInstance(),
    adminIndicator: makeDefaultInstance(),
    // Quick Action Overlays
    quickNotes: makeDefaultInstance(),
    quickTasks: makeDefaultInstance(),
    quickChat: makeDefaultInstance(),
    quickData: makeDefaultInstance(),
    quickFiles: makeDefaultInstance(),
    quickUtilities: makeDefaultInstance(),
    quickAIResults: makeDefaultInstance(),
    fullScreenEditor: makeDefaultInstance(),
    htmlPreview: makeDefaultInstance(),
    userPreferences: makeDefaultInstance(),
    announcements: makeDefaultInstance(),
    // Message action overlays (available in all routes)
    saveToNotes: makeDefaultInstance(),
    emailDialog: makeDefaultInstance(),
    authGate: makeDefaultInstance(),
    contentHistory: makeDefaultInstance(),
    feedbackDialog: makeDefaultInstance(),
    shareModal: makeDefaultInstance(),
    voicePad: makeDefaultInstance(),
    undoHistory: makeDefaultInstance(),
    streamDebug: makeDefaultInstance(),
    jsonTruncator: makeDefaultInstance(),
    // Image viewer — instanced so multiple can be open at once
    imageViewer: makeDefaultInstance(),
    // Window panel specific components
    adminStateAnalyzerWindow: makeDefaultInstance(),
    markdownEditorWindow: makeDefaultInstance(),
    userPreferencesWindow: makeDefaultInstance(),
    quickTasksWindow: makeDefaultInstance(),
    quickDataWindow: makeDefaultInstance(),
    quickFilesWindow: makeDefaultInstance(),
    filePreviewWindow: makeDefaultInstance(),
    fileUploadWindow: makeDefaultInstance(),
    emailDialogWindow: makeDefaultInstance(),
    shareModalWindow: makeDefaultInstance(),
    scraperWindow: makeDefaultInstance(),
    contextSwitcherWindow: makeDefaultInstance(),
    canvasViewerWindow: makeDefaultInstance(),
    newsWindow: makeDefaultInstance(),
    galleryWindow: makeDefaultInstance(),
    listManagerWindow: makeDefaultInstance(),
    aiVoiceWindow: makeDefaultInstance(),
  },
};

// ============================================================================
// SLICE
// ============================================================================

const overlaySlice = createSlice({
  name: "overlays",
  initialState,
  reducers: {
    openOverlay: (state, action) => {
      const {
        overlayId,
        instanceId = DEFAULT_INSTANCE_ID,
        data,
      } = action.payload;
      if (!state.overlays[overlayId]) {
        state.overlays[overlayId] = {};
      }
      state.overlays[overlayId][instanceId] = {
        isOpen: true,
        data: data ?? null,
      };
    },

    closeOverlay: (state, action) => {
      const { overlayId, instanceId = DEFAULT_INSTANCE_ID } = action.payload;
      const instance = state.overlays[overlayId]?.[instanceId];
      if (instance) {
        instance.isOpen = false;
        instance.data = null;
      }
    },

    closeAllOverlays: (state) => {
      Object.values(state.overlays).forEach((instances) => {
        Object.values(instances).forEach((instance) => {
          instance.isOpen = false;
          instance.data = null;
        });
      });
    },

    toggleOverlay: (state, action) => {
      const {
        overlayId,
        instanceId = DEFAULT_INSTANCE_ID,
        data,
      } = action.payload;
      if (!state.overlays[overlayId]) {
        state.overlays[overlayId] = {};
      }
      const existing = state.overlays[overlayId][instanceId];
      if (!existing) {
        state.overlays[overlayId][instanceId] = {
          isOpen: true,
          data: data ?? null,
        };
      } else {
        existing.isOpen = !existing.isOpen;
        existing.data = existing.isOpen ? (data ?? existing.data) : null;
      }
    },
  },
});

// ============================================================================
// SELECTORS
// ============================================================================

type StateWithOverlays = { overlays: OverlayState };

/** Returns the instance record for a given overlay + instanceId. Falls back to closed/null. */
export const selectOverlay = (
  state: StateWithOverlays,
  overlayId: string,
  instanceId: string = DEFAULT_INSTANCE_ID,
): OverlayInstance =>
  state.overlays.overlays[overlayId]?.[instanceId] ?? {
    isOpen: false,
    data: null,
  };

/** True when the given overlay instance is open. */
export const selectIsOverlayOpen = (
  state: StateWithOverlays,
  overlayId: string,
  instanceId: string = DEFAULT_INSTANCE_ID,
): boolean => selectOverlay(state, overlayId, instanceId).isOpen;

/** Data payload for the given overlay instance. */
export const selectOverlayData = (
  state: StateWithOverlays,
  overlayId: string,
  instanceId: string = DEFAULT_INSTANCE_ID,
): any => selectOverlay(state, overlayId, instanceId).data;

/**
 * Returns all currently-open instances for a given overlayId.
 * Used by OverlayController to render instanced overlays via .map().
 *
 * Memoized per overlayId so the returned array reference is stable when
 * the open-instances set has not changed, preventing unnecessary re-renders.
 */
const _openInstancesCache = new Map<
  string,
  (state: StateWithOverlays) => Array<{ instanceId: string; data: any }>
>();

export const selectOpenInstances = (
  state: StateWithOverlays,
  overlayId: string,
): Array<{ instanceId: string; data: any }> => {
  if (!_openInstancesCache.has(overlayId)) {
    _openInstancesCache.set(
      overlayId,
      createSelector(
        (s: StateWithOverlays) => s.overlays.overlays[overlayId],
        (instances) => {
          if (!instances) return EMPTY_INSTANCES;
          const result: Array<{ instanceId: string; data: any }> = [];
          for (const [instanceId, inst] of Object.entries(instances)) {
            if (inst.isOpen) result.push({ instanceId, data: inst.data });
          }
          return result.length === 0 ? EMPTY_INSTANCES : result;
        },
      ),
    );
  }
  return _openInstancesCache.get(overlayId)!(state);
};

// Stable empty array — returned when there are no open instances so callers
// that do `instances.length === 0` checks don't get a new reference each render.
const EMPTY_INSTANCES: Array<{ instanceId: string; data: any }> = [];

export const { openOverlay, closeOverlay, closeAllOverlays, toggleOverlay } =
  overlaySlice.actions;
export default overlaySlice.reducer;

// ============================================================================
// TYPED OVERLAY ACTION CREATORS
// ============================================================================
// Convenience dispatchers that apply defaults and enforce the correct data
// shape for specific overlays. All accept optional instanceId for instanced use.
//
// Usage (singleton — unchanged from before):
//   dispatch(openFullScreenEditor({ content: '...' }))
//
// Usage (instanced — new):
//   dispatch(openFullScreenEditor({ content: '...', instanceId: myUuid }))

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
  instanceId?: string;
}

export const openFullScreenEditor = (options: FullScreenEditorPayload) =>
  openOverlay({
    overlayId: "fullScreenEditor",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      onSave: options.onSave,
      tabs: options.tabs ?? [
        "write",
        "matrx_split",
        "markdown",
        "wysiwyg",
        "preview",
      ],
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
  instanceId?: string;
}

export const openUserPreferences = (options?: PreferencesPayload) =>
  openOverlay({
    overlayId: "userPreferences",
    instanceId: options?.instanceId,
    data: options ? { initialTab: options.initialTab } : null,
  });

interface HtmlPreviewPayload {
  content: string;
  messageId?: string;
  conversationId?: string;
  title?: string;
  description?: string;
  onSave?: (markdownContent: string) => void;
  showSaveButton?: boolean;
  instanceId?: string;
}

export const openHtmlPreview = (options: HtmlPreviewPayload) =>
  openOverlay({
    overlayId: "htmlPreview",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      messageId: options.messageId,
      conversationId: options.conversationId,
      title: options.title ?? "HTML Preview & Publishing",
      description:
        options.description ??
        "Edit markdown, preview HTML, and publish your content",
      onSave: options.onSave,
      showSaveButton: options.showSaveButton ?? false,
    },
  });

export const openAnnouncements = () =>
  openOverlay({ overlayId: "announcements" });

interface SaveToNotesPayload {
  content: string;
  defaultFolder?: string;
  instanceId?: string;
}

export const openSaveToNotes = (options: SaveToNotesPayload) =>
  openOverlay({
    overlayId: "saveToNotes",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      defaultFolder: options.defaultFolder,
    },
  });

interface EmailDialogPayload {
  content: string;
  metadata?: Record<string, unknown> | null;
  instanceId?: string;
}

export const openEmailDialog = (options: EmailDialogPayload) =>
  openOverlay({
    overlayId: "emailDialog",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      metadata: options.metadata ?? null,
    },
  });

interface AuthGatePayload {
  featureName?: string;
  featureDescription?: string;
  instanceId?: string;
}

export const openAuthGate = (options?: AuthGatePayload) =>
  openOverlay({
    overlayId: "authGate",
    instanceId: options?.instanceId,
    data: options
      ? {
          featureName: options.featureName,
          featureDescription: options.featureDescription,
        }
      : null,
  });

interface ContentHistoryPayload {
  sessionId: string;
  messageId: string;
  instanceId?: string;
}

export const openContentHistory = (options: ContentHistoryPayload) =>
  openOverlay({
    overlayId: "contentHistory",
    instanceId: options.instanceId,
    data: {
      sessionId: options.sessionId,
      messageId: options.messageId,
    },
  });

export const openFeedbackDialog = () =>
  openOverlay({ overlayId: "feedbackDialog", data: null });

interface ShareModalPayload {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  isOwner: boolean;
  instanceId?: string;
}

export const openShareModal = (options: ShareModalPayload) =>
  openOverlay({
    overlayId: "shareModal",
    instanceId: options.instanceId,
    data: {
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      resourceName: options.resourceName,
      isOwner: options.isOwner,
    },
  });

interface UndoHistoryPayload {
  agentId: string;
}

export const openUndoHistory = (options: UndoHistoryPayload) =>
  openOverlay({
    overlayId: "undoHistory",
    data: { agentId: options.agentId },
  });

interface StreamDebugPayload {
  instanceId: string;
}

export const openStreamDebug = (options: StreamDebugPayload) =>
  openOverlay({
    overlayId: "streamDebug",
    data: { instanceId: options.instanceId },
  });

interface ContextSwitcherWindowPayload {
  instanceId?: string;
}

export const openContextSwitcherWindow = (options?: ContextSwitcherWindowPayload) =>
  openOverlay({
    overlayId: "contextSwitcherWindow",
    instanceId: options?.instanceId,
  });

interface CanvasViewerPayload {
  shareToken?: string;
  instanceId?: string;
}

export const openCanvasViewerWindow = (options?: CanvasViewerPayload) =>
  openOverlay({
    overlayId: "canvasViewerWindow",
    instanceId: options?.instanceId,
    data: { shareToken: options?.shareToken },
  });

interface ListManagerWindowPayload {
  instanceId?: string;
}

export const openListManagerWindow = (options?: ListManagerWindowPayload) =>
  openOverlay({
    overlayId: "listManagerWindow",
    instanceId: options?.instanceId,
  });

interface AiVoiceWindowPayload {
  instanceId?: string;
}

export const openAiVoiceWindow = (options?: AiVoiceWindowPayload) =>
  openOverlay({
    overlayId: "aiVoiceWindow",
    instanceId: options?.instanceId,
  });
