# `/code` Workspace — System State & Gap Audit

**Last updated:** 2026‑04‑25 (post-completion sweep — see [`QA_CHECKLIST.md`](./QA_CHECKLIST.md))
**Scope:** Everything under `features/code/`, plus its hooks, adapters, and the slices it consumes from elsewhere in the app.

This doc is the single source of truth for the `/code` (VSCode‑style) workspace. It captures (1) what is shipped, (2) what is wired but incomplete, (3) what is intentionally deferred, and (4) the wire format / mechanics of the editor→agent context bridge and the Monaco type environment system.

> **2026‑04‑25 verification:** Probed both orchestrators directly via `GET /api-surface`. **Both EC2 and hosted are live at v0.2.0 with identical route surfaces** — the earlier "EC2 stale, deploy disk‑full" remark in §3 is no longer accurate. Capability discovery should always go through `/api-surface`, never `/openapi.json` (which omits catchall proxy routes). See §3 below.

> **End-to-end verification:** The 10-step smoke test in [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) is the gate for "fully done". Run it against the hosted tier after any meaningful workspace change.

---

## 0. Executive snapshot

| Area | Status | Comment |
|------|--------|---------|
| Workspace shell, panels, activity bar | ✅ Shipped | `WorkspaceLayout`, `react-resizable-panels`, all six activity views render (added `source-control`). |
| Monaco editor, tabs, dirty state, `Cmd/Ctrl+S` | ✅ Shipped | Save dispatches to the right backend by tab id. |
| Filesystem adapter (Sandbox, structured FS API) | ✅ Shipped | `SandboxFilesystemAdapter` consumes `/fs/*` directly — no shell synthesis. Bulk read / upload / download / drag‑and‑drop wired. |
| Terminal — real PTY over WebSocket | ✅ Shipped | xterm attaches to `/api/sandbox/[id]/pty` (WS proxy). Buffered fallback retained for `MockProcessAdapter`. |
| Code Library: `code_files`/`code_folders` browser | ✅ Shipped | Backed by the existing `code-files` Redux slice. |
| Library Source Adapters (`prompt_apps`, `aga_apps`, `tool_ui_components`) | ✅ Shipped | Direct‑edit source rows with optimistic concurrency, source-of-truth badge, conflict toast (Reload/Overwrite), Realtime softening. |
| Universal "save & open in code editor" flow | ✅ Shipped | Wired into `HtmlPreviewModal` and chat code blocks. |
| Conversation history / agent filter / favorites | ✅ Shipped | Lives next to the chat panel; filter by tags; date/agent grouping. |
| Per‑adapter Monaco type environments | ✅ Shipped | Refcounted registry, six environments (`prompt-app`, `aga-app`, `tool-ui`, `library`, `sandbox-fs`, `html`), status‑bar indicator, settings toggle. |
| Sandbox API surface (FS / exec / PTY / git / search / watch / processes / ports / templates / extend / heartbeat) | ✅ Shipped on both tiers | Verified via `GET /api-surface`. See §3 for the live capability matrix. |
| Editor → agent context‑bag bridge | ✅ Shipped | `features/code/agent-context/`, auto‑mounted in `ChatPanelSlot`. ctx_get keys: `editor.tabs`, `editor.tab.<id>`, `editor.selection.<id>`. See §4. |
| Source Control activity view | ✅ Shipped | `features/code/views/source-control/` over `SandboxGitAdapter`. Status panel, diff tab (`git-diff:` prefix), commit/push, credentials modal. |
| Server‑side search (ripgrep) + fuzzy path search | ✅ Shipped | `SearchPanel` consumes `searchContent` / `searchPaths`; falls back to client walker when adapter lacks them. |
| File watcher → live tree | ✅ Shipped | `FileTree` subscribes to `filesystem.watch()`; node tree updates in Redux on `created` / `modified` / `deleted` / `moved`. |
| Tier + template picker | ✅ Shipped | "New sandbox" modal pulls `GET /api/templates?tier=…`; last tier persisted in `userPreferences.coding.lastSandboxTier`. |
| Ports bottom panel | ✅ Shipped | Polls `/api/sandbox/[id]/ports` every 5s; click‑to‑copy host:port. |
| Heartbeat + extend | ✅ Shipped | `useSandboxHeartbeat` mounted in `CodeWorkspace` gated on `activeSandboxId`; `extendSandbox` switched to `POST /api/sandbox/[id]/extend`. |
| LSP / multi‑user collab / public preview URLs | ❌ Out of scope | P2 sandbox‑team work — see §3 row "Snapshot / multi‑user / LSP / AI sockets". |

