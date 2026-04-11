# window-panels — file inventory

Last reviewed: 2026-04-11. Usage = imports from outside this folder (ripgrep) unless noted.

## Shell: Windows → Tools tab (`SidebarWindowToggle.tsx`)

Grid actions dispatch `openOverlay` / helpers. **Added 2026-04-11:** Voice Pad (`voicePad`), New organization (`openHierarchyCreationWindow`), Agent content (`openAgentContentWindow` — needs resolvable `agentId`), MD debug (`agentAssistantMarkdownDebugWindow`). Existing entries unchanged (JSON Truncator, Notes, AI Voice, AI Results, Stream Debug, Feedback, State Analyzer, Markdown, Preferences, Email, Share Modal, Tasks, Data Tables, Files, Upload, Web Scraper, Context Switcher, PDF Extractor, Canvas Viewer, News, List Manager, Gallery, Agent Settings, Exec Inspector).

## Root

| File | Role | Used |
|------|------|------|
| `WindowPanel.tsx` | Redux-backed floating window shell (drag, resize, tray, optional sidebar/footer, optional `useUrlSync`) | Yes — wide use |
| `WindowTray.tsx` | Minimized-window chips / restore UI | Yes — `DynamicWindowTray` |
| `WindowTraySync.tsx` | Tray layout sync on resize | Yes — `DeferredIslands` |
| `SidebarWindowToggle.tsx` | Shell control: show/hide windows, layouts, open tool overlays | Yes — `features/shell/.../Sidebar.tsx` |
| `FloatingPanel.tsx` | Lightweight non-Redux floater (own drag/collapse) | **No** — no repo imports |
| `README.md` | Architecture / API notes | Reference |
| `TODO-persistence-spec.md` | Persistence design notes | Reference |
| `INVENTORY.md` | This audit | — |

## `hooks/`

| File | Role | Used |
|------|------|------|
| `useWindowPanel.ts` | Registers window in `windowManagerSlice`, pointer-driven move/resize | Yes — `WindowPanel` |
| `usePanelPersistence.ts` | `localStorage` load/save of `windowManager.windows` | Yes — `UrlPanelManager` |

## `components/`

| File | Role | Used |
|------|------|------|
| `LayoutIcon.tsx` | Layout icon buttons | Yes — `WindowPanel`, `SidebarWindowToggle` |
| `WindowSidebar.tsx` | Narrow nav list for preference-style sidebars | Yes — `UserPreferencesWindow` |

## `utils/`

| File | Role | Used |
|------|------|------|
| `windowArrangements.ts` | Grid/tile rect helpers for `arrangeActiveWindows` | Yes — `windowManagerSlice` |
| `withGlobalState.tsx` | HOC for per-instance dynamic module state | **No** — no repo imports |

## `url-sync/`

| File | Role | Used |
|------|------|------|
| `UrlPanelRegistry.ts` | `registerPanelHydrator` / `getHydrator` map | Yes |
| `initUrlHydration.ts` | One-time hydrator registration (`agent`, `notes`, `quick_tasks`, …) | Yes — `UrlPanelManager` |
| `UrlPanelManager.tsx` | Reads/writes `?panels=`; runs `initUrlHydration` + `usePanelPersistence` | Yes — `OverlayController` |
| `useUrlSync.ts` | Registers panel in `urlSyncSlice` when **both** `urlSyncKey` and `urlSyncId` are set | Yes — `WindowPanel` |

### Hydrator keys (`initUrlHydration.ts`)

`agent`, `voice`, `notes`, `feedback`, `json_truncator`, `quick_tasks`, `quick_data`, `files`, `state_analyzer`, `aiVoiceWindow`, `gallery`, `news`, `user_preferences`, `share_modal`, `markdown_editor`, `email_dialog`, `listManager`

### URL sync caveat

`WindowPanel` only calls `useUrlSync` when `urlSyncKey` **and** `urlSyncId` are defined. A lone `urlSyncKey` does not update `?panels=`.

## `windows/` — panel shells

