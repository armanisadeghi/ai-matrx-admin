# `/code` Workspace — System State & Gap Audit

**Last updated:** 2026‑04‑26
**Scope:** Everything under `features/code/`, plus its hooks, adapters, and the slices it consumes from elsewhere in the app.

This doc is the single source of truth for the `/code` (VSCode‑style) workspace. It captures (1) what is shipped, (2) what is wired but incomplete, (3) what is intentionally deferred, and (4) the shape of the next four work items: Monaco type environments, sandbox API delivery audit, editor→agent context protocol, and known‑environment settings.

> **2026-04-26 update:** the sandbox API audit in §3 has been rewritten — the previous "wishlist not delivered" verdict was based on probing `/openapi.json` against a stale EC2 deploy. The actual orchestrator code (v0.2.0) implements the rich proxy surface, but the proxy routes use `@router.api_route` with broad path catchalls that don't surface in OpenAPI the same way. There is also a new self-hosted "hosted-tier" orchestrator at `https://orchestrator.dev.codematrx.com` — see §3 below.

---

## 0. Executive snapshot

| Area | Status | Comment |
|------|--------|---------|
| Workspace shell, panels, activity bar | ✅ Shipped | `WorkspaceLayout`, `react-resizable-panels`, all five activity views render. |
| Monaco editor, tabs, dirty state, `Cmd/Ctrl+S` | ✅ Shipped | Save dispatches to the right backend by tab id. |
| Filesystem adapters (Mock, Sandbox via `exec`) | ✅ Shipped, ⚠️ shell‑bound | Sandbox adapter synthesises `ls`/`cat`/`base64` because the orchestrator has no FS API. |
| Process / terminal adapter | ✅ Shipped, ⚠️ no streaming | xterm.js client‑side; one‑shot exec per command; no PTY. |
| Code Library: `code_files`/`code_folders` browser | ✅ Shipped | Backed by the existing `code-files` Redux slice. |
| Library Source Adapters (`prompt_apps`, `aga_apps`, `tool_ui_components`) | ✅ Shipped | Direct‑edit source rows with optimistic concurrency. |
| Universal "save & open in code editor" flow | ✅ Shipped | Wired into `HtmlPreviewModal` and chat code blocks. |
| Conversation history / agent filter / favorites | ✅ Shipped | Lives next to the chat panel; filter by tags; date/agent grouping. |
| Per‑adapter Monaco type environments | ❌ Not built | This is why prompt‑app/aga‑app/tool‑ui tabs show spurious type errors. **(Item #2)** |
| Sandbox API beyond `exec` + `heartbeat` | ❌ Not delivered | Verified directly against `http://54.144.86.132:8000/openapi.json`. **(Item #3)** |
| Editor → agent context‑bag protocol | 🟡 Half built | The Python side already has `ctx_get`/`instanceContext`. Editor side needs a bridge + UI. **(Item #4)** |
| Real Git, search, watcher, port forward, LSP | ❌ Not delivered | Blocked on sandbox API. |

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

### 2.1 Per‑adapter Monaco type environments — Item #2 in the user's request

**Symptom:** Open a `prompt-app:*` tab — Monaco shows red squiggles on `import { Button } from '@/components/ui/button'`, on `useState`, on JSX, etc. The compiler thinks they're ambient errors.

**Root cause:** `features/code/editor/monaco-config.ts` deliberately registers **no** `extraLib` definitions ("for an arbitrary‑file editor it's noisier than helpful"). The type definitions used by the legacy `features/code-editor/` editor (`features/code-editor/config/type-definitions.ts` — React, lucide, shadcn UI) are not loaded by `/code`.

**Why "deliberate" was right but is now wrong:** When the editor only opened sandbox files of arbitrary repos, dumping React types in confused things. Now the editor opens **specific, structured** content (a prompt app's component, a tool UI component's `inline_code` field) where we know exactly what runtime is in scope. The fix is to pick the right environment per tab, not globally.

**What's needed (designed, not built):**
- A `MonacoEnvironment` registry keyed by `environmentId`.
- Each environment lists the `extraLibs` and (optionally) compiler‑option overrides to apply when a file from that environment is open.
- `LibrarySourceAdapter` declares which environment its tabs use.
- `MonacoEditor` lazily loads + activates an environment on first use; deactivates on close.

Concrete environments we will need on day one:

| ID | Used by | Includes |
|----|---------|----------|
| `prompt-app-v1` | `prompt_apps` | React 19 minimal types, lucide‑react subset, shadcn UI subset, `PromptAppContext` ambient. JSX preserve. `strict: false`, `checkJs: false`, but `noSemanticValidation: false`. |
| `aga-app-v1` | `aga_apps` | Same as prompt‑app plus the `AgaAppHostProps`, `useAgaApp()` ambient hook. |
| `tool-ui-inline-v1` | `tool_ui_components.inline_code` | React + `ToolInlineProps<TArgs, TResult>`. |
| `tool-ui-overlay-v1` | `tool_ui_components.overlay_code` | React + `ToolOverlayProps<TArgs, TResult>`, `closeOverlay()`. |
| `library-tsx-v1` | `code_files` of kind `*.tsx` | React 19 globals only, no project‑internal modules. |
| `sandbox-bare-v1` | `Sandbox*Adapter` | Currently `noSemanticValidation: true` — same as today. |

The exact ambient declarations for `PromptAppContext`, `AgaAppHostProps`, `ToolInlineProps`, `ToolOverlayProps` should be **generated** from the actual runtime types so they never drift; we'll wire a small build step to re‑emit them. Until that lands we hand‑maintain a single `features/code/library-sources/environments/<id>.d.ts.ts` per env.

> Open question for the user: do you want me to (a) hand‑author the ambient .d.ts strings now and ship the env registry, or (b) also wire the `features/code-editor/config/type-definitions.ts` legacy bundle in as a fallback so things "just compile" while we author proper envs? My recommendation is **(a)** — clean envs from the start; the legacy bundle was an `any`‑heavy compromise.

### 2.2 Sandbox orchestrator — Item #3 in the user's request

The team confirmed the wishlist is "done." A direct probe of `http://54.144.86.132:8000/openapi.json` says **otherwise**. See §3 for the full audit. TL;DR: only `POST /sandboxes/{id}/heartbeat` shipped. Nothing else from the wishlist is on the orchestrator yet.

### 2.3 Editor → agent context‑bag protocol — Item #4 in the user's request

**Status:** Server‑side primitive (`ctx_get`) and Redux slot (`instanceContext`) already exist. Editor‑side bridge does not. See §4 for the design.

### 2.4 Terminal: not a real PTY

`features/code/terminal/TerminalTab.tsx` is xterm.js eating one‑shot `exec` responses. Arrow keys scroll history but are not sent to a remote shell; ctrl‑c can't interrupt a running command (it just kills the in‑flight HTTP request); `vim` / `nano` / `git commit` (which spawns an editor) cannot run. Blocked on §3.1.3 of the wishlist.

### 2.5 Realtime push for source rows

`useSaveActiveTab` does optimistic concurrency on save. The reverse direction — getting **notified** when someone else updates the row — is a TODO. The slice already supports this (`replaceTabContent` action). To turn it on we need a Supabase Realtime subscription per open source‑backed tab; this is a small follow‑up and is documented in `features/code/types.ts` as a TODO on `EditorFile.remoteUpdatedAt`.

### 2.6 `Sandboxes` panel: TTL/extend bug

`PUT /api/sandbox/[id] { action: "extend" }` only updates the Postgres row — it never tells the orchestrator. The orchestrator runs its own clock (and now also accepts heartbeats), so we have drift. Fixed up by either (a) calling the new `/sandboxes/{id}/heartbeat` from the workspace every 60s while the sandbox is the active backend, or (b) waiting for the (still missing) `POST /sandboxes/{id}/extend` endpoint. See §3.

### 2.7 No source control panel

There is no Git activity view yet. The plan is `features/code/views/source-control/` backed by a `SandboxGitAdapter` once the `/git/*` endpoints land. Until then, all git work is via the (fake) terminal.

### 2.8 Other deferred items

- **No file watch / live reload** — needs §3.2.1 from the wishlist.
- **No find‑in‑files** — needs §3.2.2.
- **No port forward / preview URLs** — needs §3.2.5.
- **No LSP** — needs §3.3.3.
- **No multi‑user collab on a sandbox** — needs §3.3.2.
- **No bulk upload / zip download** — needs §3.2.3.

---

## 3. Sandbox API delivery audit (revised 2026‑04‑26)

The orchestrator code on disk (v0.2.0) implements the full rich surface. The previous "only 8 endpoints" finding came from probing `/openapi.json`, which omits routes registered with `@router.api_route("/{sandbox_id}/fs/{path:path}", methods=[...])`-style catchalls. The new authoritative discovery endpoint is `GET /api-surface` — frontends should use that instead.

There are now **two orchestrators**:

| Tier | URL | Backed by |
|---|---|---|
| `ec2` | `http://54.144.86.132:8000` | EC2 host, S3 hot/cold, Supabase Postgres |
| `hosted` | `https://orchestrator.dev.codematrx.com` | Matrx dev server, Docker volumes, in‑memory store today |

Sandboxes carry a `tier` field (persisted in `sandbox_instances.config.tier`) so the proxy routes can forward to the right orchestrator. See `lib/sandbox/orchestrator-routing.ts`.

### 3.1 Wishlist scoreboard (orchestrator code v0.2.0)

| Wishlist item | Priority | Code on disk | EC2 deploy | Hosted deploy | Frontend |
|---|---|---|---|---|---|
| §3.1.1 Structured FS API (list/stat/read/write/patch/delete/mkdir/rename/copy/upload/download/batch) | P0 | ✅ | 🚀 stale (deploy disk-full; see matrx-sandbox `docs/OPERATIONS.md`) | ✅ live | ✅ `SandboxFilesystemAdapter` rewritten 2026‑04‑26 |
| §3.1.2 Streaming `exec` (SSE) with env/stdin | P0 | ✅ | 🚀 | ✅ | ✅ `SandboxProcessAdapter.stream()` |
| §3.1.3 Real PTY WebSocket | P0 | ✅ | 🚀 | ✅ | ⏳ `TerminalTab` rewrite still pending |
| §3.1.4 Git workflow primitives | P0 | ✅ | 🚀 | ✅ | ✅ `SandboxGitAdapter` |
| §3.1.5 Git credential model | P0 | ✅ | 🚀 | ✅ | ✅ via `SandboxGitAdapter.setGithubToken/...` |
| §3.1.6 Template selection at create time | P0 | ✅ (`template`, `template_version`, `tier`, `resources`, `labels`) | 🚀 | ✅ | ✅ create flow accepts these (Sandboxes panel UI still pending) |
| §3.1.7 TTL `extend` (persists `expires_at`) + heartbeat | P0 | ✅ | 🚀 | ✅ | ✅ `/api/sandbox/[id]/extend` + `useSandboxHeartbeat` |
| §3.2.1 File watcher (WebSocket) | P1 | ✅ `/fs/watch` | 🚀 | ✅ | ✅ `SandboxFilesystemAdapter.watch()` |
| §3.2.2 Server‑side search (ripgrep + fd) | P1 | ✅ `/search/{path}` | 🚀 | ✅ | ✅ `searchContent` / `searchPaths` on the adapter |
| §3.2.3 Bulk fs / upload / download | P1 | ✅ in daemon | 🚀 | ✅ | ⏳ adapter helpers pending |
| §3.2.4 Process listing + signal | P1 | ✅ `/processes` | 🚀 | ✅ | ✅ proxy routes; consumer pending |
| §3.2.5 Port listing | P1 | ✅ `/ports` | 🚀 | ✅ | ✅ proxy route; consumer pending |
| §3.2.5 Public preview URL exposure | P1 | ❌ | — | — | — |
| §3.3.* Snapshot / multi‑user / LSP / AI sockets | P2 | ❌ | — | — | — |
| (new) `POST /sandboxes/{id}/complete` | n/a | ✅ | ✅ | ✅ | not consumed |
| (new) `POST /sandboxes/{id}/error` | n/a | ✅ | ✅ | ✅ | not consumed |
| (new) `GET /api-surface` | n/a | ✅ v0.2.0 | 🚀 | ✅ | not consumed (use for capability discovery) |

**Net delivery:** Every P0 surface shipped in code; hosted tier is fully live; EC2 deploy is blocked by an infra issue (host disk full). Frontend has caught up on backends/adapters; `TerminalTab` PTY rewrite + bulk upload UI are the remaining client gaps.

### 3.2 Discovery — use `/api-surface`, not `/openapi.json`

Both orchestrators expose `GET /api-surface` (no auth). It returns the authoritative route list including the catchall proxy routes, plus `tier` and `version`. Use this when documenting capabilities or detecting feature support. The `/openapi.json` schema is incomplete — keep it for human reference only.

### 3.3 EC2 deploy resilience

The two prior deploy failures and the 2026‑04‑26 attempt all failed at "Deploy to EC2 via SSM" with `failed to register layer: ... no space left on device`. Remediation belongs to the matrx-sandbox ops side (prune Docker on the host, add a workflow `docker system prune -af` step before `docker pull`). Until that lands, the EC2 tier stays on pre-wishlist code; the hosted tier (this server) is unaffected.

---

## 4. Editor → agent context‑bag protocol — design

### 4.1 The Python primitive already exists

The agent execution system already implements the exact pattern the user described:

- `instanceContext` slice (`features/agents/redux/execution-system/instance-context/instance-context.slice.ts`) holds a per‑conversation `Record<string, InstanceContextEntry>`.
- `assembleRequest` reads `selectContextPayload(conversationId)` and packs it into `AssembledAgentStartRequest.context: Record<string, unknown>`.
- The slice header comment is explicit: *"The model doesn't see them directly — it retrieves them via `ctx_get`."*

So the wire protocol, the server tool, and the Redux slot are all there. The slot is currently filled by manual user actions (drag a Resource onto the chat panel, etc.). What's missing is the **editor → instanceContext bridge**.

### 4.2 Design goals

1. **Zero context bloat.** No file body ever appears in the assistant prompt. The model sees a manifest entry and decides per‑turn whether to pull the body via `ctx_get`.
2. **One key per file, stable across edits.** `editor.tab.<tabId>` — same tab id used everywhere else in the workspace.
3. **Single index entry the model can cheaply read.** A `editor.manifest` key holding `[{ id, label, language, kind, path, dirty, sizeChars, hash }, …]` for every exposed tab, so the model can list them with one `ctx_get`.
4. **User control.** A toggle per tab ("Expose to agent" — default ON for the active tab, OFF for the rest) so the user can scope the assistant's view.
5. **No surprise mutation.** Setting context never edits the conversation history. Removing a tab from context simply removes the entry; if the model already pulled it, that's fine — its earlier turns stand.
6. **Adapter‑agnostic.** Works the same for Mock FS, Sandbox FS, code_files, prompt_apps, aga_apps, tool_ui_components.

### 4.3 Shape of an entry

```ts
type EditorContextEntryValue =
  | { kind: "manifest"; entries: ManifestRow[] }
  | { kind: "file";
      tabId: string;
      label: string;          // human display name
      language: string;       // monaco language id
      origin: "fs" | "code_files" | "library_source";
      path?: string;          // present for fs / code_files
      sourceId?: string;      // present for library_source ("prompt_apps" etc)
      rowId?: string;         // present for library_source
      fieldId?: string;       // present for multi‑field library sources
      dirty: boolean;
      sizeChars: number;
      hash: string;           // sha1 of current content; lets the model cache
      content: string;        // ★ the actual body — only ever fetched via ctx_get
    };

interface ManifestRow {
  tabId: string; key: string; label: string; language: string;
  origin: string; path?: string; sourceId?: string;
  dirty: boolean; sizeChars: number; hash: string;
}
```

Keys:
- `editor.manifest` → manifest entry (always present, even if empty).
- `editor.tab.<tabId>` → file entry for each **exposed** tab.

### 4.4 Bridge implementation (sketch)

A new module `features/code/agent-context/` with:

```
agent-context/
  types.ts                 // EditorContextEntryValue, ManifestRow
  selectors.ts             // selectExposedTabs, selectEditorManifest
  useEditorContextSync.ts  // the bridge hook
  EditorContextToggleButton.tsx  // per‑tab UI
  preferences.ts           // userPreferences.coding.editorContext: { defaultExposeActiveOnly: boolean, sizeCapKB: number }
```

`useEditorContextSync(conversationId)` is the single integration point. It is mounted once by the chat panel for the active conversation. It:

1. Subscribes to `selectExposedTabs` (debounced ~200ms).
2. Diffs vs. the current `state.instanceContext.byConversationId[conversationId]`.
3. Dispatches `setContextEntries` for added/changed entries and `removeContextEntry` for removed ones.
4. Always emits the `editor.manifest` row.
5. Honors a hard size cap (`coding.editorContext.sizeCapKB`, default 256 KB total) — if exceeded, drops the largest non‑active entries first and surfaces a toast.

### 4.5 Why we don't put file bodies on the user message

We considered piggy‑backing on the existing `Resource` mechanism (which packs files into `user_input` as `MessagePart`s). Two problems:

1. Resources are **part of the message record**. They live forever in `cx_message.content` and bloat every subsequent turn's prompt. The user explicitly said "no context bloat."
2. Resources are user‑visible inputs, not ambient. Using them for "the editor's open files" muddies the conversation history.

`instanceContext` is the right slot precisely because it is **ambient and lazily retrieved** — the server hands the model a list of keys and the model fetches what it needs.

### 4.6 Required python‑side touches (questions we need to confirm)

The Python team will need to:

- Confirm `ctx_get` already accepts a `kind: "file"` payload shape with a `content` string and exposes the manifest tool. If `ctx_get` is body‑agnostic (current assumption), no Python change is needed — the model just gets back the JSON value verbatim.
- Optionally add a `ctx_list_files` convenience tool that filters `ctx_get` keys by the `editor.tab.*` prefix and returns the manifest. This is a 5‑line shortcut for the model and is a nice‑to‑have, not required.

If `ctx_get` only supports primitives (text/file_url) today, we need either (a) a content‑type extension or (b) we serialize bodies to text and inline them under a `language` hint. Let's confirm with Python before implementing.

### 4.7 UI surface

- **Editor toolbar**: a "Context" group with a **Sync icon** badge showing `<exposed>/<total>` open tabs. Click → popover with checkboxes per tab.
- **Tab strip**: a small dot on each tab when it's currently exposed.
- **Chat panel header**: a single‑line summary (e.g., `Sharing 3 files · 12 KB`) that opens the same popover.

### 4.8 Settings (`features/settings/tabs/CodeWorkspaceTab.tsx`)

Add:

- `defaultExposeActiveOnly: boolean` (default `true`)
- `defaultExposeAll: boolean` (default `false`)
- `sizeCapKB: number` (default `256`)
- `excludeBinaryExtensions: string[]` (default `["png","jpg","jpeg","gif","webp","pdf","zip","tar","gz","exe","dll","bin"]`)

### 4.9 Open questions to confirm before implementing

1. **`ctx_get` content‑type:** Does `ctx_get` round‑trip arbitrary JSON values (including a `string` body of any size), or is there a per‑value cap on the Python side?
2. **Manifest tool:** Does it make sense for Python to expose a `ctx_list_files` shortcut, or is `ctx_get("editor.manifest")` enough?
3. **Default exposure:** Should the active tab be exposed automatically on every conversation, or only when the user explicitly opts in?
4. **History tabs:** When the user navigates away from `/code` and the conversation continues, do we keep the last‑synced manifest in `instanceContext`, or zero it out? My default is **zero out on workspace exit** — the agent should reflect the live editor state, not a stale snapshot. Confirm.

---

## 5. "Known environments" type‑error fix — concrete plan

(Restating §2.1 in actionable form so we can ship it next.)

```
features/code/library-sources/environments/
  types.ts                 // MonacoEnvironment interface
  registry.ts              // register/getEnvironment/listEnvironments
  prompt-app-v1.ts         // ambient .d.ts strings + compilerOptions overrides
  aga-app-v1.ts
  tool-ui-inline-v1.ts
  tool-ui-overlay-v1.ts
  library-tsx-v1.ts
  index.ts                 // side‑effect register + barrel
```

```
features/code/editor/
  monaco-environment.ts    // applyEnvironment(monaco, envId), refcounted
  MonacoEditor.tsx         // accepts environmentId prop; calls applyEnvironment in BeforeMount
```

`LibrarySourceAdapter` gains an optional `environmentId?: string`. `useOpenSourceEntry` reads it and stamps it onto the new `EditorFile.environmentId` field; `EditorArea` passes it through. `MockFilesystemAdapter` and `SandboxFilesystemAdapter` get an `environmentId` per‑node hint (via simple extension matching) so `library-tsx-v1` is also picked up for arbitrary `.tsx` files we open.

Activation is **refcounted** — opening a second `prompt-app:*` tab does not re‑register libs, closing one of two doesn't tear down. We hold a `Map<envId, count>` and only call Monaco's `addExtraLib` / `dispose` on transitions. `dispose` is critical because Monaco's TS worker accumulates extra libs forever otherwise.

Diagnostics policy per env: `prompt-app-v1` and friends turn `noSemanticValidation: false` on so the user actually sees real type errors. `sandbox-bare-v1` keeps `noSemanticValidation: true` because we have no idea what the surrounding repo's tsconfig looks like.

---

## 6. Ordered work plan (next sessions)

1. **(M)** Build `features/code/library-sources/environments/` with the six envs in §2.1, plus `applyEnvironment` refcounting in `MonacoEditor`. Wire `environmentId` through `LibrarySourceAdapter` → `useOpenSourceEntry` → `EditorFile`. Verify no spurious red squiggles on a real prompt‑app tab.
2. **(S)** Ship `useSandboxHeartbeat` + a tiny proxy route `/api/sandbox/[id]/heartbeat` so we stop drifting against the orchestrator. (The heartbeat endpoint *is* live.)
3. **(L)** Pause for confirmation on §4 (editor‑context bridge); answer the four questions in §4.9 with the Python team; then ship `features/code/agent-context/`.
4. **(M)** Add Realtime subscriptions for source‑backed tabs (§2.5) so `remoteUpdatedAt` flows in passively.
5. **(blocked)** Sandbox API rewrite (`SandboxFilesystemAdapter`, `SandboxProcessAdapter.stream`, `TerminalTab` PTY wiring, `SandboxGitAdapter`) — wait for orchestrator delivery per §3.

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
| `features/code/SANDBOX_API_WISHLIST.md` | The contract handed to the orchestrator team. |
| `features/agents/redux/execution-system/instance-context/instance-context.slice.ts` | The slot the editor will write into. |
| `features/agents/redux/execution-system/thunks/execute-instance.thunk.ts` | `assembleRequest` packs `instanceContext` into the wire. |
| `features/agents/types/request.types.ts` | `AssembledAgentStartRequest.context`. |

---

*If a section here goes stale, fix it — this doc is meant to be authoritative, not historical.*