---

## 1. Architecture map

### 1.1 Entry points

| Path | What it is |
|------|-----------|
| `app/(a)/code/page.tsx` | Renders `<CodeWorkspaceRoute />` — only callsite from the App Router. |
| `app/(a)/code/layout.tsx` | Authenticated layout wrapper. |
| `app/(a)/code/loading.tsx` | Skeleton while the workspace boots. |

The previous `app/(authenticated)/code/page.tsx` was deleted when the route moved to `(a)/code`.

### 1.2 Workspace shell

```
features/code/
  CodeWorkspaceRoute.tsx          ← top‑level, mounts providers + layout
  CodeWorkspace.tsx               ← inner shell, holds activity bar + side panel + editor + bottom panel
  layout/WorkspaceLayout.tsx      ← <ResizablePanelGroup> orchestration; injects `rightmost` prop
  styles/tokens.ts                ← AVATAR_RESERVE = "pr-14", shared sizing tokens
```

`WorkspaceLayout` is responsible for:
- Imperatively expanding/collapsing panels via the `ImperativePanelHandle`s, then calling `setLayout(...)` inside `requestAnimationFrame`. This avoids the panel‑library footgun where layout fights collapse state.
- Cloning each slot child and injecting a `rightmost` boolean prop so whichever panel currently sits flush against the top‑right corner reserves space (`AVATAR_RESERVE`) for the floating user avatar.

### 1.3 Activity bar + side panels

```
features/code/activity-bar/
  ActivityBar.tsx
  activity-views.ts        ← descriptor list (icon, id, label)

features/code/views/
  SidePanelChrome.tsx      ← shared frame for every left panel
  SidePanelRouter.tsx      ← switches on activity id
  explorer/                ← filesystem tree (Mock + Sandbox)
  sandboxes/               ← list/create/connect sandboxes
  library/                 ← Code Library (My Files + source folders)
  chat/                    ← AgentRunnerPage host
  history/                 ← ConversationHistorySidebar host
```

The five views currently registered are: `explorer`, `sandboxes`, `library`, `chat`, `history`. Each renders inside `SidePanelChrome`, which provides the consistent header/scroll behavior.

### 1.4 Editor

```
features/code/editor/
  EditorArea.tsx           ← outer frame; subscribes to active tab; wires onSave
  EditorToolbar.tsx        ← Save button, dirty indicator, layout toggles
  EditorTabs.tsx           ← tab strip
  MonacoEditor.tsx         ← thin <Editor /> wrapper, `Cmd/Ctrl+S` keybinding
  monaco-config.ts         ← lazy global Monaco init (TS/JS/JSON only — no extraLibs)
  useMonacoTheme.ts        ← light/dark sync
```

### 1.5 Bottom panel

```
features/code/terminal/
  BottomPanel.tsx          ← persistent mount of TerminalTab (hidden by CSS when collapsed)
  TerminalTab.tsx          ← xterm.js + per‑command exec via SandboxProcessAdapter
```

`TerminalTab` is **always mounted** so the user never loses scrollback / cursor state when the panel collapses. We previously had a hydration warning when xterm tried to set the background colour during SSR — the fix is `bg-white dark:bg-[#1e1e1e]` in the wrapping `<div>`.

### 1.6 Adapters (the data plane)

```
features/code/adapters/
  FilesystemAdapter.ts            ← interface
  ProcessAdapter.ts               ← interface (with optional `stream?(...)` reserved for v2)
  MockFilesystemAdapter.ts        ← in‑memory tree for demos
  MockProcessAdapter.ts           ← canned outputs
  SandboxFilesystemAdapter.ts     ← shell‑synthesised `list`/`read`/`write`
  SandboxProcessAdapter.ts        ← one‑shot `POST /api/sandbox/[id]/exec`
```