**Geometry persistence:** Any `WindowPanel` registered in Redux is included in `usePanelPersistence` (`matrx_window_manager_state`) while `UrlPanelManager` is mounted (authenticated overlay path). Not panel-specific.

| File | Feature / module | Built-in `sidebar` prop | URL hydrator (`?panels=` restore) | URL query sync (`urlSyncSlice`) |
|------|------------------|-------------------------|-----------------------------------|----------------------------------|
| `AgentAssistantMarkdownDebugWindow.tsx` | Agent assistant markdown draft debug | No | No | Yes (`agent-md-debug` + id) |
| `AgentContentWindow.tsx` | Agent builder: messages / variables / tools | No (in-window tabs) | No | Yes (`agent-content` + id) |
| `AgentGateWindow.tsx` | Agent execution gate UI | No (`WindowPanel` inside `AgentGateInput`) | No | No |
| `AgentSettingsWindow.tsx` | Agent info editor | Yes | No | Yes (`agent-settings` + id) |
| `AiVoiceWindow.tsx` | AI voice pad workspace | No | Yes (`aiVoiceWindow`) | Yes |
| `CanvasViewerWindow.tsx` | Shared canvas by token / link | No | No | No |
| `ContextSwitcherWindow.tsx` | Agent context hierarchy picker | No | No | No |
| `EmailDialogWindow.tsx` | Email capture dialog | No | Yes (`email_dialog`) | Partial (no `urlSyncId`) |
| `ExecutionInspectorWindow.tsx` | Admin execution instance inspector | No | No | Yes (`exec-inspector` + id) |
| `FeedbackWindow.tsx` | Feedback submit + attachments | No | Yes (`feedback`) | Yes |
| `FilePreviewWindow.tsx` | File preview by bucket/path or URL | No | No | No |
| `FileUploadWindow.tsx` | Multi-destination upload | Yes | No | No |
| `GalleryWindow.tsx` | Unsplash image workspace | Yes | Yes (`gallery`) | Yes |
| `HierarchyCreationWindow.tsx` | Create org/project/task | No | No | No |
| `ImageViewerWindow.tsx` | Image zoom/pan viewer | Yes (thumbnails) | No | No |
| `ListManagerWindow.tsx` | User lists manager | No (internal split) | Yes (`listManager`) | Yes |
| `MarkdownEditorWindow.tsx` | Markdown classification tester | No | Yes (`markdown_editor`) | Partial (no `urlSyncId`) |
| `NewsWindow.tsx` | News hub | No | Yes (`news`) | Yes |
| `NotesWindow.tsx` | Quick notes | No | Yes (`notes`) | Yes |
| `PdfExtractorWindow.tsx` | PDF / image text extract (body in `features/pdf-extractor`) | Yes (in `PdfExtractorFloatingWorkspace`) | No | No |
| `ProjectsWindow.tsx` | Projects workspace | No | No | No |
| `QuickDataWindow.tsx` | Quick data tables | No | Yes (`quick_data`) | Partial (no `urlSyncId`) |
| `QuickFilesWindow.tsx` | Multi-bucket file tree | Yes | Yes (`files`) | No |
| `QuickTasksWindow.tsx` | Task list workspace | Yes | Yes (`quick_tasks`) | Partial (no `urlSyncId`) |
| `ResourcePickerWindow.tsx` | Attach resource picker | No | No | No |
| `ScraperWindow.tsx` | Web scraper (chrome in `ScraperFloatingWorkspace`) | Yes (in scraper feature) | No | Partial (`urlSyncKey="scraper"` only — no `urlSyncId` on `WindowPanel`) |
| `ShareModalWindow.tsx` | Sharing / permissions UI | No | Yes (`share_modal`) | Partial (no `urlSyncId`) |
| `UserPreferencesWindow.tsx` | User preferences editor | Yes | Yes (`user_preferences`) | Partial (no `urlSyncId`) |

### `ProjectsWindow.tsx` usage

No imports outside this file and an internal doc list — **not wired** into `OverlayController` or routes as of review.

### Overlay lazy-load vs URL hydrators

Dynamic window modules load from `components/overlays/OverlayController.tsx` (separate from `UrlPanelRegistry`). A window can be **openable in-app** without a **hydrator**; hydrators only define **`?panels=`** restore behavior.

