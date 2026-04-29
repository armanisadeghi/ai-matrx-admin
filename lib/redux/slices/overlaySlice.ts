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
import type { AgentContentTab } from "@/features/window-panels/windows/agents/agent-content.types";

export const DEFAULT_INSTANCE_ID = "default";

// ============================================================================
// TYPES
// ============================================================================

export interface OverlayInstance {
  isOpen: boolean;
  data: any;
  /**
   * Unix ms timestamp of the last open action. Used by `pruneStaleInstances`
   * to GC long-forgotten closed entries. Set on every open, untouched on
   * close so the age reflects when the user last used it.
   */
  lastUsedAt?: number;
}

export interface OverlayState {
  overlays: Record<string, Record<string, OverlayInstance>>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================
//
// Empty by design. Overlay keys are added lazily on first `openOverlay`
// (matches the registry — see `features/window-panels/registry/windowRegistry.ts`).
// Prior to 2026-04 this file hand-mirrored 77 registry keys; drift between
// registry and slice caused silent no-ops for unlisted overlays.

const initialState: OverlayState = {
  overlays: {},
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
        lastUsedAt: Date.now(),
      };
    },

    closeOverlay: (state, action) => {
      const { overlayId, instanceId = DEFAULT_INSTANCE_ID } = action.payload;
      const bucket = state.overlays[overlayId];
      if (!bucket) return;
      const instance = bucket[instanceId];
      if (!instance) return;

      // Multi-instance entries have unique (non-default) ids. Dropping them
      // immediately on close avoids unbounded growth of closed records.
      // Singleton ("default") entries flip isOpen but retain the slot so
      // subsequent selectors keep their stable reference.
      if (instanceId !== DEFAULT_INSTANCE_ID) {
        delete bucket[instanceId];
        if (Object.keys(bucket).length === 0) {
          delete state.overlays[overlayId];
        }
        return;
      }
      instance.isOpen = false;
      instance.data = null;
    },

    closeAllOverlays: (state) => {
      for (const [overlayId, bucket] of Object.entries(state.overlays)) {
        for (const [instanceId, instance] of Object.entries(bucket)) {
          if (instanceId === DEFAULT_INSTANCE_ID) {
            instance.isOpen = false;
            instance.data = null;
          } else {
            delete bucket[instanceId];
          }
        }
        if (Object.keys(bucket).length === 0) {
          delete state.overlays[overlayId];
        }
      }
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
          lastUsedAt: Date.now(),
        };
      } else if (existing.isOpen) {
        // Close branch — same semantics as closeOverlay.
        if (instanceId !== DEFAULT_INSTANCE_ID) {
          delete state.overlays[overlayId][instanceId];
          if (Object.keys(state.overlays[overlayId]).length === 0) {
            delete state.overlays[overlayId];
          }
        } else {
          existing.isOpen = false;
          existing.data = null;
        }
      } else {
        existing.isOpen = true;
        existing.data = data ?? existing.data;
        existing.lastUsedAt = Date.now();
      }
    },

    /**
     * Removes every instance of a given overlayId — useful when closing a
     * feature that opened many instanced overlays (e.g. closing an editor
     * that spawned multiple Content Editor tabs).
     */
    closeAllInstancesOfOverlay: (state, action) => {
      const { overlayId } = action.payload as { overlayId: string };
      delete state.overlays[overlayId];
    },

    /**
     * GC pass — removes closed instances last used more than
     * `olderThanMs` ago. Singleton slots are preserved regardless so the
     * selectors that return stable references don't thrash.
     *
     * Intended caller: idle sweep in WindowPersistenceManager (~30 min).
     */
    pruneStaleInstances: (state, action) => {
      const { olderThanMs } = action.payload as { olderThanMs: number };
      const cutoff = Date.now() - olderThanMs;
      for (const [overlayId, bucket] of Object.entries(state.overlays)) {
        for (const [instanceId, instance] of Object.entries(bucket)) {
          if (instanceId === DEFAULT_INSTANCE_ID) continue;
          if (instance.isOpen) continue;
          if (!instance.lastUsedAt || instance.lastUsedAt < cutoff) {
            delete bucket[instanceId];
          }
        }
        if (Object.keys(bucket).length === 0) {
          delete state.overlays[overlayId];
        }
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

export const {
  openOverlay,
  closeOverlay,
  closeAllOverlays,
  toggleOverlay,
  closeAllInstancesOfOverlay,
  pruneStaleInstances,
} = overlaySlice.actions;
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

/**
 * `mode` tells the OverlayController-mounted editor which save thunk to
 * dispatch on submit, so callers do NOT need to stash a closure-bearing
 * `onSave` callback in Redux state (non-serializable, blocks devtools, and
 * created the freeze the user reported).
 *
 * - `"assistant-message"` → `editMessage` thunk against `cx_message`
 * - `"user-message"`      → `editUserMessage` thunk (message + truncate)
 * - `"free"`              → no automatic dispatch; legacy `onSave` callback
 *                            field is consulted (for callers not yet migrated)
 */
export type FullScreenEditorMode =
  | "assistant-message"
  | "user-message"
  | "free";

interface FullScreenEditorPayload {
  content: string;
  /**
   * Save behaviour. Defaults to `"free"` (no automatic save, falls back to
   * the legacy `onSave` callback if provided). Migrate every caller off
   * `onSave` and onto a typed mode.
   */
  mode?: FullScreenEditorMode;
  /** Required for `mode === "assistant-message" | "user-message"`. */
  conversationId?: string;
  /** Required for `mode === "assistant-message" | "user-message"`. */
  messageId?: string;
  /**
   * @deprecated Use `mode` + ids instead. Storing functions in Redux state
   * is non-serializable and was the source of the assistant-edit freeze.
   * Kept for callers not yet migrated.
   */
  onSave?: (newContent: string) => void;
  tabs?: EditorTabId[];
  initialTab?: EditorTabId;
  analysisData?: Record<string, unknown>;
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
      mode: options.mode ?? "free",
      conversationId: options.conversationId,
      messageId: options.messageId,
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
  isAgentSystem?: boolean;
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
      isAgentSystem: options.isAgentSystem ?? false,
    },
  });