These are the only seams between the editor UI and the outside world. The editor never knows whether it's talking to a mock, a sandbox, or (eventually) AWS. **All net‑new sandbox features (Git, search, PTY, watcher) will land as new methods on `FilesystemAdapter` / `ProcessAdapter` / future `GitAdapter` and a new `SandboxGitAdapter`.**

### 1.7 Library source adapter system

The "Code Library" view fuses **two** content sources behind one tree:

1. **My Files** — `code_files` + `code_folders` rows (the existing `code-files` slice with S3 offload).
2. **External tables** — registered `LibrarySourceAdapter`s. Each adapter binds the editor to a source‑of‑truth row in another table.

```
features/code/library-sources/
  types.ts                 ← LibrarySourceAdapter + RemoteConflictError
  registry.ts              ← register/getLibrarySource/getAdapterForTabId
  adapters/
    prompt-apps.ts         ← prompt_apps.component_code         (single field)
    aga-apps.ts            ← aga_apps.component_code            (single field)
    tool-ui-components.ts  ← tool_ui_components.* (multi‑field)
  index.ts                 ← side‑effect register + barrel exports
```

Tab id conventions:

| Adapter | Tab id |
|---------|--------|
| code_files (My Files) | `library:<codeFileId>` |
| prompt_apps | `prompt-app:<rowId>` |
| aga_apps | `aga-app:<rowId>` |
| tool_ui_components | `tool-ui:<rowId>:<fieldId>` (e.g. `tool-ui:abc:inline_code`) |
| Mock/Sandbox FS | `fs:<adapterId>:<absPath>` |

`useSaveActiveTab` routes the save by inspecting the tab id prefix — code_files → thunks; library adapter → `adapter.save`; otherwise `filesystem.writeFile`.

### 1.8 Optimistic concurrency for source‑backed tabs

When `useOpenSourceEntry` opens a row it captures `updated_at` into `EditorFile.remoteUpdatedAt`. On save, the adapter does `UPDATE … WHERE updated_at = <captured>` and returns a fresh `updated_at`; if 0 rows match, it throws `RemoteConflictError` and `useSaveActiveTab` returns `{ ok: false, conflict: true }`. The UI surfaces a toast with "Reload" / "Overwrite" actions. After a clean save, we dispatch `setTabRemoteUpdatedAt` so subsequent saves don't false‑positive. Realtime push of `updated_at` is **not** wired — see §2.5.

### 1.9 Slices touched

```
features/code/redux/
  codeWorkspaceSlice.ts        ← active view, panel sizes, explorerRootOverride
  tabsSlice.ts                 ← editor tabs, active tab, dirty bits, remoteUpdatedAt
  terminalSlice.ts             ← terminal session metadata

lib/redux/slices/userPreferencesSlice.ts
  └─ coding: CodingPreferences ← agent filter, history grouping, favorites

features/agents/redux/conversation-history/
  slice.ts, thunks.ts, selectors.ts ← conversation list with date/agent grouping

features/agents/redux/execution-system/
  instance-context/instance-context.{slice,selectors}.ts
                              ← ★ THIS IS WHERE EDITOR CONTEXT LANDS — see §4
  thunks/execute-instance.thunk.ts
                              ← assembleRequest() reads selectContextPayload(...)

features/code-files/redux/codeFilesSlice.ts ← My Files CRUD + S3
```

### 1.10 Hook surface (public API of the workspace)

```ts
useOpenLibraryFile(codeFileId)       // open a code_files row as a tab
useOpenSourceEntry(adapter, rowId, fieldId?)  // open any LibrarySourceAdapter row
useLibrarySource(adapter)            // lazy list of entries for one adapter (folder expand)
useSaveActiveTab()                   // dispatches the right save based on tab id
useOpenCodeFileFromUrl()             // ?open=<id> URL hydrator (mounted once in CodeWorkspace)
useSaveAndOpenInCodeEditor()         // universal: save arbitrary code → code_files → /code?open=<id>
```

`useSaveAndOpenInCodeEditor` is what `HtmlPreviewModal` and the chat code‑block toolbar call. It creates the `Chat Captures` folder on demand and routes the user to the editor with the file already opened.