### Related overlay (not under `windows/`): Voice Pad

| Overlay ID | Main UI | In Tools grid |
|------------|---------|---------------|
| `voicePad` | `components/official-candidate/voice-pad/components/VoicePadAdvanced.tsx` | Yes (label: Voice Pad) |

---

## Data sources & persistence (for session restore design)

**Legend (primary source of “active” data):**

| Code | Meaning |
|------|---------|
| **1** | **Database** — Supabase (or server persistence you can re-fetch by id) |
| **2** | **Redux / Context** — backed by **1** (or server revalidation); restoring ids + slice hydration is enough |
| **3** | **Redux / Context** — **session / ephemeral** (execution, drafts, UI-only slices); not a durable DB mirror by itself |
| **4** | **Local state** — `useState`, hook-only buffers, overlay props |
| **5** | **Other** — third-party HTTP, app backend routes (no row id in your DB), `localStorage` sidecars, file blobs |

Many windows are **mixed**; the table lists the dominant sources and what you must snapshot if nothing is in **1/2**.

| Window / overlay | Main component(s) | Sources (codes) | If persisting beyond window geometry, capture / notes |
|------------------|-------------------|-----------------|--------------------------------------------------------|
| **NotesWindow** | `NotesView` | **2** → **1** (`fetchNotesList` / note content thunks → Supabase) | Instance id + open tab note ids (`features/notes/redux`). |
| **QuickDataWindow** | `QuickDataSheet` | **1** (`supabase.rpc('get_user_tables')`); **4** (selected table, search, sidebar) | Table id + UI filters. |
| **QuickTasksWindow** | `QuickTasksWorkspace*` | **2** `useNavTree` / **1** tasks via `TaskContext` + `taskService` / `projectService` (Supabase); **4** selection, search | Org/project/task selection + filter state; tasks themselves are **1**. |
| **QuickFilesWindow** | `MultiBucketFileTree` + redux FS | **2** file tree slice hydrated from storage API; **1** objects in buckets | Active bucket/path; tree expansion optional. |
| **ScraperWindow** | `ScraperFloatingWorkspace` | **4** (all scrape results, tabs, keyword state); **5** (scraper HTTP streaming API via `useScraperApi`) | **Heavy:** must serialize in-memory results + mode/url/keyword/maxPages + per-item state; nothing written to DB by this feature. |
| **PdfExtractorWindow** | `usePdfExtractor` + shell | **4** (file, result, `history` array in hook); **5** (multipart POST to backend extract endpoint) | **Heavy:** history + current file reference (file blob cannot restore from id — need re-upload or saved artifact). |
| **GalleryWindow** | `GalleryFloatingWorkspace` | **5** (Unsplash via `useUnsplashSearch` / `useUnsplashGallery`); **4** (search, filters, grid state); **5** (`localStorage` `gallery-window-favorites`) | Query + filters + favorites already partially in LS. |
| **NewsWindow** | `NewsFloatingWorkspace` | **4** (category/country); **5** (`fetchNews` / external news API) | Filters only; articles are re-fetched. |
| **ListManagerWindow** | `ListManagerFloatingWorkspace` | **1** (`getAccessibleLists`, `getListWithItems`); **4** (active list id) | `activeListId` + optional scroll. |
| **UserPreferencesWindow** | Tab lazy panels + `userPreferencesSlice` | **2** (draft in Redux); **1** on `savePreferencesToDatabase` | Prefer reload from **1** after login; tab id for reopen. |
| **AgentSettingsWindow** | `AgentSettingsForm`, `AgentSidebar` | **2** agent definition / settings slices; **1** `fetchFullAgent` | `initialAgentId` + opened tab ids. |
| **AgentContentWindow** | `Messages`, `AgentVariablesPanel`, `AgentToolsManager` | **2** agent-definition Redux; **1** when agent saved to DB | `agentId` + active sub-tab (`messages` / `variables` / `tools`). |
| **AgentGateWindow** | `AgentGateBody` | **3** (`instance-ui-state`, execution instances); **4** input | Gate is per-run: persist `conversationId` / instance ids if you restore runs. |
| **ExecutionInspectorWindow** | `ExecutionInstanceInspector` | **3** (reads `RootState` execution slices) | Ephemeral unless you also persist execution replay state (not in DB today). |
| **AgentAssistantMarkdownDebugWindow** | draft viewer | **3** (`agent-assistant-markdown-draft.slice`) | Session drafts only; restore slice or accept empty. |
| **ContextSwitcherWindow** | `HierarchyTree` + `useHierarchyReduxBridge` | **2** `appContextSlice`; **2** nav tree from `hierarchySlice` (**1** via `fetchNavTree`) | Context ids already in Redux; ensure same slice hydration. |
| **HierarchyCreationWindow** | form + `useCreate*` | **5** (mutations → then **1**); **4** form fields | Usually one-shot; optional `entityType` + preset ids from overlay data. |
| **CanvasViewerWindow** | `SharedCanvasView` + `useSharedCanvas` | **1** (`shared_canvas_items` by `shareToken`); **4** token input | `shareToken` string (+ optional instance id). |
| **FeedbackWindow** | `FeedbackWindowBody` | **4** (form, attachments); **1** on `submitFeedback` action | Draft-only persistence if desired. |
| **ShareModalWindow** | sharing tabs + `useSharing` | **1** (`usePermissions` / share APIs); **4** (active tab, email flags) | `resourceType`, `resourceId`, `resourceName`, `isOwner` required from opener. |
| **EmailDialogWindow** | form | **4** | Ephemeral. |
| **MarkdownEditorWindow** | `MarkdownClassificationTester` | **4** (markdown, processor/coordinator/sample picks); static samples in repo | All UI state local; optional persist blob. |
| **FileUploadWindow** | queue + `useFileSystem` | **4** (upload queue `File` blobs); **2** FS slice | Queue not restorable without re-selecting files. |
| **FilePreviewWindow** | previewers + `FileSystemManager` | **1**/URL from overlay `data`; **4** | Pass same overlay payload (bucket/path or url). |
| **ImageViewerWindow** | `ImageViewer` | **4**/props (`images[]` from overlay) | Image URLs or overlay instance payload. |
| **ResourcePickerWindow** | `ResourcePickerMenu` | **4** (menu); **1**/mixed per sub-picker (notes, tasks, files, …) | Last-opened resource type tab. |
| **AiVoiceWindow** | `AiVoiceFloatingWorkspace` | **4** + **5** (`localStorage` `aiAudioData` / configs / preferences); TTS may call APIs | Already partially persisted via LS inside workspace. |
| **voicePad** (`VoicePadAdvanced`) | + `voicePadSlice` | **3** (transcripts, draft in Redux); **5** (STT via audio hooks/API); optional **1** only if user saves to notes | Transcripts live in **3** until “save to notes”. |
| **ProjectsWindow** | `ProjectsWorkspace` | **4** (local `HierarchySelection`); **2** / **1** via `useNavTree` for project list | Org id selection; not in overlay. |
| **JSON Truncator** (overlay, not in `windows/`) | `JsonTruncatorDialog` | **4** | Text buffer. |
| **Stream Debug** | `StreamDebugFloating` | **3** + `conversationId` from overlay | Needs conversation / instance id. |
| **State Analyzer** (`StateViewerWindow`) | tree over Redux | **3** | Read-only; no user data to save. |

\* `QuickTasksWindow` wraps content in `QuickTasksWorkspaceProvider`.

### Cross-cutting notes

- **Geometry / z-order:** `usePanelPersistence` + `windowManagerSlice` (already localStorage).
- **URL `?panels=`:** hydrators reopen overlays but do **not** restore **4**/**5** session payloads (e.g. scraper heap, PDF history, markdown tester).
- **“Record ids only”** is enough when the dominant code is **1** or **2** with a clear fetch path; **Scraper**, **Pdf extractor**, **Markdown tester**, **Voice pad transcripts** (until saved), and **Feedback drafts** need explicit snapshot or accept data loss on reload.
