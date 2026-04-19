# Floating Window Panel System

A Redux-backed, Supabase-persisted OS-style window manager for React. Windows are portalled to `document.body` to escape any parent stacking context or `overflow:hidden`. Geometry, chrome state, and per-window content are persisted in the `window_sessions` Supabase table and restored on page load.

---

## Architecture Overview

### 1. Redux Slices

| Slice | Responsibility |
|-------|----------------|
| `windowManagerSlice` | Window geometry (`WindowRect`), state (`windowed`/`minimized`/`maximized`), z-index, tray slots |
| `overlaySlice` | Which overlays are open; per-overlay data payload passed on open |
| `urlSyncSlice` | `?panels=` URL param sync for deep-linking (optional per window) |

### 2. Key Files

| File | Role |
|------|------|
| `WindowPanel.tsx` | The shell — drag, resize, maximize, minimize, sidebar, footer, persistence |
| `hooks/useWindowPanel.ts` | Registers in `windowManagerSlice`; drives move/resize via `document` listeners |
| `WindowPersistenceManager.tsx` | Context provider (wraps all overlays); handles DB hydration on mount, save, and delete |
| `registry/windowRegistry.ts` | **Single source of truth** for all window slugs, overlay IDs, labels, and `data` shapes |
| `service/windowPersistenceService.ts` | Supabase CRUD for `window_sessions` (upsert / load / delete) |
| `WindowTray.tsx` / `WindowTraySync.tsx` | Minimized-window dock chips |
| `SidebarWindowToggle.tsx` | Shell UI — the Tools grid that opens windows |
| `url-sync/UrlPanelRegistry.ts` | `?panels=` hydrator map (deep-link restore only, not DB persistence) |

### 3. Persistence System

Every non-ephemeral window gets one row in `window_sessions`:

```
window_sessions
├── id            uuid (PK)
├── user_id       uuid (FK → auth.users, RLS enforced)
├── window_type   text  ← matches slug in windowRegistry
├── label         text
├── panel_state   jsonb ← geometry, windowState, sidebarOpen, zIndex
└── data          jsonb ← window-type-specific content state
```

**Save triggers — only two:**
1. **Explicit** — user clicks "Save window state" in the green traffic-light dropdown.
2. **Piggyback** — child component calls `onCollectData` as part of its own save flow.

Moving, resizing, toggling the sidebar, or switching tabs does **not** trigger a DB write.

**On close:** `WindowPanel` calls `persistence.closeWindow(overlayId)` which deletes the row, so the window does not reopen on the next page load.

**On page load:** `WindowPersistenceManager` fetches all rows for the user, dispatches `openOverlay` for each, and dispatches `restoreWindowState` so geometry is pre-loaded in Redux before `WindowPanel` mounts.

---

## Creating a New Window — Step-by-Step Checklist

Follow every step. Skipping any one of them will break persistence or the Tools grid.

### Step 1 — Register in `windowRegistry.ts`

Add an entry to `REGISTRY` in `features/window-panels/registry/windowRegistry.ts`:

```ts
{
  slug: "my-feature-window",       // kebab-case; stored in window_sessions.window_type
  overlayId: "myFeatureWindow",    // camelCase; matches overlaySlice key
  label: "My Feature",             // shown in tray / window manager
  defaultData: {
    // Document every key your onCollectData() returns.
    // Used as a fallback when restoring a session with missing keys.
    selectedId: null,
    search: "",
  },
  // ephemeral: true,              // Uncomment if this window should NOT persist
}
```

**Rules:**
- `slug` must be globally unique kebab-case. This is the DB primary key for lookup.
- `overlayId` must match exactly what you dispatch in `openOverlay({ overlayId })`.
- Set `ephemeral: true` for one-shot tool windows (file upload queue, debug panels, etc.).

### Step 2 — Create the window file in `windows/`

Create `features/window-panels/windows/MyFeatureWindow.tsx`. The minimal pattern:

```tsx
"use client";

import React, { useCallback } from "react";
import { WindowPanel, type WindowPanelProps } from "@/features/window-panels/WindowPanel";
import { MyFeatureBody } from "@/features/my-feature/components/MyFeatureBody";

interface MyFeatureWindowProps {
  isOpen: boolean;
  onClose: () => void;
  // Any extra overlay data passed from openOverlay({ data: {...} })
  initialSelectedId?: string | null;
}

export default function MyFeatureWindow({ isOpen, onClose, initialSelectedId }: MyFeatureWindowProps) {
  if (!isOpen) return null;
  return <MyFeatureWindowInner onClose={onClose} initialSelectedId={initialSelectedId} />;
}

function MyFeatureWindowInner({ onClose, initialSelectedId }: Omit<MyFeatureWindowProps, "isOpen">) {
  // Local state you want to persist
  const [selectedId, setSelectedId] = React.useState<string | null>(initialSelectedId ?? null);

  // Called by WindowPanel before every save — return a plain JSON-serializable object.
  // Keys must match your registry defaultData shape.
  const collectData = useCallback(
    (): Record<string, unknown> => ({ selectedId }),
    [selectedId],
  );

  return (
    <WindowPanel
      title="My Feature"
      id="my-feature-window"        // stable id for windowManagerSlice
      minWidth={380}
      minHeight={280}
      width={560}
      height={440}
      position="center"
      onClose={onClose}
      overlayId="myFeatureWindow"   // must match registry
      onCollectData={collectData}
    >
      <MyFeatureBody
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </WindowPanel>
  );
}
```

**Key rules for the window component:**
- The outer component guards `if (!isOpen) return null` — inner component does the real work.
- `id` passed to `WindowPanel` should be stable (not random) — it is the key in `windowManagerSlice`.
- `overlayId` must exactly match the registry entry's `overlayId`.
- `onCollectData` must return a plain object whose keys are a superset of `defaultData`.
- `onCollectData` should be wrapped in `useCallback` so it always captures current state at call time.

### Step 3 — Register a dynamic import in `OverlayController.tsx`

In `components/overlays/OverlayController.tsx`, add a `dynamic()` import:

```ts
const MyFeatureWindow = dynamic(
  () => import("@/features/window-panels/windows/MyFeatureWindow"),
  { ssr: false },
);
```

Then render it in the overlay section (alongside the other windows):

```tsx
{isMyFeatureWindowOpen && (
  <MyFeatureWindow
    isOpen={isMyFeatureWindowOpen}
    onClose={() => dispatch(closeOverlay("myFeatureWindow"))}
    initialSelectedId={myFeatureWindowData?.selectedId ?? null}
  />
)}
```

Where `isMyFeatureWindowOpen` and `myFeatureWindowData` come from:

```ts
const isMyFeatureWindowOpen = useAppSelector((s) => selectIsOverlayOpen(s, "myFeatureWindow"));
const myFeatureWindowData = useAppSelector((s) => selectOverlayData(s, "myFeatureWindow"));
```

### Step 4 — Add to the Tools grid in `SidebarWindowToggle.tsx`

In `features/window-panels/SidebarWindowToggle.tsx`, add your window to the tools array so it appears in the Tools tab of the shell sidebar:

```ts
{
  label: "My Feature",
  icon: MyFeatureIcon,          // Lucide icon
  action: () => dispatch(openOverlay({ overlayId: "myFeatureWindow" })),
}
```

### Step 5 — (Optional) Add a URL hydrator

If the window should reopen when the user navigates to `?panels=my-feature`, register a hydrator in `url-sync/initUrlHydration.ts`:

```ts
registerPanelHydrator("my_feature", (params) => {
  dispatch(openOverlay({
    overlayId: "myFeatureWindow",
    data: { selectedId: params.selectedId ?? null },
  }));
});
```

Note: URL hydration is separate from DB persistence. DB persistence restores geometry + data on every page load. URL hydrators only fire when the `?panels=` query param is present.

---

## Modifying an Existing Window — Checklist

When you add or remove keys from the content state of an existing window:

1. **Update `defaultData` in `windowRegistry.ts`** — add new keys with sensible null/empty defaults; remove stale keys.
2. **Update `onCollectData`** in the window component — must return all keys that appear in `defaultData`.
3. **Update the inner component** to read new keys from `initialXxx` props (passed from `OverlayController` via `overlayData`).
4. **Update `OverlayController.tsx`** if new keys need to be destructured from `overlayData` before passing to the window.

---

## `WindowPanel` Props Reference

### Geometry

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | auto | Stable key for `windowManagerSlice`. Use a fixed string (e.g. `"notes-window"`). |
| `width` | `number \| string` | `320` | Initial width — px or `"60vw"`. |
| `height` | `number \| string` | `400` | Initial height — px or `"60vh"`. |
| `position` | `WindowPosition` | `"center"` | Placement: `"center"`, `"top-right"`, `"top-left"`, `"bottom-right"`, `"bottom-left"`. |
| `minWidth` | `number` | `180` | Minimum resize width in px. |
| `minHeight` | `number` | `80` | Minimum resize height in px. |
| `initialRect` | `Partial<WindowRect>` | — | Override specific x/y/width/height. Prefer `position` for normal use. |

### Header

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Window title, centered in header. Also stored in Redux for the tray. |
| `actionsLeft` | `ReactNode` | — | Content left of the title. |
| `actionsRight` | `ReactNode` | — | Content right of the title. |
| `onClose` | `() => void` | — | Called when the red traffic light is clicked. Also triggers `persistence.closeWindow`. |

### Sidebar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sidebar` | `ReactNode` | — | Left panel content. Omit to disable. |
| `sidebarDefaultSize` | `number` | `200` | Initial width in px. |
| `sidebarMinSize` | `number` | `100` | Minimum px before collapsing. |
| `defaultSidebarOpen` | `boolean` | `true` | Open on first render. |
| `sidebarClassName` | `string` | — | Class on the sidebar content wrapper. |
| `sidebarExpandsWindow` | `boolean` | `false` | Grow the window when sidebar opens (keeps body width constant). |

**Sidebar content rules:**
- Use `h-full min-h-0 flex flex-col` on your sidebar root.
- Do NOT set `overflow-y-auto` on the root — `WindowPanel` handles it.
- Use `flex-1 min-h-0` on scrollable inner content.

### Footer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `footer` | `ReactNode` | — | Full-width footer bar (single flex row). |
| `footerLeft` | `ReactNode` | — | Left zone (use instead of `footer` for zoned layout). |
| `footerCenter` | `ReactNode` | — | Center zone. |
| `footerRight` | `ReactNode` | — | Right zone. |

### Persistence

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `overlayId` | `string` | — | **Required for persistence.** Must match `windowRegistry` `overlayId`. |
| `onCollectData` | `() => Record<string, unknown>` | — | Called before each save; return current content state. |
| `onSessionSaved` | `(sessionId: string) => void` | — | Called after the DB row is written. Rare — only needed if child tracks its own session id. |

### URL Sync

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `urlSyncKey` | `string` | — | `?panels=` key. **Both** `urlSyncKey` and `urlSyncId` must be set for URL sync to activate. |
| `urlSyncId` | `string` | — | Instance id appended to the URL key. |
| `urlSyncArgs` | `Record<string, string>` | — | Extra query params to include in the URL entry. |

---

## Sidebar Content Pattern

```tsx
function MyWindowSidebar() {
  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Fixed header */}
      <div className="px-2 py-1 border-b text-xs font-medium shrink-0">Sections</div>
      {/* Scrollable body — parent handles overflow */}
      <div className="flex-1 min-h-0 p-1.5 space-y-1">
        {items.map(item => <Item key={item.id} />)}
      </div>
    </div>
  );
}
```

---

## Ephemeral Windows

Set `ephemeral: true` in the registry for windows that should never write to the DB:

- Debug panels, state viewers, one-shot tool dialogs (file upload queue, JSON truncator)
- The "Save window state" button in the traffic-light dropdown is hidden for ephemeral windows
- Closing an ephemeral window does not attempt a DB delete