---

## 2. Known gaps / things not set up yet

Most of the historic gaps have been closed. What remains is sandbox‑team P2 work and a small set of intentional matrx‑admin deferrals; everything else moved into §0/§3 as shipped.

### 2.1 Sandbox‑team P2 (out of scope here)

| Gap | Owner | Why deferred |
|---|---|---|
| Public preview URL exposure | sandbox team | Needs Caddy/CF reverse‑proxy plumbing on the orchestrator side. The Ports bottom panel already lists LISTEN ports; preview links plug in once the URL exposure ships. |
| Snapshot / restore | sandbox team | P2; not on the workspace's critical path. |
| Multi‑user collab on a single sandbox | sandbox team | P2; OT/CRDT layer would need to live in the orchestrator. |
| LSP server multiplex | sandbox team | P2; Monaco would need a WS bridge to a per‑container `tsserver`/`pyright`. |
| AI socket framing helpers | sandbox team | P2; tangential to the workspace. |

### 2.2 matrx-admin deferrals

| Item | Why we're not doing it now |
|---|---|
| Generated ambient `.d.ts` for prompt-app / aga-app / tool-ui | The current envs are hand‑authored against curated subsets in [`features/code-editor/config/type-definitions.ts`](../code-editor/config/type-definitions.ts). Generating these from the live runtime types is a build‑step follow‑up; the hand‑authored versions catch the spurious squiggles (the original symptom) and are versioned in the env files. |
| `git rebase --interactive` and other interactive porcelain in the Source Control view | The view targets the 95% workflow (status / stage / commit / push / pull / branch / stash / diff / credentials). Rebases land via the terminal — xterm is now a real PTY, so it just works. |
| LSP-style cross-file rename / "find references" | Monaco can't do it without a real LSP and we don't have one. Out of scope until §2.1's LSP gap closes. |
| Public preview URL click-through in the Ports tab | Surfaces only host:port today; the click-to-copy is the workaround until preview URLs land. |
| In-process collaboration cursors on shared tabs | Out of scope; the source-of-truth flow + Realtime softening is enough for the single-user-at-a-time case, which is the entire current product surface. |

---

## 3. Sandbox API delivery audit (verified live 2026‑04‑25)

The orchestrator team shipped the full wishlist surface across both tiers. Earlier verdicts in this file (and in the 2026‑04‑26 commit) used `/openapi.json` for discovery, which omits any route registered with a `{path:path}` catchall (`/fs/*`, `/git/*`, `/search/*`). Use `GET /api-surface` instead — it returns the authoritative route list including catchalls, plus `tier` and `version`.

There are now **two orchestrators**:

| Tier | URL | Notes |
|---|---|---|
| `ec2` | `http://54.144.86.132:8000` | v0.2.0 live (verified `/api-surface` 2026‑04‑25). Earlier disk‑full deploy failure has been resolved. |
| `hosted` | `https://orchestrator.dev.codematrx.com` | v0.2.0 live (verified `/api-surface` 2026‑04‑25). Matrx dev server, Docker volumes, in‑memory store today. |

Sandboxes carry a `tier` field (persisted in `sandbox_instances.config.tier`) so the proxy routes can forward to the right orchestrator. See `lib/sandbox/orchestrator-routing.ts`.

### 3.1 Wishlist scoreboard