export const openAnnouncements = () =>
  openOverlay({ overlayId: "announcements" });

interface SaveToNotesPayload {
  content: string;
  defaultFolder?: string;
  instanceId?: string;
  /**
   * Initial editor mode for the save dialog. Pass `"plain"` for very large
   * payloads (e.g. extracted PDFs) where the markdown preview can lag or
   * crash. Default is `"split"`, set inside QuickNoteSaveCore.
   */
  initialEditorMode?: "plain" | "split" | "preview" | "wysiwyg" | "markdown-split";
}

export const openSaveToNotes = (options: SaveToNotesPayload) =>
  openOverlay({
    overlayId: "saveToNotes",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      defaultFolder: options.defaultFolder,
      initialEditorMode: options.initialEditorMode,
    },
  });

interface SaveToCodePayload {
  /** The code body to save. */
  content: string;
  /** Detected or caller-preferred language (e.g. "typescript"). */
  language?: string;
  /** Optional filename hint. */
  suggestedName?: string;
  /** Optional folder id to pre-select. */
  defaultFolderId?: string | null;
  instanceId?: string;
}

export const openSaveToCode = (options: SaveToCodePayload) =>
  openOverlay({
    overlayId: "saveToCode",
    instanceId: options.instanceId,
    data: {
      content: options.content,
      language: options.language ?? "plaintext",
      suggestedName: options.suggestedName,
      defaultFolderId: options.defaultFolderId ?? null,
    },
  });

interface CodeFileManagerWindowPayload {
  instanceId?: string;
}

export const openCodeFileManagerWindow = (
  options?: CodeFileManagerWindowPayload,
) =>
  openOverlay({
    overlayId: "codeFileManagerWindow",
    instanceId: options?.instanceId,
  });

interface CodeEditorWindowPayload {
  /** Optional pre-loaded in-memory files (legacy/session mode). */
  files?: unknown[];
  /** Optional persisted file ids to load + open on mount. */
  fileIds?: string[];
  /** Which tab to show active on open. */
  activeFileId?: string;
  title?: string;
  instanceId?: string;
}

