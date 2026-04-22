/**
 * windowRegistry.ts
 *
 * Central registry for all floating window types in the window-panels system.
 *
 * Each entry maps a stable slug (stored in window_sessions.window_type) to:
 *  - overlayId: the key used in overlaySlice to open/close the window
 *  - label: human-readable name shown in the tray and window manager
 *  - defaultData: shape of the window-specific `data` field (serves as documentation + default)
 *  - ephemeral: if true, the window is not persisted to DB (no save row created)
 *
 * collectData / applyData are NOT stored here — they live as callbacks inside each
 * window component and are passed to WindowPanel via onCollectData / onSessionSaved props.
 * The registry is intentionally data-only so it can be imported server-side without
 * pulling in React/component code.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PanelState {
  windowState: "windowed" | "maximized" | "minimized";
  rect: { x: number; y: number; width: number; height: number };
  sidebarOpen?: boolean;
  /** Sidebar width as a percentage of the window (from ResizablePanel) */
  sidebarSize?: number;
  /** For future built-in tab system: currently active tab key */
  activeTab?: string;
  /** For future built-in tab system: all open tab keys */
  openTabs?: string[];
  zIndex?: number;
}

export interface WindowSessionRow {
  id: string;
  user_id: string;
  window_type: string;
  label: string | null;
  panel_state: PanelState;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WindowRegistryEntry {
  /** Stable slug stored in window_sessions.window_type. Use kebab-case. */
  slug: string;
  /** Key used in overlaySlice (openOverlay / closeOverlay). */
  overlayId: string;
  /** Human-readable display name. */
  label: string;
  /**
   * Default / empty shape for the window-type-specific data field.
   * Used as a type reference and fallback when restoring a session with missing keys.
   */
  defaultData: Record<string, unknown>;
  /**
   * When true, the window is NOT persisted to the DB.
   * The window will still work normally; it just won't create a window_sessions row.
   * Use for ephemeral tool windows where restoring state adds no value.
   */
  ephemeral?: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const REGISTRY: WindowRegistryEntry[] = [
  // ── Code Editor ───────────────────────────────────────────────────────────
  {
    slug: "code-editor-window",
    overlayId: "codeEditorWindow",
    label: "Code Editor",
    defaultData: {
      files: [],
      fileIds: [],
      activeFile: null,
      activeFileId: null,
      title: null,
    },
  },

  // ── Code File Manager (browse + organize persisted files) ─────────────────
  {
    slug: "code-file-manager-window",
    overlayId: "codeFileManagerWindow",
    label: "Code Files",
    defaultData: {
      selectedFolderId: null,
      searchQuery: "",
      sortBy: "updated",
    },
  },

  // ── Multi-file Smart Code Editor (agent-driven, many files) ──────────────
  {
    slug: "multi-file-smart-code-editor-window",
    overlayId: "multiFileSmartCodeEditorWindow",
    label: "Smart Multi-file Editor",
    // Ephemeral for the same reasons as the single-file variant — the agent
    // conversation cannot survive a reload, so we skip persistence.
    defaultData: {
      agentId: null,
      files: [],
      initialActiveFile: null,
      title: null,
      defaultWordWrap: "off",
      autoFormatOnOpen: false,
      variables: null,
    },
    ephemeral: true,
  },

  // ── Smart Code Editor (agent-driven single-file editor) ───────────────────
  {
    slug: "smart-code-editor-window",
    overlayId: "smartCodeEditorWindow",
    label: "Smart Code Editor",
    // Ephemeral: the agent conversation is a live stream — re-opening after
    // a reload would restore geometry but could not restore the agent state,
    // so we skip DB persistence entirely. `callbackGroupId` also can't cross
    // a reload, which reinforces the decision.
    defaultData: {
      agentId: null,
      initialCode: "",
      language: "plaintext",
      filePath: null,
      selection: null,
      diagnostics: null,
      title: null,
      variables: null,
    },
    ephemeral: true,
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  {
    slug: "notes-window",
    overlayId: "notesWindow",
    label: "Notes",
    defaultData: { openTabs: [], activeTabId: null },
  },

  // ── Notes Beta ────────────────────────────────────────────────────────────
  {
    slug: "notes-beta-window",
    overlayId: "notesBetaWindow",
    label: "Notes Beta",
    defaultData: { openNoteId: null },
  },

  // ── Quick Note Save (ephemeral capture surface) ───────────────────────────
  {
    slug: "quick-note-save-window",
    overlayId: "quickNoteSaveWindow",
    label: "Quick Save Note",
    defaultData: { initialContent: "", defaultFolder: "Scratch" },
    ephemeral: true,
  },

  // ── Quick Data ────────────────────────────────────────────────────────────
  {
    slug: "quick-data-window",
    overlayId: "quickDataWindow",
    label: "Data Tables",
    defaultData: { selectedTable: null, search: "", filters: {} },
  },

  // ── Quick Tasks ───────────────────────────────────────────────────────────
  {
    slug: "quick-tasks-window",
    overlayId: "quickTasksWindow",
    label: "Tasks",
    defaultData: { orgId: null, projectId: null, taskId: null, search: "" },
  },

  // ── Quick Task Save (ephemeral — create + scope-tag + link anything) ─────
  {
    slug: "task-quick-create-window",
    overlayId: "taskQuickCreateWindow",
    label: "Create Task",
    defaultData: {
      entity_type: null,
      entity_id: null,
      label: "",
      metadata: {},
      prePopulate: { title: "", description: "", priority: null },
    },
    ephemeral: true,
  },

  // ── Quick Files ───────────────────────────────────────────────────────────
  {
    slug: "quick-files-window",
    overlayId: "quickFilesWindow",
    label: "Files",
    defaultData: { bucket: null, path: null },
  },

  // ── Web Scraper ───────────────────────────────────────────────────────────
  {
    slug: "scraper-window",
    overlayId: "scraperWindow",
    label: "Web Scraper",
    defaultData: {
      mode: "single",
      url: "",
      keyword: "",
      maxPages: 1,
      results: [],
      scrapeStates: {},
      selectedIndex: null,
      activeTab: "results",
    },
  },

  // ── PDF Extractor ─────────────────────────────────────────────────────────
  {
    slug: "pdf-extractor-window",
    overlayId: "pdfExtractorWindow",
    label: "PDF Extractor",
    // File blobs cannot be restored; history contains text results only.
    // Users must re-upload the original file to re-extract.
    defaultData: { history: [], currentIndex: null },
  },

  // ── Gallery ───────────────────────────────────────────────────────────────
  {
    slug: "gallery-window",
    overlayId: "galleryWindow",
    label: "Gallery",
    // favorites replaces the localStorage "gallery-window-favorites" sidecar
    defaultData: {
      query: "",
      orientation: "all",
      viewMode: "grid",
      favorites: [],
    },
  },

  // ── News ──────────────────────────────────────────────────────────────────
  {
    slug: "news-window",
    overlayId: "newsWindow",
    label: "News",
    defaultData: { category: "general", country: "us" },
  },

  // ── Embedded browser (iframe) ────────────────────────────────────────────
  {
    slug: "browser-frame-window",
    overlayId: "browserFrameWindow",
    label: "Site frame",
    defaultData: {
      url: "https://lucide.dev/icons/",
      windowTitle: null,
    },
  },
  {
    slug: "browser-workbench-window",
    overlayId: "browserWorkbenchWindow",
    label: "Site workbench",
    defaultData: {
      bookmarks: [],
      tabs: [],
      activeTabId: null,
    },
  },

  // ── List Manager ──────────────────────────────────────────────────────────
  {
    slug: "list-manager-window",
    overlayId: "listManagerWindow",
    label: "List Manager",
    defaultData: { activeListId: null },
  },

  // ── User Preferences ──────────────────────────────────────────────────────
  {
    slug: "user-preferences-window",
    overlayId: "userPreferencesWindow",
    label: "Preferences",
    defaultData: { activeTab: null },
  },

  // ── Agent Settings ────────────────────────────────────────────────────────
  {
    slug: "agent-settings-window",
    overlayId: "agentSettingsWindow",
    label: "Agent Settings",
    defaultData: { initialAgentId: null, openedTabIds: [], activeTabId: null },
  },

  // ── Agent Run History ─────────────────────────────────────────────────────
  {
    slug: "agent-run-history-window",
    overlayId: "agentRunHistoryWindow",
    label: "Run History",
    defaultData: { agentId: null, selectedConversationId: null },
  },

  // ── Agent Run (full run experience in a floating window) ──────────────────
  {
    slug: "agent-run-window",
    overlayId: "agentRunWindow",
    label: "Agent Run",
    // agentId: the agent currently selected in the window header.
    // selectedConversationId: the past conversation loaded from the sidebar
    //   (null means "start a fresh conversation" when the window opens).
    // Live execution state (streaming messages, focus, input drafts) lives in
    // the agent execution Redux slices and cannot survive a reload, so only
    // the selection is persisted here.
    defaultData: { agentId: null, selectedConversationId: null },
  },

  // ── Agent Content ─────────────────────────────────────────────────────────
  {
    slug: "agent-content-window",
    overlayId: "agentContentWindow",
    label: "Agent Content",
    // activeTab: "messages" | "system" | "model" | "variables" | "tools" | "context" | "settings" | "share"
    defaultData: { initialAgentId: null, activeTab: "messages", tabs: null },
  },

  // ── Agent Content Sidebar ─────────────────────────────────────────────────
  {
    slug: "agent-content-sidebar-window",
    overlayId: "agentContentSidebarWindow",
    label: "Agent Editor",
    defaultData: { initialAgentId: null, activeTab: "messages" },
  },

  // ── Agent Gate ────────────────────────────────────────────────────────────
  {
    slug: "agent-gate-window",
    overlayId: "agentGateWindow",
    label: "Agent Gate",
    defaultData: { conversationId: null },
  },

  // ── Chat Debug ────────────────────────────────────────────────────────────
  {
    slug: "chat-debug-window",
    overlayId: "chatDebugWindow",
    label: "Chat Debug",
    defaultData: { sessionId: null },
    ephemeral: true,
  },

  // ── Agent Debug ───────────────────────────────────────────────────────────
  {
    slug: "agent-debug-window",
    overlayId: "agentDebugWindow",
    label: "Agent Debug",
    defaultData: { initialAgentId: null, initialConversationId: null },
    ephemeral: true,
  },

  // ── Instance UI State ─────────────────────────────────────────────────────
  {
    slug: "instance-ui-state-window",
    overlayId: "instanceUIStateWindow",
    label: "Instance UI State",
    defaultData: { selectedConversationId: null },
    ephemeral: true,
  },

  // ── Execution Inspector ───────────────────────────────────────────────────
  {
    slug: "exec-inspector-window",
    overlayId: "executionInspectorWindow",
    label: "Execution Inspector",
    defaultData: {},
    ephemeral: true,
  },

  // ── Context Switcher ──────────────────────────────────────────────────────
  {
    slug: "context-switcher-window",
    overlayId: "contextSwitcherWindow",
    label: "Context Switcher",
    defaultData: {},
    // Redux slice handles context ids; geometry is enough to restore
  },

  // ── Hierarchy Creation ────────────────────────────────────────────────────
  {
    slug: "hierarchy-creation-window",
    overlayId: "hierarchyCreationWindow",
    label: "New Organization / Project",
    defaultData: { entityType: null, presetIds: {} },
    ephemeral: true,
  },

  // ── Canvas Viewer ─────────────────────────────────────────────────────────
  {
    slug: "canvas-viewer-window",
    overlayId: "canvasViewerWindow",
    label: "Canvas Viewer",
    defaultData: { shareToken: null },
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  {
    slug: "feedback-window",
    overlayId: "feedbackDialog",
    label: "Feedback",
    defaultData: { draftText: null, attachmentUrls: [] },
  },

  // ── Share Modal ───────────────────────────────────────────────────────────
  {
    slug: "share-modal-window",
    overlayId: "shareModalWindow",
    label: "Share",
    defaultData: {
      resourceType: null,
      resourceId: null,
      resourceName: null,
      isOwner: false,
    },
  },

  // ── Email Dialog ──────────────────────────────────────────────────────────
  {
    slug: "email-dialog-window",
    overlayId: "emailDialogWindow",
    label: "Email",
    defaultData: { to: null, subject: null, draftBody: null },
  },

  // ── Markdown Editor ───────────────────────────────────────────────────────
  {
    slug: "markdown-editor-window",
    overlayId: "markdownEditorWindow",
    label: "Markdown Editor",
    defaultData: {
      content: null,
      processorId: null,
      coordinatorId: null,
      sampleId: null,
    },
  },

  // ── File Upload ───────────────────────────────────────────────────────────
  {
    slug: "file-upload-window",
    overlayId: "fileUploadWindow",
    label: "Upload Files",
    defaultData: {},
    ephemeral: true, // file blobs cannot be restored
  },

  // ── File Preview ──────────────────────────────────────────────────────────
  {
    slug: "file-preview-window",
    overlayId: "filePreviewWindow",
    label: "File Preview",
    defaultData: { bucket: null, path: null, url: null },
  },

  // ── Image Viewer ──────────────────────────────────────────────────────────
  {
    slug: "image-viewer-window",
    overlayId: "imageViewer",
    label: "Image Viewer",
    defaultData: { images: [], initialIndex: 0 },
  },

  // ── AI Voice ──────────────────────────────────────────────────────────────
  {
    slug: "ai-voice-window",
    overlayId: "aiVoiceWindow",
    label: "AI Voice",
    // Config only — audio streams cannot be restored
    defaultData: { voiceId: null, speed: null, model: null },
  },

  // ── Voice Pad ─────────────────────────────────────────────────────────────
  {
    slug: "voice-pad",
    overlayId: "voicePad",
    label: "Voice Pad",
    defaultData: { transcript: null },
  },
  {
    slug: "voice-pad-advanced",
    overlayId: "voicePadAdvanced",
    label: "Advanced Voice Pad",
    defaultData: { transcript: null },
  },
  {
    slug: "voice-pad-ai",
    overlayId: "voicePadAi",
    label: "Transcription Cleanup",
    defaultData: { transcript: null },
  },

  // ── Quick AI Results ──────────────────────────────────────────────────────
  {
    slug: "quick-ai-results",
    overlayId: "quickAIResults",
    label: "AI Results",
    defaultData: {},
    ephemeral: true,
  },

  // ── Stream Debug ──────────────────────────────────────────────────────────
  {
    slug: "stream-debug",
    overlayId: "streamDebug",
    label: "Stream Debug",
    // requestId is optional — when set, the panel is pinned to a specific
    // request (e.g. the one that produced an assistant message). When null,
    // the panel tracks the latest request for the conversation.
    defaultData: { conversationId: null, requestId: null },
    ephemeral: true,
  },

  // ── Message Analysis (per-assistant-message response stats) ──────────────
  {
    slug: "message-analysis-window",
    overlayId: "messageAnalysisWindow",
    label: "Response Analysis",
    // Creator-only window that inspects the request tied to a given assistant
    // message: token usage, cost, timings, tool calls, client metrics,
    // session totals. Ephemeral because `activeRequests` in Redux doesn't
    // survive a reload — there's no restorable state beyond geometry.
    defaultData: {
      conversationId: null,
      requestId: null,
      messageId: null,
      activeTab: "request",
    },
    ephemeral: true,
  },

  // ── Stream Debug History ──────────────────────────────────────────────────
  {
    slug: "stream-debug-history",
    overlayId: "streamDebugHistoryWindow",
    label: "Stream History",
    defaultData: { initialConversationId: null },
    ephemeral: true,
  },

  // ── State Analyzer ────────────────────────────────────────────────────────
  {
    slug: "state-analyzer-window",
    overlayId: "adminStateAnalyzerWindow",
    label: "State Analyzer",
    defaultData: {},
    ephemeral: true, // read-only view of Redux; nothing to restore
  },

  // ── JSON Truncator ────────────────────────────────────────────────────────
  {
    slug: "json-truncator",
    overlayId: "jsonTruncator",
    label: "JSON Truncator",
    defaultData: { input: null },
    ephemeral: true,
  },

  // ── Resource Picker ───────────────────────────────────────────────────────
  {
    slug: "resource-picker-window",
    overlayId: "resourcePickerWindow",
    label: "Resource Picker",
    defaultData: { lastResourceType: null },
    ephemeral: true,
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  {
    slug: "projects-window",
    overlayId: "projectsWindow",
    label: "Projects",
    defaultData: { orgId: null },
  },

  // ── Agent MD Debug ────────────────────────────────────────────────────────
  {
    slug: "agent-md-debug-window",
    overlayId: "agentAssistantMarkdownDebugWindow",
    label: "MD Debug",
    defaultData: {},
    ephemeral: true,
  },

  // ── Agent Import ──────────────────────────────────────────────────────────
  {
    slug: "agent-import-window",
    overlayId: "agentImportWindow",
    label: "Import Agent",
    defaultData: { selectedSource: "agent-json", pastedText: "" },
  },

  // ── Content Editor (single, no tabs, no sidebar) ──────────────────────────
  {
    slug: "content-editor-window",
    overlayId: "contentEditorWindow",
    label: "Content Editor",
    // callbackGroupId is omitted from persisted data — live callbacks cannot
    // survive a reload; the reopened window restores value but emits no events
    // until a new caller re-registers.
    defaultData: {
      documentId: "default",
      documentTitle: null,
      value: "",
      title: null,
    },
  },

  // ── Content Editor List (sidebar + single editor, no tabs) ────────────────
  {
    slug: "content-editor-list-window",
    overlayId: "contentEditorListWindow",
    label: "Content List Editor",
    defaultData: {
      documents: [],
      activeDocumentId: null,
      listTitle: null,
      title: null,
    },
  },

  // ── Content Editor Workspace (sidebar + tabs, full featured) ──────────────
  {
    slug: "content-editor-workspace-window",
    overlayId: "contentEditorWorkspaceWindow",
    label: "Content Workspace",
    defaultData: {
      documents: [],
      openDocumentIds: [],
      activeDocumentId: null,
      listTitle: null,
      title: null,
    },
  },

  // ── Agent Connections (Agent Connections hub) ──────────────────────────
  {
    slug: "agent-connections-window",
    overlayId: "agentConnectionsWindow",
    label: "Agent Connections",
    defaultData: {
      activeSection: "overview",
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Map from slug → entry (for DB lookups) */
export const WINDOW_REGISTRY_BY_SLUG: ReadonlyMap<string, WindowRegistryEntry> =
  new Map(REGISTRY.map((e) => [e.slug, e]));

/** Map from overlayId → entry (for component lookups) */
export const WINDOW_REGISTRY_BY_OVERLAY_ID: ReadonlyMap<
  string,
  WindowRegistryEntry
> = new Map(REGISTRY.map((e) => [e.overlayId, e]));

/** All registered entries (for iteration). */
export const ALL_WINDOW_REGISTRY_ENTRIES: ReadonlyArray<WindowRegistryEntry> =
  REGISTRY;

/**
 * Look up a registry entry by its overlay ID.
 * Returns undefined if the overlayId is not registered (e.g. non-window overlays).
 */
export function getRegistryEntryByOverlayId(
  overlayId: string,
): WindowRegistryEntry | undefined {
  return WINDOW_REGISTRY_BY_OVERLAY_ID.get(overlayId);
}

/**
 * Look up a registry entry by its slug.
 * Returns undefined if the slug is not found.
 */
export function getRegistryEntryBySlug(
  slug: string,
): WindowRegistryEntry | undefined {
  return WINDOW_REGISTRY_BY_SLUG.get(slug);
}

/**
 * True when the given overlayId maps to a non-ephemeral registered window.
 * Used by WindowPanel to decide whether to create a session row on save.
 */
export function isPersistableWindow(overlayId: string): boolean {
  const entry = WINDOW_REGISTRY_BY_OVERLAY_ID.get(overlayId);
  return entry !== undefined && !entry.ephemeral;
}