| Wishlist item | Priority | Backend | Frontend |
|---|---|---|---|
| §3.1.1 Structured FS API (list/stat/read/write/patch/delete/mkdir/rename/copy + binary) | P0 | ✅ both tiers | ✅ `SandboxFilesystemAdapter` (no shell synth) |
| §3.1.2 Streaming `exec` (SSE) with env/stdin/cancel | P0 | ✅ both tiers | ✅ `SandboxProcessAdapter.stream()` — used by `TerminalTab` buffered fallback path. |
| §3.1.3 Real PTY WebSocket (`/sandboxes/{id}/pty`) | P0 | ✅ both tiers | ✅ `app/api/sandbox/[id]/pty/route.ts` proxies the WS upgrade; xterm attaches directly. |
| §3.1.4 Git workflow primitives | P0 | ✅ both tiers | ✅ `SandboxGitAdapter` consumed by `features/code/views/source-control/`. |
| §3.1.5 Git credential model | P0 | ✅ both tiers | ✅ Credentials modal (`setGithubToken` / `setSshKey` / `revokeCredentials`) in the Source Control view. |
| §3.1.6 Template selection at create time | P0 | ✅ both tiers | ✅ Tier/template picker modal in `SandboxesPanel`; last tier persisted in `userPreferences.coding.lastSandboxTier`. |
| §3.1.7 TTL `extend` + heartbeat | P0 | ✅ both tiers | ✅ `useSandboxHeartbeat` mounted in `CodeWorkspace`; extend uses `POST /api/sandbox/[id]/extend`. |
| §3.2.1 File watcher (WebSocket) | P1 | ✅ both tiers | ✅ `FileTree` subscribes via `filesystem.watch()`; Redux node tree mutates on events. |
| §3.2.2 Server‑side search (ripgrep + fd) | P1 | ✅ both tiers | ✅ `SearchPanel` uses `searchContent()` (ripgrep) + `searchPaths()` (fd). Falls back to client walker on Mock adapter. |
| §3.2.3 Bulk fs / upload / download | P1 | ✅ daemon supports `batch`/`upload`/`download` | ✅ `FilesystemAdapter.upload` / `download` / `batchRead` shipped on the sandbox adapter; drag‑and‑drop wired in `FileTree`. |
| §3.2.4 Process listing + signal | P1 | ✅ both tiers (`/processes`, `/processes/{pid}/signal`) | ⏳ proxy routes shipped; no UI consumer yet — out of scope (no compelling need surfaced). |
| §3.2.5 Port listing | P1 | ✅ both tiers (`/ports`) | ✅ Ports bottom‑panel tab polls every 5s with click‑to‑copy. |
| §3.2.5 Public preview URL exposure | P1 | ❌ not implemented | Out of scope — sandbox team. |
| §3.3.* Snapshot / multi‑user / LSP / AI sockets | P2 | ❌ not implemented | Out of scope — sandbox team. |
| (new) `POST /sandboxes/{id}/complete` | n/a | ✅ | Agent‑self‑signal lifecycle; not consumed by the editor. |
| (new) `POST /sandboxes/{id}/error` | n/a | ✅ | Same as above. |
| (new) `GET /api-surface` | n/a | ✅ | Consumed by `lib/sandbox/api-surface.ts` capability cache (per‑tier route detection used for graceful tier‑rollback degradation). |

**Net delivery:** Every P0 wishlist item is live on both the backend and the frontend. Every P1 item except *public preview URLs* and *process listing UI* is shipped. The remaining sandbox‑team gaps (preview URLs, snapshot, multi‑user, LSP, AI sockets) are tracked in §2.1 as out‑of‑scope for this workspace.

### 3.2 Discovery — use `/api-surface`, not `/openapi.json`

Both orchestrators expose `GET /api-surface` (no auth). It returns the authoritative route list including the catchall proxy routes, plus `tier` and `version`. Always probe this when documenting capabilities, never `/openapi.json`. Sample (2026‑04‑25, both tiers identical):

```
GET /api-surface  →  {"service":"matrx-sandbox-orchestrator","version":"0.2.0","tier":"<ec2|hosted>","routes":[…26 routes…]}
```

### 3.3 Frontend status

All eight items from the previous "frontend gap" list have shipped. The capability cache (`lib/sandbox/api-surface.ts`) exists so any future tier rollback degrades gracefully. New consumers for the remaining sandbox endpoints (process list / signal, public preview URLs once they exist) can be added piecemeal without further architectural work.

---

## 4. Editor → agent context bridge — shipped (2026‑04‑25)

The bridge is live in `features/code/agent-context/`. It mirrors the open editor tabs into the active chat instance's `instanceContext`, so the Python agent can pull buffer content lazily via `ctx_get` instead of having every body inlined into every prompt.

### 4.1 ctx_get key list