export const openCodeEditorWindow = (options?: CodeEditorWindowPayload) =>
  openOverlay({
    overlayId: "codeEditorWindow",
    instanceId: options?.instanceId,
    data: options
      ? {
          files: options.files,
          fileIds: options.fileIds,
          activeFileId: options.activeFileId,
          title: options.title,
        }
      : null,
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
  conversationId: string;
  /** Pin the panel to a specific request (e.g. a given assistant message). */
  requestId?: string;
}

export const openStreamDebug = (options: StreamDebugPayload) =>
  openOverlay({
    overlayId: "streamDebug",
    data: {
      conversationId: options.conversationId,
      requestId: options.requestId ?? null,
    },
  });

interface MessageAnalysisWindowPayload {
  conversationId: string;
  /** The request that produced the message (from MessageRecord._streamRequestId). */
  requestId?: string | null;
  /** The message id for display context (not required for stats lookup). */
  messageId?: string | null;
}

export const openMessageAnalysisWindow = (
  options: MessageAnalysisWindowPayload,
) =>
  openOverlay({
    overlayId: "messageAnalysisWindow",
    data: {
      conversationId: options.conversationId,
      requestId: options.requestId ?? null,
      messageId: options.messageId ?? null,
    },
  });

interface ContextSwitcherWindowPayload {
  instanceId?: string;
}

export const openContextSwitcherWindow = (
  options?: ContextSwitcherWindowPayload,
) =>
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

interface AgentGateWindowPayload {
  /** The agent conversation instance whose gate input to render. */
  conversationId: string;
  /** Unique window panel ID — used as the overlay instance key. */
  gateWindowId: string;
  /** The overlay to open after the user clicks Continue (if any). */
  downstreamOverlayId?: string;
}

export const openAgentGateWindow = (options: AgentGateWindowPayload) =>
  openOverlay({
    overlayId: "agentGateWindow",
    instanceId: options.gateWindowId,
    data: {
      conversationId: options.conversationId,
      downstreamOverlayId: options.downstreamOverlayId,
    },
  });

interface HierarchyCreationWindowPayload {
  entityType: "organization" | "project" | "task";
  presetContext?: {
    organization_id?: string | null;
    project_id?: string | null;
  };
  instanceId?: string;
}

export const openHierarchyCreationWindow = (
  options: HierarchyCreationWindowPayload,
) =>
  openOverlay({
    overlayId: "hierarchyCreationWindow",
    instanceId: options.instanceId,
    data: {
      entityType: options.entityType,
      presetContext: options.presetContext,
    },
  });

interface AgentSettingsWindowPayload {
  agentId?: string;
  instanceId?: string;
}

export const openAgentSettingsWindow = (options?: AgentSettingsWindowPayload) =>
  openOverlay({
    overlayId: "agentSettingsWindow",
    instanceId: options?.instanceId,
    data: { initialAgentId: options?.agentId },
  });

interface AgentRunHistoryWindowPayload {
  agentId?: string;
}

export const openAgentRunHistoryWindow = (
  options?: AgentRunHistoryWindowPayload,
) =>
  openOverlay({
    overlayId: "agentRunHistoryWindow",
    data: { agentId: options?.agentId ?? null },
  });

interface AgentRunWindowPayload {
  agentId?: string | null;
  conversationId?: string | null;
}

export const openAgentRunWindow = (options?: AgentRunWindowPayload) =>
  openOverlay({
    overlayId: "agentRunWindow",
    data: {
      agentId: options?.agentId ?? null,
      selectedConversationId: options?.conversationId ?? null,
    },
  });

export const openAgentImportWindow = () =>
  openOverlay({ overlayId: "agentImportWindow", data: {} });

interface AgentContentWindowPayload {
  agentId?: string;
  initialTab?: AgentContentTab;
  /** Optional ordered subset of tabs to display; null = all 8 in default order */
  tabs?: AgentContentTab[] | null;
  instanceId?: string;
}

export const openAgentContentWindow = (options: AgentContentWindowPayload) =>
  openOverlay({
    overlayId: "agentAdvancedEditorWindow",
    instanceId: options?.instanceId,
    data: {
      initialAgentId: options.agentId ?? null,
      initialTab: options.initialTab,
      tabs: options.tabs ?? null,
    },
  });

interface AgentContentSidebarWindowPayload {
  agentId?: string;
  initialTab?: AgentContentTab;
  instanceId?: string;
}

export const openAgentContentSidebarWindow = (
  options?: AgentContentSidebarWindowPayload,
) =>
  openOverlay({
    overlayId: "agentContentSidebarWindow",
    instanceId: options?.instanceId,
    data: {
      initialAgentId: options?.agentId ?? null,
      initialTab: options?.initialTab,
    },
  });

// ============================================================================
// AGENT EXECUTION WIDGET OVERLAYS
// ============================================================================
// Each agent widget overlay is instanced — pass the agent execution instanceId
// as the overlay instanceId so multiple can coexist independently.

interface AgentWidgetPayload {
  instanceId: string;
}

interface AgentToastPayload {
  instanceId: string;
  index?: number;
}

export const openAgentFullModal = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentFullModal",
    instanceId: options.instanceId,
  });

