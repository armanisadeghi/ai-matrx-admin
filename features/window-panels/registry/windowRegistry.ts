/**
 * windowRegistry.ts
 *
 * Central registry for all floating overlays in the window-panels system —
 * classic windows, but also bottom sheets, modals, and inline/agent widgets.
 *
 * Each entry maps a stable slug (stored in window_sessions.window_type) to:
 *  - kind:             "window" | "widget" | "sheet" | "modal" — shapes renderer
 *                      behavior and mobile presentation defaults.
 *  - overlayId:        the key used in overlaySlice to open/close the overlay.
 *  - componentImport:  lazy dynamic-import returning { default: ComponentType }.
 *                      The UnifiedOverlayController uses this as the single
 *                      source of truth for which component to mount.
 *  - label:            human-readable name shown in the tray and window manager.
 *  - defaultData:      shape of the window-specific `data` field (serves as
 *                      documentation + fallback when restoring a session).
 *  - ephemeral:        if true, the overlay is not persisted to DB.
 *  - mobilePresentation: how this renders on mobile viewports — fullscreen,
 *                      drawer, card, or hidden. Required for kind: "window".
 *  - mobileSidebarAs:  only for kind: "window" with a sidebar — whether to
 *                      collapse the sidebar into a nested Drawer on mobile.
 *  - instanceMode:     "singleton" (default) or "multi" — multi allows many
 *                      concurrent instances addressed by instanceId.
 *  - urlSync:          optional { key } for `?panels=…` deep-linking.
 *  - icon / category:  consumed by the auto-derived Tools grid in the shell
 *                      sidebar (filled in Phase 3).
 *  - heavySnapshot / autosave: persistence opt-ins (filled in Phase 7).
 *  - seedData:         optional seeding function used by the Tools grid when
 *                      opening this overlay from the grid (e.g. inject the
 *                      currently-selected agent id).
 *
 * collectData / applyData are NOT stored here — they live as callbacks inside
 * each window component and are passed to WindowPanel via onCollectData /
 * onSessionSaved props. The registry is intentionally data-only so it can be
 * imported server-side without pulling in React/component code.
 */
import type { ComponentType } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The surface an overlay presents as.
 *  - "window" → mounts inside <WindowPanel> on desktop; adapts per
 *               mobilePresentation on mobile.
 *  - "widget" → inline overlay (floating chat, toast, sidecar, etc.) that
 *               does its own positioning; UnifiedOverlayController just
 *               renders it.
 *  - "sheet"  → bottom sheet / drawer that's not a floating window
 *               (QuickTasks, QuickData, etc. — usually opened from the
 *               shell footer).
 *  - "modal"  → centered modal / dialog. Uses its own portal.
 */
export type OverlayKind = "window" | "widget" | "sheet" | "modal";

/**
 * How a `kind: "window"` should present on mobile viewports.
 *  - "fullscreen" → occupies the viewport; current default for content.
 *  - "drawer"     → bottom sheet (vaul) — for sidebar-heavy and form windows.
 *  - "card"       → small z-stacked card — for utility/debug windows.
 *  - "hidden"     → do not mount on mobile at all.
 */
export type MobilePresentation = "fullscreen" | "drawer" | "card" | "hidden";

/** Whether a single overlay supports multiple concurrent instances. */
export type InstanceMode = "singleton" | "multi";

/**
 * For windows with a sidebar: whether the sidebar collapses into a nested
 * Drawer on mobile ("drawer") or stays inline ("inline"). Default "drawer".
 */
export type MobileSidebarAs = "drawer" | "inline";

/**
 * Loose string for now — Phase 3 will tighten this to a union of actual
 * Lucide icon names once the Tools grid is auto-derived. Keeping the field
 * here so entries can reference icons without importing React components.
 */
export type LucideIconName = string;

/**
 * Loose string for now — Phase 3 will tighten this to the canonical set of
 * Tools-grid categories ("notes", "agents", "data", "utilities", etc.).
 */
export type ToolsCategory = string;