| Key | Always emitted? | Value shape | Notes |
|---|---|---|---|
| `editor.tabs` | Yes (when bridge is mounted) | `EditorTabsSummary` — see below | Cheap manifest the agent reads first to discover what's open. **No buffer content** lives here. |
| `editor.tab.<tabId>` | One per non-disabled open tab | `EditorTabContextValue` — see below | Carries the buffer content. Agent fetches only the tabs it needs. Stale tabs (closed or disabled in the popover) are removed via `removeContextEntry`. |
| `editor.selection.<tabId>` | On‑demand | `SelectionContextValue` — see below | Created when the user fires the **Send selection as context** Monaco command (Cmd/Ctrl+Shift+L) or the toolbar button. Survives until the user fires it again or closes the tab. |

The `<tabId>` namespace follows the workspace‑wide tab id convention (§1.7) — e.g. `library:abc`, `prompt-app:abc`, `tool-ui:abc:inline_code`, `fs:sandbox:/home/agent/foo.ts`.

### 4.2 Wire format

All values are emitted with `type: "json"` so they round‑trip through `assembleRequest` → `AssembledAgentStartRequest.context` verbatim.

```ts
// editor.tabs
interface EditorTabsSummary {
  tabs: Array<{
    id: string;
    path: string;
    name: string;
    language: string;
    dirty: boolean;
  }>;
  activeId: string | null;
}

// editor.tab.<tabId>
interface EditorTabContextValue {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  pristineContent: string;
  dirty: boolean;
  remoteUpdatedAt?: string;
}

// editor.selection.<tabId>
interface SelectionContextValue {
  id: string;
  path: string;
  name: string;
  language: string;
  selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  text: string;
  capturedAt: string;
}
```

### 4.3 Bridge mechanics

- **Selector** — `selectEditorContextEntries(state)` (`features/code/agent-context/editorContextEntries.ts`) builds the canonical entry list from `tabsSlice`. Memoized via Reselect; only re‑runs when tab ids/content/language/dirty references change.
- **Per‑instance disable list** — `instanceUIState.byConversationId[id].editorContextDisabledTabs: string[]` holds tab ids the user has explicitly excluded. `filterDisabledTabs` strips them from the entry list **and** prunes them out of the `editor.tabs` summary's `tabs[]` so the agent never sees ghosts.
- **Sync hook** — `useSyncEditorContext(conversationId)` is mounted once in `ChatPanelSlot` (auto‑on whenever a workspace + conversation are both live). Debounce 250ms. On each push it dispatches `setContextEntries` with the live entries, then dispatches `removeContextEntry` for any keys present in the previous push but absent now (closed tabs / newly disabled tabs).
- **Selection capture** — `useSendSelectionAsContext({ conversationId, activeTab, editorRef })` exposes a `sendSelection()` callback. Wired to (a) the Monaco command `Cmd/Ctrl+Shift+L` (registered inside `MonacoEditor`), and (b) the new Brain icon in `EditorToolbar`. Empty selection → toast error; success → toast confirmation with the captured length.

### 4.4 UI surface

- **Chat header** — `<ContextChip>` next to the agent picker. Shows `<included>/<total>` with a brain glyph; clicking opens a popover with one row per open tab + All / None buttons. Toggles persist in `instanceUIState.editorContextDisabledTabs` so they survive conversation refreshes within the session.
- **Editor toolbar** — Brain icon next to Save. Disabled when there's no `conversationId` in the URL or no active tab. Tooltip surfaces the keybinding.

### 4.5 Why this shape

- **No prompt bloat.** The summary is tiny; the bodies live in `instanceContext` which the model only reads via `ctx_get` per‑turn. No buffer ever shows up in `cx_message.content`.
- **No surprise edits.** The bridge is one‑way (editor → context). Agent edits flow through normal MCP/tool calls; we never round‑trip via `instanceContext`.
- **Per‑conversation scoping.** Disable lists live on the conversation's `instanceUIState`, so the same workspace can serve multiple chat instances with different exposure settings.
- **Stable keys.** `editor.tab.<tabId>` reuses the workspace‑wide tab id convention (§1.7), so an agent can correlate a context entry with any other workspace event (save, conflict, etc.) by id alone.

---

## 5. Monaco type environments — shipped

The system in `features/code/editor/monaco-environments/` is live: a refcounted registry plus a hook that activates the right environment per active tab.