export const openAgentCompactModal = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentCompactModal",
    instanceId: options.instanceId,
  });

export const openAgentChatBubble = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentChatBubble",
    instanceId: options.instanceId,
  });

export const openAgentInlineOverlay = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentInlineOverlay",
    instanceId: options.instanceId,
  });

export const openAgentSidebarOverlay = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentSidebarOverlay",
    instanceId: options.instanceId,
  });

export const openAgentFlexiblePanel = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentFlexiblePanel",
    instanceId: options.instanceId,
  });

export const openAgentPanelOverlay = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentPanelOverlay",
    instanceId: options.instanceId,
  });

export const openAgentToastOverlay = (options: AgentToastPayload) =>
  openOverlay({
    overlayId: "agentToastOverlay",
    instanceId: options.instanceId,
    data: { index: options.index ?? 0 },
  });

export const openAgentFloatingChat = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentFloatingChat",
    instanceId: options.instanceId,
  });

export const openAgentChatCollapsible = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentChatCollapsible",
    instanceId: options.instanceId,
  });

export const openAgentChatAssistant = (options: AgentWidgetPayload) =>
  openOverlay({
    overlayId: "agentChatAssistant",
    instanceId: options.instanceId,
  });

// ============================================================================
// AGENT PLACEHOLDER (COMING-SOON) OVERLAYS
// ============================================================================

interface AgentPlaceholderPayload {
  agentId?: string | null;
}

export const openAgentOptimizerWindow = (options?: AgentPlaceholderPayload) =>
  openOverlay({
    overlayId: "agentOptimizerWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentInterfaceVariationsWindow = (
  options?: AgentPlaceholderPayload,
) =>
  openOverlay({
    overlayId: "agentInterfaceVariationsWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentCreateAppWindow = (options?: AgentPlaceholderPayload) =>
  openOverlay({
    overlayId: "agentCreateAppWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentDataStorageWindow = (options?: AgentPlaceholderPayload) =>
  openOverlay({
    overlayId: "agentDataStorageWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentFindUsagesWindow = (options?: AgentPlaceholderPayload) =>
  openOverlay({
    overlayId: "agentFindUsagesWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentConvertSystemWindow = (
  options?: AgentPlaceholderPayload,
) =>
  openOverlay({
    overlayId: "agentConvertSystemWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentAdminShortcutWindow = (
  options?: AgentPlaceholderPayload,
) =>
  openOverlay({
    overlayId: "agentAdminShortcutWindow",
    data: { agentId: options?.agentId ?? null },
  });

export const openAgentAdminFindUsagesWindow = (
  options?: AgentPlaceholderPayload,
) =>
  openOverlay({
    overlayId: "agentAdminFindUsagesWindow",
    data: { agentId: options?.agentId ?? null },
  });