---

## Registered Windows (All)

| overlayId | slug | Ephemeral | Window file |
|-----------|------|-----------|-------------|
| `notesWindow` | `notes-window` | No | `NotesWindow.tsx` |
| `quickDataWindow` | `quick-data-window` | No | `QuickDataWindow.tsx` |
| `quickTasksWindow` | `quick-tasks-window` | No | `QuickTasksWindow.tsx` |
| `quickFilesWindow` | `quick-files-window` | No | `QuickFilesWindow.tsx` |
| `scraperWindow` | `scraper-window` | No | `ScraperWindow.tsx` |
| `pdfExtractorWindow` | `pdf-extractor-window` | No | `PdfExtractorWindow.tsx` |
| `galleryWindow` | `gallery-window` | No | `GalleryWindow.tsx` |
| `newsWindow` | `news-window` | No | `NewsWindow.tsx` |
| `browserFrameWindow` | `browser-frame-window` | No | `BrowserFrameWindow.tsx` |
| `browserWorkbenchWindow` | `browser-workbench-window` | No | `BrowserWorkbenchWindow.tsx` |
| `listManagerWindow` | `list-manager-window` | No | `ListManagerWindow.tsx` |
| `userPreferencesWindow` | `user-preferences-window` | No | `UserPreferencesWindow.tsx` |
| `agentSettingsWindow` | `agent-settings-window` | No | `AgentSettingsWindow.tsx` |
| `agentContentWindow` | `agent-content-window` | No | `AgentContentWindow.tsx` |
| `agentGateWindow` | `agent-gate-window` | No | `AgentGateWindow.tsx` |
| `contextSwitcherWindow` | `context-switcher-window` | No | `ContextSwitcherWindow.tsx` |
| `canvasViewerWindow` | `canvas-viewer-window` | No | `CanvasViewerWindow.tsx` |
| `feedbackDialog` | `feedback-window` | No | `FeedbackWindow.tsx` |
| `shareModalWindow` | `share-modal-window` | No | `ShareModalWindow.tsx` |
| `emailDialogWindow` | `email-dialog-window` | No | `EmailDialogWindow.tsx` |
| `markdownEditorWindow` | `markdown-editor-window` | No | `MarkdownEditorWindow.tsx` |
| `filePreviewWindow` | `file-preview-window` | No | `FilePreviewWindow.tsx` |
| `imageViewer` | `image-viewer-window` | No | `ImageViewerWindow.tsx` |
| `aiVoiceWindow` | `ai-voice-window` | No | `AiVoiceWindow.tsx` |
| `voicePad` | `voice-pad` | No | `VoicePadAdvanced.tsx` (in `components/official-candidate/`) |
| `projectsWindow` | `projects-window` | No | `ProjectsWindow.tsx` |
| `executionInspectorWindow` | `exec-inspector-window` | **Yes** | `ExecutionInspectorWindow.tsx` |
| `hierarchyCreationWindow` | `hierarchy-creation-window` | **Yes** | `HierarchyCreationWindow.tsx` |
| `fileUploadWindow` | `file-upload-window` | **Yes** | `FileUploadWindow.tsx` |
| `quickAIResults` | `quick-ai-results` | **Yes** | — |
| `streamDebug` | `stream-debug` | **Yes** | — |
| `adminStateAnalyzerWindow` | `state-analyzer-window` | **Yes** | — |
| `jsonTruncator` | `json-truncator` | **Yes** | — |
| `resourcePickerWindow` | `resource-picker-window` | **Yes** | `ResourcePickerWindow.tsx` |
| `agentAssistantMarkdownDebugWindow` | `agent-md-debug-window` | **Yes** | `AgentAssistantMarkdownDebugWindow.tsx` |

---

## Embedded browser windows (iframe)

General-purpose reference browsing without leaving the app:

| overlayId | Use case |
|-----------|----------|
| `browserFrameWindow` | **Site frame** — one URL, address bar in the footer. Good for a single reference site (e.g. Lucide). Open from **Tools → Site frame** or `openOverlay({ overlayId: "browserFrameWindow", data: { url, windowTitle } })`. |
| `browserWorkbenchWindow` | **Site workbench** — bookmark list in `WindowPanel` sidebar + multi-tab strip (same UX idea as Notes Beta: sidebar + tabs). Open from **Tools → Site workbench**. |

Shared iframe chrome and sandbox/allow list live in `components/EmbedSiteFrame.tsx`. URL normalization helpers: `utils/embed-site-url.ts`.

`IconInputWithValidation` uses **Search Lucide** (opens `browserFrameWindow`), accepts pasted JSX such as `<BugPlay />`, and can open **Icon gallery** (`CuratedIconPickerWindow`). The gallery uses a **horizontal tab strip** (not Radix `Tabs` on mobile): **All**, **Matrx SVG**, **Icons**, **AI brands** (button-demo provider row / brand colors), **AI actions** (lightning-style row). Filter applies to the active tab; AI tabs map each tile to a suggested storable id (footer explains refinement via Icons).

---

## Content Editor windows (callback-driven family)

Three overlay variants live in `windows/content-editors/` and all talk back to
the page that opened them via `callbackManager` groups (see
`utils/callbackManager.ts`). No editor content or callbacks are shoved into
Redux — Redux only tracks "is open" + initial / persisted data.

| overlayId | Variant | Body |
|-----------|---------|------|
| `contentEditorWindow` | Pure editor — no tabs, no sidebar | `<ContentEditor>` |
| `contentEditorListWindow` | Sidebar list + one active editor (no tabs) | `<ContentEditorList>` + `<ContentEditor>` |
| `contentEditorWorkspaceWindow` | Sidebar list + browser-style tabs | `<ContentEditorTabsWithList>` with `sharedModeSelector` |

All three variants:

- Support multiple simultaneous instances (pass a unique `instanceId`).
- Persist their content to `window_sessions.data` via `onCollectData`.
- Emit a typed event stream back to the caller: `ready`, `change`, `save`,
  `mode-change`, `active-change`, `open`, `close-tab`, `documents-change`,
  `window-close`.

Preferred way to open them — use the imperative hook, not raw `openOverlay`:

```tsx
const openEditor = useOpenContentEditorWindow();

const handle = openEditor({
  variant: "workspace",
  documents: [
    { id: "readme", title: "README", value: readmeText },
    { id: "todo",   title: "TODO",   value: todoText },
  ],
  onChange: ({ documentId, value }) => saveDraft(documentId, value),
  onSave:   ({ documentId, value }) => persistToBackend(documentId, value),
  onCloseTab: ({ documentId }) => markClosed(documentId),
});

// later
handle.close();        // closes window + disposes callback group
handle.dispose();      // leaves window open; stops listening
```

The hook returns a `ContentEditorWindowHandle` and cleans up any dangling
callback groups on unmount. Variants `"editor"` and `"list"` accept the same
handler surface — you only subscribe to the events your caller cares about.

---

## Multi-Window Pattern

A window can open a secondary window (e.g., clicking an image in Gallery opens ImageViewer). Use `openOverlay` from Redux — the secondary window does not need its own `onCollectData` unless it also needs persistence.

Example: `GalleryWindow` dispatches `openOverlay({ overlayId: "imageViewer", data: { images, initialIndex } })`.

---

## Key Invariants

- `WindowPanel` is strictly unmounted when `state === 'closed'`. When `state === 'minimized'`, the window div has zero dimensions but the body remains in the DOM (keeps state alive).
- `overlayId` must be registered in `windowRegistry.ts` for persistence to work. Without it, `overlayId` is silently ignored and no DB row is written.
- `onCollectData` is called synchronously at save time — always return current state, not stale closures. Use `useCallback` with all dependencies listed.
- Geometry persistence is automatic once `overlayId` is set. You do not need to manually track `rect`, `zIndex`, or `sidebarOpen` — `WindowPanel` collects these from Redux + local state.
- The `window_sessions` table is RLS-secured. Each user can only read/write their own rows. No API route is needed.