```
features/code/editor/monaco-environments/
  types.ts                 // MonacoEnvironment interface
  registry.ts              // refcounted activate/deactivate; disposes ITypingsExtraLib handles
  useEnvironmentForActiveTab.ts
  envs/
    prompt-app.ts          // React 19 + Lucide + ShadCN ambient .d.ts subset
    aga-app.ts             // shares the prompt-app baseline
    tool-ui.ts             // React baseline + tool-result typing utility
    library.ts             // minimal opt-in env for arbitrary code_files
    sandbox-fs.ts          // node typings only when the file extension warrants
    html.ts                // JSON schemas only (no TS)
  resolveEnvironmentForTab.ts // tab id + path → environment id
```

A status‑bar pill in `features/code/layout/StatusBar.tsx` shows the active env (or `env: off` when the global toggle is off). The Code Workspace settings tab exposes a `monacoEnvironmentsEnabled` switch; default is on. Activation is refcounted, so opening a second `prompt-app:*` tab does not re‑register libs and closing one of two does not tear down. Disposing on transitions is critical because Monaco's TS worker otherwise accumulates extra libs forever.

Diagnostics policy: structured envs (`prompt-app`, `aga-app`, `tool-ui`, `library`) keep `noSemanticValidation: false`. `sandbox-fs` keeps `noSemanticValidation: true` because we have no visibility into the surrounding repo's tsconfig.

---

## 6. Acceptance gate

The QA contract is in [`QA_CHECKLIST.md`](./QA_CHECKLIST.md). It runs the 10‑step end‑to‑end smoke (create hosted sandbox → connect → watcher → git clone → ripgrep search → streaming exec → real PTY (`vim`) → prompt‑app save with type env → forced conflict → 30‑min idle heartbeat → editor‑context `ctx_get`). Re‑run after any non‑trivial change to either the workspace or the orchestrator surface.

---

## 7. Reference index (selected)

| File | Why it matters |
|------|----------------|
| `features/code/CodeWorkspace.tsx` | Mounts the workspace + `UrlOpenFileBridge`. |
| `features/code/layout/WorkspaceLayout.tsx` | The panel orchestration + `rightmost` injection. |
| `features/code/redux/tabsSlice.ts` | `EditorFile` shape, `replaceTabContent`, `setTabRemoteUpdatedAt`. |
| `features/code/types.ts` | `EditorFile.remoteUpdatedAt`, `ActivityViewId`. |
| `features/code/library-sources/types.ts` | `LibrarySourceAdapter`, `RemoteConflictError`. |
| `features/code/library-sources/index.ts` | Side‑effect registration of every adapter. |
| `features/code/hooks/useSaveActiveTab.ts` | The save‑routing brain. |
| `features/code/hooks/useOpenSourceEntry.ts` | Loads + opens any source‑backed entry. |
| `features/code/hooks/useSaveAndOpenInCodeEditor.ts` | Public helper for "save anywhere → /code". |
| `features/code/SANDBOX_API_WISHLIST.md` | Retired — points back to §3 of this doc. |
| `features/code/QA_CHECKLIST.md` | 10‑step end‑to‑end smoke against the hosted tier. |
| `features/code/agent-context/` | Editor → agent context bridge (selector + sync hook + selection capture). |
| `features/code/editor/monaco-environments/` | Refcounted Monaco type‑environment registry. |
| `features/code/views/source-control/` | Git activity view (status / diff / commit / push / credentials). |
| `lib/sandbox/api-surface.ts` | Per‑tier capability cache fed by `GET /api-surface`. |
| `app/api/sandbox/[id]/pty/route.ts` | WebSocket‑upgrade proxy for the orchestrator PTY route. |
| `features/agents/redux/execution-system/instance-context/instance-context.slice.ts` | The slot the editor will write into. |
| `features/agents/redux/execution-system/thunks/execute-instance.thunk.ts` | `assembleRequest` packs `instanceContext` into the wire. |
| `features/agents/types/request.types.ts` | `AssembledAgentStartRequest.context`. |

---

*If a section here goes stale, fix it — this doc is meant to be authoritative, not historical.*