/**
 * Shape of a lazy component import used by the unified renderer.
 *
 * Props are typed as `any` on purpose: the registry is a catalog of 50+ windows,
 * each with its own prop contract (often required props like `{ isOpen, onClose }`).
 * `ComponentType<Record<string, unknown>>` would reject every such component,
 * because an optional bag is NOT assignable to a specific required shape. The
 * unified renderer passes real props at mount time — the registry intentionally
 * opts out of cross-component prop-type checking here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentImport = () => Promise<{ default: ComponentType<any> }>;

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
  /** Surface kind — drives renderer behavior. */
  kind: OverlayKind;
  /**
   * Lazy dynamic import resolving to `{ default: Component }`. The unified
   * renderer feeds this into React.lazy / next/dynamic. Use named exports
   * via `.then(m => ({ default: m.Xxx }))`.
   */
  componentImport: ComponentImport;
  /** Human-readable display name. */
  label: string;
  /**
   * Default / empty shape for the window-type-specific data field.
   * Used as a type reference and fallback when restoring a session with
   * missing keys.
   */
  defaultData: Record<string, unknown>;
  /**
   * When true, the overlay is NOT persisted to the DB. Use for ephemeral
   * tool overlays where restoring state adds no value.
   */
  ephemeral?: boolean;
  /**
   * Required for kind: "window". Ignored for other kinds (those pick their
   * own mobile presentation internally).
   */
  mobilePresentation?: MobilePresentation;
  /**
   * Only applies to kind: "window" with a sidebar. Default: "drawer".
   */
  mobileSidebarAs?: MobileSidebarAs;
  /** Default: "singleton". */
  instanceMode?: InstanceMode;
  /** `?panels=<key>` deep-link key. Instance id is auto-appended. */
  urlSync?: { key: string };
  /** Lucide icon name for the Tools grid. Filled in Phase 3. */
  icon?: LucideIconName;
  /** Tools-grid category. Omit to exclude from the grid. Filled in Phase 3. */
  category?: ToolsCategory;
  /** Opt-in to snapshot-on-blur persistence for heavy in-memory buffers. */
  heavySnapshot?: boolean;
  /** Opt-in to autosave-on-blur / visibilitychange persistence. */
  autosave?: boolean;
  /**
   * Optional seed data builder invoked when opening this overlay from the
   * Tools grid (or other generic entry points). Runs client-side at click
   * time; can read Redux state via selectors passed by the grid host.
   */
  seedData?: (ctx: unknown) => Record<string, unknown> | undefined;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const REGISTRY: WindowRegistryEntry[] = [
  // ── Code Workspace (VSCode-style IDE) ─────────────────────────────────────
  {
    slug: "code-workspace",
    overlayId: "codeWorkspaceWindow",
    kind: "window",
    label: "Code Workspace",
    componentImport: () =>
      import("@/features/code/host/CodeWorkspaceWindow").then((m) => ({
        default: m.CodeWorkspaceWindow,
      })),
    defaultData: {
      title: null,
      sandboxId: null,
    },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Code Editor ───────────────────────────────────────────────────────────
  {
    slug: "code-editor-window",
    overlayId: "codeEditorWindow",
    kind: "window",
    label: "Code Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/code/CodeEditorWindow").then(
        (m) => ({ default: m.CodeEditorWindow }),
      ),
    defaultData: {
      files: [],
      fileIds: [],
      activeFile: null,
      activeFileId: null,
      title: null,
    },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Code File Manager (browse + organize persisted files) ─────────────────
  {
    slug: "code-file-manager-window",
    overlayId: "codeFileManagerWindow",
    kind: "window",
    label: "Code Files",
    componentImport: () =>
      import("@/features/window-panels/windows/code/CodeFileManagerWindow").then(
        (m) => ({ default: m.CodeFileManagerWindow }),
      ),
    defaultData: {
      selectedFolderId: null,
      searchQuery: "",
      sortBy: "updated",
    },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    instanceMode: "multi",
  },

  // ── Multi-file Smart Code Editor (agent-driven, many files) ──────────────
  {
    slug: "multi-file-smart-code-editor-window",
    overlayId: "multiFileSmartCodeEditorWindow",
    kind: "window",
    label: "Smart Multi-file Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/multi-file-smart-code-editor/MultiFileSmartCodeEditorWindow").then(
        (m) => ({ default: m.MultiFileSmartCodeEditorWindow }),
      ),
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
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Smart Code Editor (agent-driven single-file editor) ───────────────────
  {
    slug: "smart-code-editor-window",
    overlayId: "smartCodeEditorWindow",
    kind: "window",
    label: "Smart Code Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/smart-code-editor/SmartCodeEditorWindow").then(
        (m) => ({ default: m.SmartCodeEditorWindow }),
      ),
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
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  {
    slug: "notes-window",
    overlayId: "notesWindow",
    kind: "window",
    label: "Notes",
    componentImport: () =>
      import("@/features/window-panels/windows/notes/NotesWindow").then(
        (m) => ({ default: m.NotesWindow }),
      ),
    defaultData: { openTabs: [], activeTabId: null },
    mobilePresentation: "fullscreen",
    urlSync: { key: "notes" },
  },

  // ── Notes Beta ────────────────────────────────────────────────────────────
  {
    slug: "notes-beta-window",
    overlayId: "notesBetaWindow",
    kind: "window",
    label: "Notes Beta",
    componentImport: () =>
      import("@/features/window-panels/windows/notes/NotesBetaWindow").then(
        (m) => ({ default: m.NotesBetaWindow }),
      ),
    defaultData: { openNoteId: null },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Quick Note Save (ephemeral capture surface) ───────────────────────────
  {
    slug: "quick-note-save-window",
    overlayId: "quickNoteSaveWindow",
    kind: "window",
    label: "Quick Save Note",
    componentImport: () =>
      import("@/features/window-panels/windows/notes/QuickNoteSaveWindow"),
    defaultData: { initialContent: "", defaultFolder: "Scratch" },
    ephemeral: true,
    mobilePresentation: "drawer",
  },

  // ── Quick Data ────────────────────────────────────────────────────────────
  {
    slug: "quick-data-window",
    overlayId: "quickDataWindow",
    kind: "window",
    label: "Data Tables",
    componentImport: () =>
      import("@/features/window-panels/windows/QuickDataWindow"),
    defaultData: { selectedTable: null, search: "", filters: {} },
    mobilePresentation: "fullscreen",
    urlSync: { key: "quick_data" },
  },

  // ── Quick Tasks ───────────────────────────────────────────────────────────
  {
    slug: "quick-tasks-window",
    overlayId: "quickTasksWindow",
    kind: "window",
    label: "Tasks",
    componentImport: () =>
      import("@/features/window-panels/windows/context-scopes/QuickTasksWindow"),
    defaultData: { orgId: null, projectId: null, taskId: null, search: "" },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    urlSync: { key: "quick_tasks" },
  },

  // ── Quick Task Save (ephemeral — create + scope-tag + link anything) ─────
  {
    slug: "task-quick-create-window",
    overlayId: "taskQuickCreateWindow",
    kind: "window",
    label: "Create Task",
    componentImport: () =>
      import("@/features/window-panels/windows/tasks/TaskQuickCreateWindow"),
    defaultData: {
      entity_type: null,
      entity_id: null,
      label: "",
      metadata: {},
      prePopulate: { title: "", description: "", priority: null },
    },
    ephemeral: true,
    mobilePresentation: "drawer",
  },

  // ── Quick Files ───────────────────────────────────────────────────────────
  {
    slug: "quick-files-window",
    overlayId: "quickFilesWindow",
    kind: "window",
    label: "Files",
    componentImport: () =>
      import("@/features/window-panels/windows/files/QuickFilesWindow"),
    defaultData: { bucket: null, path: null },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    urlSync: { key: "files" },
  },

  // ── Web Scraper ───────────────────────────────────────────────────────────
  {
    slug: "scraper-window",
    overlayId: "scraperWindow",
    kind: "window",
    label: "Web Scraper",
    componentImport: () =>
      import("@/features/window-panels/windows/ScraperWindow"),
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
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
    urlSync: { key: "scraper" },
  },

  // ── PDF Extractor ─────────────────────────────────────────────────────────
  {
    slug: "pdf-extractor-window",
    overlayId: "pdfExtractorWindow",
    kind: "window",
    label: "PDF Extractor",
    componentImport: () =>
      import("@/features/window-panels/windows/PdfExtractorWindow"),
    // File blobs cannot be restored; history contains text results only.
    // Users must re-upload the original file to re-extract.
    defaultData: { history: [], currentIndex: null },
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
  },

  // ── Gallery ───────────────────────────────────────────────────────────────
  {
    slug: "gallery-window",
    overlayId: "galleryWindow",
    kind: "window",
    label: "Gallery",
    componentImport: () =>
      import("@/features/window-panels/windows/image/GalleryWindow"),
    // favorites replaces the localStorage "gallery-window-favorites" sidecar
    defaultData: {
      query: "",
      orientation: "all",
      viewMode: "grid",
      favorites: [],
    },
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
    urlSync: { key: "gallery" },
  },

  // ── News ──────────────────────────────────────────────────────────────────
  {
    slug: "news-window",
    overlayId: "newsWindow",
    kind: "window",
    label: "News",
    componentImport: () =>
      import("@/features/window-panels/windows/NewsWindow"),
    defaultData: { category: "general", country: "us" },
    mobilePresentation: "fullscreen",
    urlSync: { key: "news" },
  },

  // ── Embedded browser (iframe) ────────────────────────────────────────────
  {
    slug: "browser-frame-window",
    overlayId: "browserFrameWindow",
    kind: "window",
    label: "Site frame",
    componentImport: () =>
      import("@/features/window-panels/windows/iframe/BrowserFrameWindow"),
    defaultData: {
      url: "https://lucide.dev/icons/",
      windowTitle: null,
    },
    mobilePresentation: "fullscreen",
  },
  {
    slug: "browser-workbench-window",
    overlayId: "browserWorkbenchWindow",
    kind: "window",
    label: "Site workbench",
    componentImport: () =>
      import("@/features/window-panels/windows/iframe/BrowserWorkbenchWindow"),
    defaultData: {
      bookmarks: [],
      tabs: [],
      activeTabId: null,
    },
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
  },

  // ── List Manager ──────────────────────────────────────────────────────────
  {
    slug: "list-manager-window",
    overlayId: "listManagerWindow",
    kind: "window",
    label: "List Manager",
    componentImport: () =>
      import("@/features/window-panels/windows/ListManagerWindow"),
    defaultData: { activeListId: null },
    mobilePresentation: "fullscreen",
    urlSync: { key: "listManager" },
  },

  // ── User Preferences ──────────────────────────────────────────────────────
  {
    slug: "user-preferences-window",
    overlayId: "userPreferencesWindow",
    kind: "window",
    label: "Preferences",
    componentImport: () =>
      import("@/features/window-panels/windows/UserPreferencesWindow"),
    defaultData: { activeTab: null },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    urlSync: { key: "user_preferences" },
  },

  // ── Agent Settings ────────────────────────────────────────────────────────
  {
    slug: "agent-settings-window",
    overlayId: "agentSettingsWindow",
    kind: "window",
    label: "Agent Settings",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentSettingsWindow"),
    defaultData: { initialAgentId: null, openedTabIds: [], activeTabId: null },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    urlSync: { key: "agent-settings" },
  },

  // ── Agent Run History ─────────────────────────────────────────────────────
  {
    slug: "agent-run-history-window",
    overlayId: "agentRunHistoryWindow",
    kind: "window",
    label: "Run History",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentRunHistoryWindow"),
    defaultData: { agentId: null, selectedConversationId: null },
    mobilePresentation: "fullscreen",
  },

  // ── Agent Run (full run experience in a floating window) ──────────────────
  {
    slug: "agent-run-window",
    overlayId: "agentRunWindow",
    kind: "window",
    label: "Agent Run",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentRunWindow"),
    // agentId: the agent currently selected in the window header.
    // selectedConversationId: the past conversation loaded from the sidebar
    //   (null means "start a fresh conversation" when the window opens).
    // Live execution state (streaming messages, focus, input drafts) lives in
    // the agent execution Redux slices and cannot survive a reload, so only
    // the selection is persisted here.
    defaultData: { agentId: null, selectedConversationId: null },
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
    urlSync: { key: "agent" },
  },

  // ── Agent Content (legacy/primary advanced editor) ────────────────────────
  {
    slug: "agent-advanced-editor-window",
    overlayId: "agentAdvancedEditorWindow",
    kind: "window",
    label: "Agent Advanced Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentContentWindow"),
    // activeTab: "messages" | "system" | "model" | "variables" | "tools" | "context" | "settings" | "share"
    defaultData: { initialAgentId: null, activeTab: "messages", tabs: null },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    urlSync: { key: "agent-content" },
  },

  // ── Agent Content Sidebar ─────────────────────────────────────────────────
  {
    slug: "agent-content-sidebar-window",
    overlayId: "agentContentSidebarWindow",
    kind: "window",
    label: "Agent Editor (Sidebar)",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentContentSidebarWindow"),
    defaultData: { initialAgentId: null, activeTab: "messages" },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
  },

  // ── Agent Gate ────────────────────────────────────────────────────────────
  {
    slug: "agent-gate-window",
    overlayId: "agentGateWindow",
    kind: "window",
    label: "Agent Gate",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentGateWindow"),
    defaultData: { conversationId: null },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Chat Debug ────────────────────────────────────────────────────────────
  {
    slug: "chat-debug-window",
    overlayId: "chatDebugWindow",
    kind: "window",
    label: "Chat Debug",
    componentImport: () =>
      import("@/features/window-panels/windows/admin/ChatDebugWindow"),
    defaultData: { sessionId: null },
    ephemeral: true,
    mobilePresentation: "card",
  },

  // ── Agent Debug ───────────────────────────────────────────────────────────
  {
    slug: "agent-debug-window",
    overlayId: "agentDebugWindow",
    kind: "window",
    label: "Agent Debug",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentDebugWindow"),
    defaultData: { initialAgentId: null, initialConversationId: null },
    ephemeral: true,
    mobilePresentation: "card",
  },

  // ── Instance UI State ─────────────────────────────────────────────────────
  {
    slug: "instance-ui-state-window",
    overlayId: "instanceUIStateWindow",
    kind: "window",
    label: "Instance UI State",
    componentImport: () =>
      import("@/features/window-panels/windows/admin/InstanceUIStateWindow"),
    defaultData: { selectedConversationId: null },
    ephemeral: true,
    mobilePresentation: "card",
  },

  // ── Execution Inspector ───────────────────────────────────────────────────
  {
    slug: "exec-inspector-window",
    overlayId: "executionInspectorWindow",
    kind: "window",
    label: "Execution Inspector",
    componentImport: () =>
      import("@/features/window-panels/windows/admin/ExecutionInspectorWindow"),
    defaultData: {},
    ephemeral: true,
    mobilePresentation: "card",
    urlSync: { key: "exec-inspector" },
  },

  // ── Context Switcher ──────────────────────────────────────────────────────
  {
    slug: "context-switcher-window",
    overlayId: "contextSwitcherWindow",
    kind: "window",
    label: "Context Switcher",
    componentImport: () =>
      import("@/features/window-panels/windows/context-scopes/ContextSwitcherWindow").then(
        (m) => ({ default: m.ContextSwitcherWindow }),
      ),
    defaultData: {},
    // Redux slice handles context ids; geometry is enough to restore
    mobilePresentation: "drawer",
  },

  // ── Hierarchy Creation ────────────────────────────────────────────────────
  {
    slug: "hierarchy-creation-window",
    overlayId: "hierarchyCreationWindow",
    kind: "window",
    label: "New Organization / Project",
    componentImport: () =>
      import("@/features/window-panels/windows/context-scopes/HierarchyCreationWindow"),
    defaultData: { entityType: null, presetIds: {} },
    ephemeral: true,
    mobilePresentation: "drawer",
  },

  // ── Canvas Viewer ─────────────────────────────────────────────────────────
  {
    slug: "canvas-viewer-window",
    overlayId: "canvasViewerWindow",
    kind: "window",
    label: "Canvas Viewer",
    componentImport: () =>
      import("@/features/window-panels/windows/CanvasViewerWindow").then(
        (m) => ({ default: m.CanvasViewerWindow }),
      ),
    defaultData: { shareToken: null },
    mobilePresentation: "fullscreen",
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  {
    slug: "feedback-window",
    overlayId: "feedbackDialog",
    kind: "window",
    label: "Feedback",
    componentImport: () =>
      import("@/features/window-panels/windows/FeedbackWindow").then((m) => ({
        default: m.FeedbackWindow,
      })),
    defaultData: { draftText: null, attachmentUrls: [] },
    mobilePresentation: "drawer",
    urlSync: { key: "feedback" },
  },

  // ── Share Modal Window ────────────────────────────────────────────────────
  {
    slug: "share-modal-window",
    overlayId: "shareModalWindow",
    kind: "window",
    label: "Share",
    componentImport: () =>
      import("@/features/window-panels/windows/ShareModalWindow"),
    defaultData: {
      resourceType: null,
      resourceId: null,
      resourceName: null,
      isOwner: false,
    },
    mobilePresentation: "drawer",
    urlSync: { key: "share_modal" },
  },

  // ── Email Dialog ──────────────────────────────────────────────────────────
  {
    slug: "email-dialog-window",
    overlayId: "emailDialogWindow",
    kind: "window",
    label: "Email",
    componentImport: () =>
      import("@/features/window-panels/windows/EmailDialogWindow"),
    defaultData: { to: null, subject: null, draftBody: null },
    mobilePresentation: "drawer",
    urlSync: { key: "email_dialog" },
  },

  // ── Markdown Editor ───────────────────────────────────────────────────────
  {
    slug: "markdown-editor-window",
    overlayId: "markdownEditorWindow",
    kind: "window",
    label: "Markdown Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/MarkdownEditorWindow"),
    defaultData: {
      content: null,
      processorId: null,
      coordinatorId: null,
      sampleId: null,
    },
    mobilePresentation: "fullscreen",
    urlSync: { key: "markdown_editor" },
  },

  // ── File Upload ───────────────────────────────────────────────────────────
  {
    slug: "file-upload-window",
    overlayId: "fileUploadWindow",
    kind: "window",
    label: "Upload Files",
    componentImport: () =>
      import("@/features/window-panels/windows/files/FileUploadWindow"),
    defaultData: {},
    ephemeral: true, // file blobs cannot be restored
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
  },

  // ── File Preview ──────────────────────────────────────────────────────────
  {
    slug: "file-preview-window",
    overlayId: "filePreviewWindow",
    kind: "window",
    label: "File Preview",
    componentImport: () =>
      import("@/features/window-panels/windows/files/FilePreviewWindow").then(
        (m) => ({ default: m.FilePreviewWindow }),
      ),
    defaultData: { bucket: null, path: null, url: null },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Image Viewer ──────────────────────────────────────────────────────────
  {
    slug: "image-viewer-window",
    overlayId: "imageViewer",
    kind: "window",
    label: "Image Viewer",
    componentImport: () =>
      import("@/features/window-panels/windows/image/ImageViewerWindow").then(
        (m) => ({ default: m.ImageViewerWindow }),
      ),
    defaultData: { images: [], initialIndex: 0 },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Image Uploader (Sharp variants via /api/images/upload) ────────────────
  {
    slug: "image-uploader-window",
    overlayId: "imageUploaderWindow",
    kind: "window",
    componentImport: () =>
      import("@/features/window-panels/windows/image/ImageUploaderWindow"),
    // Ephemeral: the callback group that ties this window back to its caller
    // cannot survive a reload, so restoring geometry would leave the window
    // disconnected from the page that opened it. Open fresh each time.
    label: "Upload Image",
    defaultData: {
      callbackGroupId: null,
      preset: "social",
      bucket: null,
      folder: null,
      title: null,
      description: null,
      currentUrl: null,
      allowUrlPaste: true,
    },
    ephemeral: true,
    mobilePresentation: "drawer",
    instanceMode: "multi",
  },

  // ── AI Voice ──────────────────────────────────────────────────────────────
  {
    slug: "ai-voice-window",
    overlayId: "aiVoiceWindow",
    kind: "window",
    label: "AI Voice",
    componentImport: () =>
      import("@/features/window-panels/windows/voice/AiVoiceWindow"),
    // Config only — audio streams cannot be restored
    defaultData: { voiceId: null, speed: null, model: null },
    mobilePresentation: "fullscreen",
    urlSync: { key: "aiVoiceWindow" },
  },

  // ── Voice Pad ─────────────────────────────────────────────────────────────
  {
    slug: "voice-pad",
    overlayId: "voicePad",
    kind: "window",
    label: "Voice Pad",
    componentImport: () =>
      import("@/components/official-candidate/voice-pad/components/VoicePad"),
    defaultData: { transcript: null },
    mobilePresentation: "fullscreen",
    urlSync: { key: "voice" },
  },
  {
    slug: "voice-pad-advanced",
    overlayId: "voicePadAdvanced",
    kind: "window",
    label: "Advanced Voice Pad",
    componentImport: () =>
      import("@/components/official-candidate/voice-pad/components/VoicePadAdvanced"),
    defaultData: { transcript: null },
    mobilePresentation: "fullscreen",
  },
  {
    slug: "voice-pad-ai",
    overlayId: "voicePadAi",
    kind: "window",
    label: "Transcription Cleanup",
    componentImport: () =>
      import("@/components/official-candidate/voice-pad/components/VoicePadAi"),
    defaultData: { transcript: null },
    mobilePresentation: "fullscreen",
  },

  // ── Quick AI Results ──────────────────────────────────────────────────────
  {
    slug: "quick-ai-results",
    overlayId: "quickAIResults",
    kind: "sheet",
    label: "AI Results",
    componentImport: () =>
      import("@/features/prompts/components/results-display/QuickAIResultsSheet").then(
        (m) => ({ default: m.QuickAIResultsSheet }),
      ),
    defaultData: {},
    ephemeral: true,
  },

  // ── Stream Debug ──────────────────────────────────────────────────────────
  {
    slug: "stream-debug",
    overlayId: "streamDebug",
    kind: "widget",
    label: "Stream Debug",
    componentImport: () =>
      import("@/features/agents/components/debug/StreamDebugFloating").then(
        (m) => ({ default: m.StreamDebugFloating }),
      ),
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
    kind: "window",
    label: "Response Analysis",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/MessageAnalysisWindow"),
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
    mobilePresentation: "card",
  },

  // ── Stream Debug History ──────────────────────────────────────────────────
  {
    slug: "stream-debug-history",
    overlayId: "streamDebugHistoryWindow",
    kind: "window",
    label: "Stream History",
    componentImport: () =>
      import("@/features/window-panels/windows/admin/StreamDebugHistoryWindow"),
    defaultData: { initialConversationId: null },
    ephemeral: true,
    mobilePresentation: "card",
  },

  // ── State Analyzer ────────────────────────────────────────────────────────
  {
    slug: "state-analyzer-window",
    overlayId: "adminStateAnalyzerWindow",
    kind: "window",
    label: "State Analyzer",
    componentImport: () =>
      import("@/components/admin/state-analyzer/StateViewerWindow"),
    defaultData: {},
    ephemeral: true, // read-only view of Redux; nothing to restore
    mobilePresentation: "card",
    urlSync: { key: "state_analyzer" },
  },

  // ── JSON Truncator ────────────────────────────────────────────────────────
  {
    slug: "json-truncator",
    overlayId: "jsonTruncator",
    kind: "modal",
    label: "JSON Truncator",
    componentImport: () =>
      import("@/components/official-candidate/json-truncator/JsonTruncatorDialog"),
    defaultData: { input: null },
    ephemeral: true,
    urlSync: { key: "json_truncator" },
  },

  // ── Resource Picker ───────────────────────────────────────────────────────
  {
    slug: "resource-picker-window",
    overlayId: "resourcePickerWindow",
    kind: "window",
    label: "Resource Picker",
    componentImport: () =>
      import("@/features/window-panels/windows/ResourcePickerWindow").then(
        (m) => ({ default: m.ResourcePickerWindow }),
      ),
    defaultData: { lastResourceType: null },
    ephemeral: true,
    mobilePresentation: "drawer",
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  {
    slug: "projects-window",
    overlayId: "projectsWindow",
    kind: "window",
    label: "Projects",
    componentImport: () =>
      import("@/features/window-panels/windows/context-scopes/ProjectsWindow"),
    defaultData: { orgId: null },
    mobilePresentation: "fullscreen",
  },

  // ── Agent MD Debug ────────────────────────────────────────────────────────
  {
    slug: "agent-md-debug-window",
    overlayId: "agentAssistantMarkdownDebugWindow",
    kind: "window",
    label: "MD Debug",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentAssistantMarkdownDebugWindow"),
    defaultData: {},
    ephemeral: true,
    mobilePresentation: "card",
    urlSync: { key: "agent-md-debug" },
  },

  // ── Agent Import ──────────────────────────────────────────────────────────
  {
    slug: "agent-import-window",
    overlayId: "agentImportWindow",
    kind: "window",
    label: "Import Agent",
    componentImport: () => import("@/features/agents/import/AgentImportWindow"),
    defaultData: { selectedSource: "agent-json", pastedText: "" },
    mobilePresentation: "drawer",
  },

  // ── Content Editor (single, no tabs, no sidebar) ──────────────────────────
  {
    slug: "content-editor-window",
    overlayId: "contentEditorWindow",
    kind: "window",
    label: "Content Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/content-editors/ContentEditorWindow").then(
        (m) => ({ default: m.ContentEditorWindow }),
      ),
    // callbackGroupId is omitted from persisted data — live callbacks cannot
    // survive a reload; the reopened window restores value but emits no events
    // until a new caller re-registers.
    defaultData: {
      documentId: "default",
      documentTitle: null,
      value: "",
      title: null,
    },
    mobilePresentation: "fullscreen",
    instanceMode: "multi",
  },

  // ── Content Editor List (sidebar + single editor, no tabs) ────────────────
  {
    slug: "content-editor-list-window",
    overlayId: "contentEditorListWindow",
    kind: "window",
    label: "Content List Editor",
    componentImport: () =>
      import("@/features/window-panels/windows/content-editors/ContentEditorListWindow").then(
        (m) => ({ default: m.ContentEditorListWindow }),
      ),
    defaultData: {
      documents: [],
      activeDocumentId: null,
      listTitle: null,
      title: null,
    },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    instanceMode: "multi",
  },

  // ── Content Editor Workspace (sidebar + tabs, full featured) ──────────────
  {
    slug: "content-editor-workspace-window",
    overlayId: "contentEditorWorkspaceWindow",
    kind: "window",
    label: "Content Workspace",
    componentImport: () =>
      import("@/features/window-panels/windows/content-editors/ContentEditorWorkspaceWindow").then(
        (m) => ({ default: m.ContentEditorWorkspaceWindow }),
      ),
    defaultData: {
      documents: [],
      openDocumentIds: [],
      activeDocumentId: null,
      listTitle: null,
      title: null,
    },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
    instanceMode: "multi",
  },

  // ── Agent Connections (Agent Connections hub) ──────────────────────────
  {
    slug: "agent-connections-window",
    overlayId: "agentConnectionsWindow",
    kind: "window",
    label: "Agent Connections",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentConnectionsWindow"),
    defaultData: {
      activeSection: "overview",
      scope: "user",
      scopeId: null,
      selectedItemId: null,
    },
    mobilePresentation: "drawer",
    mobileSidebarAs: "drawer",
  },

  // ── Agent Placeholder Windows (coming-soon surfaces) ──────────────────────
  {
    slug: "agent-optimizer-window",
    overlayId: "agentOptimizerWindow",
    kind: "window",
    label: "Matrx Agent Optimizer",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentPlaceholderWindows").then(
        (m) => ({ default: m.AgentOptimizerWindow }),
      ),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-interface-variations-window",
    overlayId: "agentInterfaceVariationsWindow",
    kind: "window",
    label: "Interface Variations",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentPlaceholderWindows").then(
        (m) => ({ default: m.AgentInterfaceVariationsWindow }),
      ),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-create-app-window",
    overlayId: "agentCreateAppWindow",
    kind: "window",
    label: "Create Agent App",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentCreateAppWindow"),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-data-storage-window",
    overlayId: "agentDataStorageWindow",
    kind: "window",
    label: "Data Storage Support",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentPlaceholderWindows").then(
        (m) => ({ default: m.AgentDataStorageWindow }),
      ),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-find-usages-window",
    overlayId: "agentFindUsagesWindow",
    kind: "window",
    label: "Find Usages",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentPlaceholderWindows").then(
        (m) => ({ default: m.AgentFindUsagesWindow }),
      ),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-convert-system-window",
    overlayId: "agentConvertSystemWindow",
    kind: "window",
    label: "Convert to System Agent",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentConvertSystemWindow"),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },
  {
    slug: "agent-admin-shortcut-window",
    overlayId: "agentAdminShortcutWindow",
    kind: "window",
    label: "Create Shortcut",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentShortcutQuickCreateWindow"),
    // activeTab: which tab of the quick-create form the user last had open
    //   ("essentials" | "variables" | "details" | "advanced" | "link" | "json").
    //   agentId is required to make the window meaningful — it's the live
    //   agent whose shortcut is being created or linked. Ephemeral because
    //   this is a one-shot create action; the window should not reopen on
    //   reload.
    defaultData: { agentId: null, activeTab: "essentials" },
    ephemeral: true,
    mobilePresentation: "drawer",
  },
  {
    slug: "agent-admin-find-usages-window",
    overlayId: "agentAdminFindUsagesWindow",
    kind: "window",
    label: "Find Usages (Admin)",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/AgentPlaceholderWindows").then(
        (m) => ({ default: m.AgentAdminFindUsagesWindow }),
      ),
    defaultData: { agentId: null },
    ephemeral: true,
    mobilePresentation: "fullscreen",
  },

  // ── Observational Memory (admin-gated per-conversation inspector) ─────────
  {
    slug: "observational-memory-window",
    overlayId: "observationalMemoryWindow",
    kind: "window",
    label: "Memory Inspector",
    componentImport: () =>
      import("@/features/window-panels/windows/agents/ObservationalMemoryWindow"),
    // selectedConversationId: the conversation being inspected (admin selects
    //   from the sidebar list of conversations that have memory enabled or
    //   have emitted memory events this session). Persisting the selection
    //   lets admins reopen to the same conversation after a reload.
    defaultData: { selectedConversationId: null },
    mobilePresentation: "fullscreen",
    mobileSidebarAs: "drawer",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NON-WINDOW OVERLAYS (widgets / sheets / modals)
  //
  // These render alongside floating windows but don't mount <WindowPanel>.
  // They own their own portal and positioning (drawers, dialogs, inline
  // overlays). All ephemeral — the registry only tracks them for the
  // UnifiedOverlayController render loop and for the Tools grid.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Widgets: fullscreen inspectors/editors (legacy — replaced by *Window variants) ──
  {
    slug: "markdown-editor-fullscreen",
    overlayId: "markdownEditor",
    kind: "widget",
    label: "Markdown Editor (fullscreen)",
    componentImport: () =>
      import("@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor"),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "socket-accordion-fullscreen",
    overlayId: "socketAccordion",
    kind: "widget",
    label: "Socket Accordion",
    componentImport: () =>
      import("@/components/socket/response/FullscreenSocketAccordion"),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "broker-state-fullscreen",
    overlayId: "brokerState",
    kind: "widget",
    label: "Broker State",
    componentImport: () =>
      import("@/features/applet/runner/response/FullscreenBrokerState"),
    defaultData: {},
    ephemeral: true,
  },

  // ── Widgets: shell-level announcements / history / debug ─────────────────
  {
    slug: "announcements",
    overlayId: "announcements",
    kind: "widget",
    label: "Announcements",
    componentImport: () =>
      import("@/components/layout/AnnouncementsViewer").then((m) => ({
        default: m.AnnouncementsViewer,
      })),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "undo-history",
    overlayId: "undoHistory",
    kind: "widget",
    label: "Undo History",
    componentImport: () =>
      import("@/features/agents/components/undo-history/UndoHistoryOverlay").then(
        (m) => ({ default: m.UndoHistoryOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "admin-state-analyzer",
    overlayId: "adminStateAnalyzer",
    kind: "widget",
    label: "State Analyzer (overlay)",
    componentImport: () =>
      import("@/components/admin/state-analyzer/StateViewerOverlay"),
    defaultData: {},
    ephemeral: true,
  },

  // ── Widgets: multi-instance inline overlays ──────────────────────────────
  {
    slug: "html-preview",
    overlayId: "htmlPreview",
    kind: "widget",
    label: "HTML Preview",
    componentImport: () =>
      import("@/features/cx-conversation/components/HtmlPreviewBridge").then(
        (m) => ({ default: m.HtmlPreviewBridge }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "full-screen-editor",
    overlayId: "fullScreenEditor",
    kind: "widget",
    label: "Fullscreen Chat Editor",
    componentImport: () =>
      import("@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor"),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "content-history",
    overlayId: "contentHistory",
    kind: "widget",
    label: "Content History",
    componentImport: () =>
      import("@/features/agents/components/TO-BE-ORGANIZED/ContentHistoryViewer").then(
        (m) => ({ default: m.ContentHistoryViewer }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "save-to-notes",
    overlayId: "saveToNotes",
    kind: "widget",
    label: "Save to Notes",
    componentImport: () =>
      import("@/features/notes/actions/quick-save/QuickNoteSaveOverlay").then(
        (m) => ({ default: m.QuickNoteSaveOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "save-to-notes-fullscreen",
    overlayId: "saveToNotesFullscreen",
    kind: "widget",
    label: "Save to Notes (fullscreen)",
    componentImport: () =>
      import("@/features/notes/actions/quick-save/QuickNoteSaveOverlay").then(
        (m) => ({ default: m.QuickNoteSaveOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "save-to-code",
    overlayId: "saveToCode",
    kind: "widget",
    label: "Save Code",
    componentImport: () =>
      import("@/features/code-files/actions/QuickSaveCodeDialog").then((m) => ({
        default: m.QuickSaveCodeDialog,
      })),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },

  // ── Sheets: bottom-sheet quick panels (shell footer entry points) ────────
  {
    slug: "quick-notes-sheet",
    overlayId: "quickNotes",
    kind: "sheet",
    label: "Quick Notes",
    componentImport: () =>
      import("@/features/notes/actions/QuickNotesSheet").then((m) => ({
        default: m.QuickNotesSheet,
      })),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "quick-tasks-sheet",
    overlayId: "quickTasks",
    kind: "sheet",
    label: "Quick Tasks",
    componentImport: () =>
      import("@/features/tasks/components/QuickTasksSheet").then((m) => ({
        default: m.QuickTasksSheet,
      })),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "quick-chat-sheet",
    overlayId: "quickChat",
    kind: "sheet",
    label: "Quick Chat",
    componentImport: () =>
      import("@/features/quick-actions/components/QuickChatSheet").then(
        (m) => ({ default: m.QuickChatSheet }),
      ),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "quick-data-sheet",
    overlayId: "quickData",
    kind: "sheet",
    label: "Quick Data",
    componentImport: () =>
      import("@/features/quick-actions/components/QuickDataSheet").then(
        (m) => ({ default: m.QuickDataSheet }),
      ),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "quick-files-sheet",
    overlayId: "quickFiles",
    kind: "sheet",
    label: "Quick Files",
    componentImport: () =>
      import("@/features/quick-actions/components/QuickFilesSheet").then(
        (m) => ({ default: m.QuickFilesSheet }),
      ),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "quick-utilities-sheet",
    overlayId: "quickUtilities",
    kind: "sheet",
    label: "Utilities",
    componentImport: () =>
      import("@/features/quick-actions/components/UtilitiesOverlay").then(
        (m) => ({ default: m.UtilitiesOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
  },

  // ── Modals: centered dialogs ─────────────────────────────────────────────
  {
    slug: "user-preferences-modal",
    overlayId: "userPreferences",
    kind: "modal",
    label: "Preferences",
    componentImport: () =>
      import("@/components/user-preferences/VSCodePreferencesModal").then(
        (m) => ({ default: m.VSCodePreferencesModal }),
      ),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "auth-gate-modal",
    overlayId: "authGate",
    kind: "modal",
    label: "Sign-in Gate",
    componentImport: () =>
      import("@/components/dialogs/AuthGateDialog").then((m) => ({
        default: m.AuthGateDialog,
      })),
    defaultData: {},
    ephemeral: true,
  },
  {
    slug: "email-input-dialog",
    overlayId: "emailDialog",
    kind: "modal",
    label: "Email Input",
    componentImport: () => import("@/components/dialogs/EmailInputDialog"),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "share-modal-bridge",
    overlayId: "shareModal",
    kind: "modal",
    label: "Share",
    componentImport: () =>
      import("@/features/sharing/components/ShareModal").then((m) => ({
        default: m.ShareModal,
      })),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT WIDGETS — inline agent chat surfaces (all multi-instance)
  //
  // Opened via `openAgent*` creators in overlaySlice; each instance carries
  // the agent context (agentId, conversationId, position, etc.) in `data`.
  // ══════════════════════════════════════════════════════════════════════════
  {
    slug: "agent-full-modal",
    overlayId: "agentFullModal",
    kind: "widget",
    label: "Agent (full modal)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentFullModal").then(
        (m) => ({ default: m.AgentFullModal }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-compact-modal",
    overlayId: "agentCompactModal",
    kind: "widget",
    label: "Agent (compact)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentCompactModal").then(
        (m) => ({ default: m.AgentCompactModal }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-chat-bubble",
    overlayId: "agentChatBubble",
    kind: "widget",
    label: "Agent Chat Bubble",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentChatBubble").then(
        (m) => ({ default: m.AgentChatBubble }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-inline-overlay",
    overlayId: "agentInlineOverlay",
    kind: "widget",
    label: "Agent (inline)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentInlineOverlay").then(
        (m) => ({ default: m.AgentInlineOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-sidebar-overlay",
    overlayId: "agentSidebarOverlay",
    kind: "widget",
    label: "Agent (sidebar)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentSidebarOverlay").then(
        (m) => ({ default: m.AgentSidebarOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-flexible-panel",
    overlayId: "agentFlexiblePanel",
    kind: "widget",
    label: "Agent (flexible)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentFlexiblePanel").then(
        (m) => ({ default: m.AgentFlexiblePanel }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-panel-overlay",
    overlayId: "agentPanelOverlay",
    kind: "widget",
    label: "Agent (panel)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentPanelOverlay").then(
        (m) => ({ default: m.AgentPanelOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-toast-overlay",
    overlayId: "agentToastOverlay",
    kind: "widget",
    label: "Agent (toast)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentToastOverlay").then(
        (m) => ({ default: m.AgentToastOverlay }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-floating-chat",
    overlayId: "agentFloatingChat",
    kind: "widget",
    label: "Agent (floating chat)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/AgentFloatingChat").then(
        (m) => ({ default: m.AgentFloatingChat }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-chat-collapsible",
    overlayId: "agentChatCollapsible",
    kind: "widget",
    label: "Agent Chat (collapsible)",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/ChatCollapsible").then(
        (m) => ({ default: m.ChatCollapsible }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
  },
  {
    slug: "agent-chat-assistant",
    overlayId: "agentChatAssistant",
    kind: "widget",
    label: "Agent Chat Assistant",
    componentImport: () =>
      import("@/features/agents/components/agent-widgets/chat-assistant/AgentChatAssistant").then(
        (m) => ({ default: m.AgentChatAssistant }),
      ),
    defaultData: {},
    ephemeral: true,
    instanceMode: "multi",
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

/**
 * Filter entries by kind. Useful for the unified renderer's per-kind
 * render loops.
 */
export function getEntriesByKind(kind: OverlayKind): WindowRegistryEntry[] {
  return REGISTRY.filter((e) => e.kind === kind);
}

/**
 * Dev-only runtime assertion — called once at startup (e.g. from the
 * WindowPersistenceManager or a test) to catch missing required fields
 * before they cause silent failures at render time.
 */
export function assertRegistryIntegrity(): void {
  const seenOverlayIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const errors: string[] = [];

  for (const entry of REGISTRY) {
    if (seenOverlayIds.has(entry.overlayId)) {
      errors.push(`Duplicate overlayId: ${entry.overlayId}`);
    }
    if (seenSlugs.has(entry.slug)) {
      errors.push(`Duplicate slug: ${entry.slug}`);
    }
    seenOverlayIds.add(entry.overlayId);
    seenSlugs.add(entry.slug);

    if (entry.kind === "window" && !entry.mobilePresentation) {
      errors.push(
        `Entry ${entry.overlayId}: kind "window" requires mobilePresentation`,
      );
    }
    if (typeof entry.componentImport !== "function") {
      errors.push(
        `Entry ${entry.overlayId}: componentImport must be a function`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `windowRegistry integrity errors:\n  - ${errors.join("\n  - ")}`,
    );
  }
}
