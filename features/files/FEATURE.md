# Cloud Files — Feature Architecture

**Status:** ✅ Phase 11 complete. Legacy system deleted, cloud-files is the only file system in the app.
**Owner:** Files migration team.
**Last updated:** 2026-04-25.

This is the live architecture doc for the new file management system under `features/files/`. It supersedes the legacy Supabase-Storage-based system progressively over 12 phases ([migration/MASTER-PLAN.md](migration/MASTER-PLAN.md)).

If you're modifying anything in this feature, **also update this doc and [migration/INVENTORY.md](migration/INVENTORY.md) in the same change.** Stale docs cascade across parallel agents.

---

## TL;DR

- **Reads** go through `supabase-js` (RLS-enforced): table queries + one RPC (`cloud_get_user_file_tree`).
- **Writes** go through a REST API (`${AIDREAM_API_URL}/files/*`) served by a new Python/FastAPI service that owns S3.
- **Live updates** come from Supabase Realtime on `cloud_files`, `cloud_file_versions`, `cloud_file_permissions`, `cloud_file_share_links`.
- **State** lives in a single `cloudFiles` Redux slice, modeled on [features/agents/redux/agent-shortcuts/](../agents/redux/agent-shortcuts/): normalized, dirty-tracked, optimistic + rollback.
- **Components** are built once in `features/files/components/core/` and composed into 6 **surfaces**: Page, WindowPanel, MobileStack, Embedded, Dialog, Drawer. The core never knows its host.
- **Route** for the full app is [app/(a)/cloud-files/](../../app/(a)/cloud-files/). Public shares under [app/(public)/share/[token]/](../../app/(public)/share/).

**Backend contract:** [cloud_files_frontend.md](cloud_files_frontend.md) — owned by the Python team. Never drift from it.

---

## Architecture diagram

```
                       ┌────────────────────────────────┐
                       │   features/files/ (this dir)   │
                       └──────────────┬─────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────┐           ┌────────────────────┐          ┌─────────────────┐
│ redux/       │           │ components/        │          │ api/            │
│ (slice +     │◄──────────│ core + surfaces    │─────────►│ typed fetch     │
│  realtime    │           │ + pickers          │          │ client (REST)   │
│  middleware) │           └────────────────────┘          └────────┬────────┘
└──────┬───────┘                                                    │
       │                                                            │
       ▼                                                            ▼
┌──────────────┐                                           ┌─────────────────┐
│ supabase-js  │                                           │ FastAPI + S3    │
│ (reads + RT) │                                           │ (owns bytes)    │
└──────┬───────┘                                           └────────┬────────┘
       └──────────────────────┬─────────────────────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │ Supabase Postgres │
                    │ cloud_* tables    │
                    │ (RLS on all)      │
                    └───────────────────┘
```

**Separation of concerns (strict):**

| Concern | Where |
|---|---|
| JWT / auth | Supabase — shared across supabase-js and REST `Authorization: Bearer` |
| File bytes | REST API only. Browser never touches S3. |
| Metadata reads (list, tree, versions, permissions) | supabase-js (RLS auto-filters) |
| Writes (upload, rename, move, delete, permissions, shares) | REST API (auth-gated, admin/write checks) |
| Cross-session updates | Supabase Realtime subscriptions |
| UI state (selection, view mode, sort, active) | Redux |
| Server-rendered seeds | `'use cache'` + `cacheTag()` in Server Components |

---

## Data model

Tables (Postgres, RLS enforced):

- `cloud_files` — file metadata. `owner_id`, `file_path` (logical), `storage_uri` (S3), `file_name`, `mime_type`, `file_size`, `checksum`, `visibility` (public | private | shared), `current_version`, `parent_folder_id`, `metadata` jsonb, timestamps, `deleted_at` (soft delete).
- `cloud_folders` — folder metadata. Hierarchical via `parent_folder_id`.
- `cloud_file_versions` — every version's bytes pointer. Identifies by `(file_id, version_number)`.
- `cloud_file_permissions` — `resource_id`, `resource_type` (file | folder), `grantee_id`, `grantee_type` (user | group), `permission_level` (read | write | admin), `expires_at`.
- `cloud_file_share_links` — `share_token`, `resource_*`, `permission_level`, `expires_at`, `max_uses`, `use_count`, `is_active`.
- `cloud_file_groups` — user groups for bulk permissions.

RPC:
- `cloud_get_user_file_tree(p_user_id uuid)` — returns the full tree the user can see in one round-trip, including `effective_permission` per row.

Full type definitions live in [types.ts](types.ts). Never duplicate.

---

## State model

Slice key: `cloudFiles`. State shape:

```ts
{
  filesById: Record<string, CloudFileRecord>          // normalized
  foldersById: Record<string, CloudFolderRecord>      // normalized
  versionsByFileId: Record<string, CloudFileVersion[]>
  permissionsByResourceId: Record<string, CloudFilePermission[]>
  shareLinksByResourceId: Record<string, CloudShareLink[]>

  tree: {
    rootFolderIds: string[]
    childrenByFolderId: Record<string, { folderIds: string[]; fileIds: string[] }>
    fullyLoadedFolderIds: Record<string, true>
    status: 'idle' | 'loading' | 'loaded' | 'error'
    error: string | null
  }

  selection: { selectedIds: string[]; anchorId: string | null }

  ui: {
    viewMode: 'list' | 'grid' | 'columns'
    sortBy: 'name' | 'updated_at' | 'size' | 'type'
    sortDir: 'asc' | 'desc'
    activeFileId: string | null
    activeFolderId: string | null
  }

  uploads: { byRequestId: Record<string, UploadState> }
}
```

Every `*Record` extends its domain type with runtime metadata (`_dirty`, `_dirtyFields: FieldFlags<K>`, `_fieldHistory`, `_loadedFields`, `_loading`, `_error`, `_pendingRequestIds`). Pattern copied from [features/agents/redux/agent-shortcuts/slice.ts](../agents/redux/agent-shortcuts/slice.ts).

`FieldFlags` comes from [features/agents/redux/shared/field-flags.ts](../agents/redux/shared/field-flags.ts) — imported, not duplicated. **Never use `Set` in Redux state** (not JSON-serializable).

---

## Optimistic mutation pattern

Every write thunk follows the same shape (see `saveShortcut` at [features/agents/redux/agent-shortcuts/thunks.ts:481](../agents/redux/agent-shortcuts/thunks.ts#L481) for the reference):

1. Read current record from state.
2. Capture `_fieldHistory` snapshot of the fields we're about to change.
3. Dispatch optimistic reducer (`setFileField` / `upsertFiles` / `removeFile`).
4. Generate `requestId = crypto.randomUUID()`, register in the **request ledger** ([redux/request-ledger.ts](redux/request-ledger.ts)).
5. Call REST API with `X-Request-Id: ${requestId}`.
6. **On success:** `markFileSaved` (clears `_dirty`, clears history) and drop the ledger entry.
7. **On error:** `rollbackFileOptimisticUpdate` (restores from `_fieldHistory`), set `_error`, rethrow.

The request ledger is what lets the realtime middleware **ignore echoes of our own writes** — otherwise the optimistic update would be overwritten by the server broadcast a few ms later.

---

## Realtime model

One subscription per authenticated session, managed by the realtime middleware at [redux/realtime-middleware.ts](redux/realtime-middleware.ts). Attach/detach triggered by [providers/CloudFilesRealtimeProvider.tsx](providers/CloudFilesRealtimeProvider.tsx).

Subscribed tables:
- `cloud_files` — filter `owner_id=eq.${userId}` (RLS handles shared-with-me files via additional publications; we subscribe broadly and rely on RLS to filter).
- `cloud_file_versions`.
- `cloud_file_permissions` — filter `grantee_id=eq.${userId}`.
- `cloud_file_share_links`.

Reconnection: on `SUBSCRIBED` after any disconnect, dispatch `reconcileTree()` — a thunk that re-runs the RPC and reconciles against current state.

**Dedup rule:** every realtime payload is checked against the request ledger. If `payload.new.metadata?.request_id` matches a pending ledger entry (or timestamp-fuzzy-matches within 2s of a recent own write to the same file_id — fallback), skip the dispatch. The record is already optimistic.

---

## Component architecture

```
components/
├── core/                 # framework-agnostic primitives
│   ├── FileTree/         # VS Code-style, virtualized, keyboard-nav, dnd-kit
│   ├── FileList/         # Dropbox/Drive grid + list modes
│   ├── FileIcon/         # icon + color by extension/mime
│   ├── FileMeta/         # size, date, owner, permission chips
│   ├── FilePreview/      # registry + type-specific previewers (Code/Image/Audio/Video/PDF/Text/Data/Generic)
│   ├── FileUploadDropzone/
│   ├── FileBreadcrumbs/
│   ├── FileActions/      # headless actions: rename, move, delete, download, share, copyLink, restoreVersion
│   ├── FileContextMenu/
│   ├── ShareLinkDialog/
│   └── PermissionsDialog/
│
├── surfaces/             # thin per-host wrappers (compose core)
│   ├── PageShell.tsx         # sidebar + main (Next.js routes)
│   ├── WindowPanelShell.tsx  # sidebar + tabs (floating window)
│   ├── MobileStack.tsx       # iOS hierarchical push-nav
│   ├── EmbeddedShell.tsx     # inline embed
│   ├── DialogShell.tsx
│   └── DrawerShell.tsx
│
└── pickers/              # opinionated reusable dialogs
    ├── FilePicker.tsx
    ├── FolderPicker.tsx
    └── SaveAsDialog.tsx
```

**Contract for core components:**
- `fileId` (never path) is the stable identity.
- Always accept `{ className?: string }`.
- No imports from `app/`, `features/window-panels/`, or `useIsMobile`. Surfaces adapt.
- No core component opens a Dialog directly — parent surface decides Dialog vs Drawer.

**Contract for surfaces:**
- Read `useIsMobile()` once near the root and branch there.
- No core component references.
- `Dialog` only on desktop, `Drawer` only on mobile.

---

## Routes

```
app/(a)/cloud-files/                                  # authed app
├── layout.tsx              # Server Component shell + <CloudFilesRealtimeProvider>
├── loading.tsx             # skeleton matching final DOM (zero layout shift)
├── error.tsx
├── page.tsx                # root: tree sidebar + "All files"
├── [[...path]]/page.tsx    # folder deep link
├── f/[fileId]/page.tsx     # file detail (preview + metadata + versions + sharing)
├── share/[token]/page.tsx  # authed share view
└── trash/page.tsx          # soft-deleted

app/(public)/share/[token]/page.tsx                   # public, unauthenticated share view
```

`app/(a)` rules are enforced — see [app/(a)/_read_first_route_rules/RULES.md](../../app/(a)/_read_first_route_rules/RULES.md). SSR-first, zero layout shift, Cache Components patterns.

---

## Invariants

Do not violate. If you're tempted, update this doc first with the reasoning.

1. **Single types file** — [types.ts](types.ts) is the only type source. Consumers import from the barrel, never from subfolders.
2. **No `supabase.storage.*` in new code** — legacy only.
3. **No `Set` in state** — use `FieldFlags<K>`.
4. **No local file state** — everything through the `cloudFiles` slice.
5. **`fileId` is identity** — never cache by `file_path`.
6. **Mutations are optimistic + rollback** — no spinner-then-refetch.
7. **Realtime dedup via request ledger** — every REST write ships a `requestId`.
8. **Dialog on desktop, Drawer on mobile** — enforced by surface branching.
9. **`dvh` not `vh`** under `app/(a)/cloud-files/`.
10. **Docs updated in the same change as code.**

---

## Migration status

See [migration/MASTER-PLAN.md](migration/MASTER-PLAN.md) for the phase-ordered plan and [migration/INVENTORY.md](migration/INVENTORY.md) for the legacy↔new map.

- [x] Phase 0 — Foundation docs
- [x] Phase 1 — Types + API client
- [x] Phase 2 — Redux slice + realtime middleware
- [x] Phase 3 — Core components
- [x] Phase 4 — Surface wrappers
- [x] Phase 5 — Routes
- [x] Phase 6 — WindowPanel integration
- [x] Phase 7 — Hooks + pickers
- [x] Phase 8 — First consumer migration
- [x] Phase 9 — Progressive consumer migration
- [x] Phase 10 — Validation soak (rolled into Phase 11 after the Python team finished their migration — running side-by-side is no longer possible because the legacy backend is gone)
- [x] Phase 11 — Legacy deletion
- [ ] Phase 12 — Backend optimization follow-ups (ongoing; driven by PYTHON_TEAM_COMMS.md)

---

## Change log

- **2026-04-23** — Phase 0 kickoff. Created FEATURE.md, SKILL.md, PYTHON_TEAM_COMMS.md, migration/ scaffold. No runtime code yet.
- **2026-04-23** — Phase 1 complete. Shipped [types.ts](types.ts) (domain, DB row, API, runtime, tree, upload, error types) and [api/](api/) (client.ts with JWT + X-Request-Id + multipart + XHR progress + public endpoints; files.ts, folders.ts, versions.ts, permissions.ts, share-links.ts, groups.ts). All typecheck clean. Logged two new items in PYTHON_TEAM_COMMS.md: table-naming discrepancy (`cloud_share_links` vs `cloud_file_share_links`, `cloud_user_groups` vs `cloud_file_groups`) and `cloud_get_user_file_tree` return shape.
- **2026-04-23** — Phase 2 complete. Shipped Redux backbone: [redux/slice.ts](redux/slice.ts) (normalized filesById/foldersById + tree spine + selection + ui + uploads + realtime state; FieldFlags + optimistic/rollback pattern), [redux/converters.ts](redux/converters.ts) (DB row → domain, tolerant tree RPC parser), [redux/tree-utils.ts](redux/tree-utils.ts) (ancestry, sorting, search, tree builder), [redux/selectors.ts](redux/selectors.ts) (memoized read paths + imperative getters), [redux/thunks.ts](redux/thunks.ts) (loadUserFileTree/reconcileTree/loadFolderContents/loadFileVersions/loadPermissions/loadShareLinks + optimistic upload/rename/move/updateMetadata/delete/restoreVersion/grant/revoke/share-link thunks), [redux/request-ledger.ts](redux/request-ledger.ts) (X-Request-Id correlation with 30s TTL + 2s fuzzy fallback), [redux/realtime-middleware.ts](redux/realtime-middleware.ts) (supabase Realtime subscription with per-row echo dedup + reconcile-on-reconnect), and [providers/CloudFilesRealtimeProvider.tsx](providers/CloudFilesRealtimeProvider.tsx). Wired `cloudFiles` reducer into [lib/redux/rootReducer.ts](../../lib/redux/rootReducer.ts) and middleware into [lib/redux/store.ts](../../lib/redux/store.ts). All typecheck clean under features/files (pre-existing errors in unrelated admin pages are unchanged).
- **2026-04-23** — Phase 3 complete. Shipped core components + utilities + hooks. Utils: [utils/path.ts](utils/path.ts), [utils/format.ts](utils/format.ts), [utils/mime.ts](utils/mime.ts), [utils/icon-map.ts](utils/icon-map.ts) (duplicated + curated from legacy constants), [utils/preview-capabilities.ts](utils/preview-capabilities.ts). Hooks: [hooks/useSignedUrl.ts](hooks/useSignedUrl.ts) (expiry-aware auto-refresh), [hooks/useFileNode.ts](hooks/useFileNode.ts), [hooks/useFolderContents.ts](hooks/useFolderContents.ts), [hooks/useFileSelection.ts](hooks/useFileSelection.ts) (shift-click range), [hooks/useFileUpload.ts](hooks/useFileUpload.ts), [hooks/useCloudTree.ts](hooks/useCloudTree.ts). Core components: [FileIcon](components/core/FileIcon/), [FileMeta](components/core/FileMeta/), [FileBreadcrumbs](components/core/FileBreadcrumbs/), [FileActions](components/core/FileActions/) (headless useFileActions), [FileContextMenu](components/core/FileContextMenu/) (with delete confirm), [FileTree](components/core/FileTree/) (VS Code-style, virtualized via @tanstack/react-virtual, keyboard-navigable ↑/↓/←/→/Enter, dnd-kit moves), [FileList](components/core/FileList/) (list + grid views with content-visibility, sortable columns, dnd moves), [FileUploadDropzone](components/core/FileUploadDropzone/) (react-dropzone + clipboard paste + live UploadProgressList), [FilePreview](components/core/FilePreview/) (registry + Image/Video/Audio/Text/Generic previewers; PDF lazy-loaded via next/dynamic per `bundle-dynamic-imports`), [ShareLinkDialog](components/core/ShareLinkDialog/), [PermissionsDialog](components/core/PermissionsDialog/). All dialogs export a `*Body` variant for mobile Drawer reuse in Phase 4. Applied react-best-practices: memoized row components, `next/dynamic` for heavy PDF bundle, functional setState, derived state in render (no effects for derivations), content-visibility for grid view. Typecheck clean under features/files.
- **2026-04-23** — Phase 4 complete. Shipped surface wrappers: [surfaces/PageShell.tsx](components/surfaces/PageShell.tsx) (Next.js route host — resizable sidebar + breadcrumbs + view-mode toggle + FileList/FilePreview; auto-delegates to MobileStack on mobile via `useIsMobile()`), [surfaces/WindowPanelShell.tsx](components/surfaces/WindowPanelShell.tsx) (sidebar + tabs: Browse / Recent / Shared / Trash; content forceMount-free via `data-[state=inactive]:hidden`), [surfaces/MobileStack.tsx](components/surfaces/MobileStack.tsx) (iOS hierarchical push-nav with CSS-transform slide; 44pt touch targets; `dvh` + `pb-safe`; swipe-back via popstate; floating upload FAB), [surfaces/EmbeddedShell.tsx](components/surfaces/EmbeddedShell.tsx) (inline — folder / owner / custom scopes; isolated selection state so it doesn't hijack global activeFileId), [surfaces/PickerShell.tsx](components/surfaces/PickerShell.tsx) exporting `DialogShell` (desktop) + `DrawerShell` (mobile) + adaptive `PickerShell` that picks between them. All surfaces obey the `useIsMobile()` → Dialog↔Drawer rule. Typecheck clean. Ready for Phase 5 routes.
- **2026-04-23** — Phase 5 complete. Shipped Next.js App Router routes under `app/(a)/cloud-files/` following the `(a)` rules (SSR-first, zero layout shift): [layout.tsx](../../app/(a)/cloud-files/layout.tsx) resolves the user id via `createClient()` server-side then mounts `<CloudFilesRealtimeProvider>`; [loading.tsx](../../app/(a)/cloud-files/loading.tsx) ships a dimension-matched skeleton (sidebar + breadcrumbs + list rows) so the transition is flicker-free; [error.tsx](../../app/(a)/cloud-files/error.tsx) provides a bounded error UI. [[[...path]]/page.tsx](../../app/(a)/cloud-files/[[...path]]/page.tsx) is an optional catch-all that handles both `/cloud-files` and folder deep links like `/cloud-files/reports/2026` — server-side resolves the path → folder id. [f/[fileId]/page.tsx](../../app/(a)/cloud-files/f/[fileId]/page.tsx) renders the PageShell with initialFileId set for preview; 404s via `notFound()` when the file is missing. [share/[token]/page.tsx](../../app/(a)/cloud-files/share/[token]/page.tsx) resolves the token server-side and redirects authed users into the file detail or folder route; invalid/expired links fall through to the public resolver. [trash/page.tsx](../../app/(a)/cloud-files/trash/page.tsx) renders EmbeddedShell with a `deletedAt != null` filter. Public unauthenticated share at [app/(public)/share/[token]/page.tsx](../../app/(public)/share/[token]/page.tsx) fetches the Python backend's `GET /share/:token` with `cache: "no-store"` and renders file metadata + download — no auth required. Async `params` handled per Next.js 16. Typecheck clean. Ready for Phase 6 (WindowPanel integration).
- **2026-04-23** — Phase 6 complete + Phase 5 hardening. **Hardening:** PageShell rewritten to the correct react-resizable-panels v4 API (`orientation`, `autoSave`, `id` on panels, `minSize` only; no more `maxSize`; inner wrapper div owns flex+overflow since v4 Panel renders outer flex + inner scroll div). Added [surfaces/OnboardingEmptyState.tsx](components/surfaces/OnboardingEmptyState.tsx) — inviting first-time-user hero with big cloud badge, primary **Upload files** action, paste-image keyboard hint, and a reassurance trio (Instant sync / Rich previews / Private by default). Rendered inside the main area when the tree has `status === "loaded"` and both file+folder maps are empty. The dropzone still wraps it so drag-and-drop works. **Phase 6:** [features/window-panels/windows/cloud-files/CloudFilesWindow.tsx](../../features/window-panels/windows/cloud-files/CloudFilesWindow.tsx) is a floating WindowPanel wrapper around WindowPanelShell; mounts its own `<CloudFilesRealtimeProvider>` so the subscription works when the window is opened outside `/cloud-files/` routes; persists `activeTab` via `onCollectData`. Registered in [windowRegistry.ts](../../features/window-panels/registry/windowRegistry.ts) as `cloudFilesWindow` (slug `cloud-files-window`) adjacent to the legacy `quickFilesWindow` entry, with `mobilePresentation: "fullscreen"` + `urlSync: { key: "cloud_files" }`. Typecheck clean (zero errors repo-wide).
- **2026-04-23** — Phase 7 complete. Pickers + remaining hooks shipped. **Pickers** (in [components/pickers/](components/pickers/)): [FilePicker.tsx](components/pickers/FilePicker.tsx) + `useFilePicker()` hook (adaptive Dialog/Drawer, single/multi select, extension filters, promise-based); [FolderPicker.tsx](components/pickers/FolderPicker.tsx) + `useFolderPicker()`; [SaveAsDialog.tsx](components/pickers/SaveAsDialog.tsx) + `useSaveAs()` (folder browse + filename input, auto-selects stem, Enter-to-submit, shows computed target path). Each picker ships both declarative (`<FilePicker open={…}/>`) and promise-based (`const files = await open()`) APIs. [CloudFilesPickerHost.tsx](components/pickers/CloudFilesPickerHost.tsx) mounts a single app-level host exposing module-level imperative functions `openFilePicker()` / `openFolderPicker()` / `openSaveAs()` — callable from thunks, non-React code, or anywhere without threading picker state. Warns in dev if called before the host mounts. **Hooks:** [hooks/useSharing.ts](hooks/useSharing.ts) (auto-loads + exposes permissions/shareLinks/activeShareLinks + grant/revoke/create/deactivate callbacks + quickGrantRead shorthand); [hooks/useFileSearch.ts](hooks/useFileSearch.ts) (client-side debounced search across filesById + foldersById maps, returns matched records with `isPending` flag during debounce window). Typecheck clean (zero errors repo-wide).
- **2026-04-23** — Phase 6.5 complete. Reskinned `app/(a)/cloud-files/` as a Dropbox-style shell. Rewrote [surfaces/PageShell.tsx](components/surfaces/PageShell.tsx) around a new [surfaces/dropbox/](components/surfaces/dropbox/) subtree: `IconRail` (slim left nav), `NavSidebar` + `NavSidebarFlatFolders` (secondary nav with flat / tree toggle), `SidebarModeToggle` + `SidebarModeProvider` (cookie-persisted), `TopBar` + `NewMenu` (+ New dropdown: upload files / upload folder / new folder), `ContentHeader` (breadcrumbs + title + gear + Upload / New folder / Open app / Share folder action row + member avatars + access badge), `FilterChips` (Recents / Starred), `ViewModeToggle` (grid / list / columns), `FileTable` + `FileTableRow` (sortable columns, row-hover Share/copy-link/star/more toolbar, inline `FileContextMenu`), `FileGrid` + `FileGridCell` (image-thumbnail grid via `useSignedUrl`), `SharedAvatarStack`, `FolderIconWithMembers`, `AccessBadge`, `EmptyState`. One shell renders every sibling route via the new `section` prop. New routes: [photos](../../app/(a)/cloud-files/photos/page.tsx), [shared](../../app/(a)/cloud-files/shared/page.tsx), [requests](../../app/(a)/cloud-files/requests/page.tsx), [starred](../../app/(a)/cloud-files/starred/page.tsx), [activity](../../app/(a)/cloud-files/activity/page.tsx), [folders](../../app/(a)/cloud-files/folders/page.tsx). Existing routes updated to pass `section` + `initialSidebarMode` read via [utils/server-cookies.ts](utils/server-cookies.ts) (no mode flash). Trash route replaces its old EmbeddedShell client with `PageShell section="trash"`. `_client.tsx` deleted. Starred / Activity / File requests render "Coming soon" states; backend schemas for those are tracked in PYTHON_TEAM_COMMS.md as follow-ups. No changes to the data layer — Redux slice, thunks, selectors, API client, realtime middleware, and core components (FileTree, FilePreview, FileContextMenu, ShareLinkDialog, PermissionsDialog, FileUploadDropzone, FileIcon, FileBreadcrumbs) are untouched. WindowPanelShell / MobileStack / EmbeddedShell / PickerShell remain on their existing look.
- **2026-04-23** — Phase 8 kickoff + API sprint. **Bug fix:** setState-in-render in `useOneShotSelection` (PageShell was dispatching during `useMemo` which triggered subscribers to setState mid-render). Switched to `useEffect` + ref guard — see [surfaces/PageShell.tsx](components/surfaces/PageShell.tsx). **Infrastructure:** Mounted `<CloudFilesPickerHost />` in [app/Providers.tsx](../../app/Providers.tsx) — `openFilePicker()` / `openFolderPicker()` / `openSaveAs()` now callable from anywhere. **New API:** `createFolder` / `deleteFolder` / `ensureFolderPath` thunks (backed by direct supabase-js writes since the Python backend doesn't expose folder-CRUD endpoints — logged in PYTHON_TEAM_COMMS.md as a requested feature). [hooks/useUploadAndGet.ts](hooks/useUploadAndGet.ts) — the recommended "File → fileId" hook for consumers replacing legacy `supabase.storage.upload` — accepts either `parentFolderId` or a `folderPath` that's auto-created via `ensureFolderPath`. [components/core/FileChip](components/core/FileChip/) + `FileChipList` — compact, live-updating reference components for "attached files" lists everywhere in the app. [compat/legacy-file-store.ts](compat/legacy-file-store.ts) — drop-in shim matching `utils/supabase/file-store.ts` exports (uploadFile / downloadFile / deleteFile / listFiles / getPublicUrl / bulk variants) that routes through the new system, mapping legacy `bucketName` → folder prefix. Marked for Phase 11 deletion. **First consumer migrated:** [features/audio/services/audioFallbackUpload.ts](../../features/audio/services/audioFallbackUpload.ts) — audio-fallback transcription path. Now uploads via cloud-files REST, obtains signed URL, hands to Groq URL-based transcription API, hard-deletes on completion. All typecheck clean. INVENTORY updated.
- **2026-04-23** — Phases 9–11 complete. The Python team finished their side and deleted all legacy backend code, which meant Phase 10's "run side-by-side soak" was no longer possible — we compressed it into Phase 11 and flipped everything at once.

  **Consumer migrations (Phase 9).** `features/tasks/services/taskService.ts` now uploads attachments to `Task Attachments/{taskId}/` via `uploadFiles` (cloud-files UUID persisted in `file_path`; `getAttachmentUrl` is async; legacy public-URL rows still open via a regex fallback). `features/resource-manager/resource-picker/FilesResourcePicker.tsx` rewritten in place around `useCloudTree()` and cloud-files selectors — same `{onBack,onSelect}` surface, but `allowedBuckets` is now a top-level-folder filter and `selection.url` is a signed URL. `lib/code-files/objectStore.ts` now writes editor files to `Code/Editor/{fileId}.txt` via the server client; `s3_bucket` column repurposed as sentinel (`cloud-files` vs legacy `code-editor`) so old rows keep working. `app/api/agent-apps/generate-favicon/route.ts` uses `Api.Server.uploadAndShare()` to upload SVG bytes to `Agent Apps/{appId}/favicon.svg` and persist the share URL in `agent_apps.favicon_url` — the first canonical server-side cloud-files caller. `components/ui/file-upload/useFileUploadWithStorage.ts` was rewritten in place keeping its legacy public signature identical; internally it now routes uploads through cloud-files + share links, mapping legacy Supabase bucket names to folder paths (`mapLegacyBucket()`). That single in-place swap unblocked ~14 downstream feature consumers without needing to migrate them individually.

  **API-route migration (Phase C6).** `/api/images/upload` was migrated in place: same request/response contract, same Sharp resizing logic, but each variant now uploads via `ServerFiles.uploadAndShare` under `Images/<folder-or-Generated>/<uuid>/<suffix>.jpg` and returns permanent share URLs. Response `bucket` is now always `"cloud-files"`. `ImageAssetUploader`, `ShareCoverImagePicker`, `AssetUploader`, and the window-panel image uploader all keep working unchanged. `/api/podcasts/upload-assets` deleted — zero runtime callers (the video pipeline goes to Python directly via `useBackendApi`, the image pipeline delegates to `ImageAssetUploader`). `UploadAssetsResponse` copied inline into `features/podcasts/components/admin/AssetUploader.tsx`. The `/api/slack/upload*` routes were left alone — they're Slack integration endpoints that forward file URLs to Slack, not file-system routes.

  **Legacy deletion (Phase 11).** Removed from the repo:
  - Entire trees: `components/FileManager/`, `components/file-system/`, `components/DirectoryTree/`, `components/ui/file-preview/`, `app/(authenticated)/files/`, `app/(authenticated)/(admin-auth)/administration/system-files/`, `app/(authenticated)/(admin-auth)/administration/file-explorer/`, `features/window-panels/windows/files/`, `features/administration/file-explorer/`, `components/GlobalContextMenu/version-one/`, `lib/redux/fileSystem/`, `lib/redux/storage/`.
  - Individual files: `features/quick-actions/components/QuickFilesSheet.tsx`, `providers/FileSystemProvider.tsx`, `providers/packs/FilesPack.tsx`, `lib/redux/middleware/actionInterceptor.ts`, `utils/supabase/{StorageManager,bucket-manager,file-store}.ts`, `utils/file-operations/{FileSystemManager,FileTypeManager,StorageBase,urlRefreshUtils}.ts`, `app/api/podcasts/upload-assets/route.ts`, `features/files/compat/`.

  **Unwiring.** `app/Providers.tsx` no longer mounts `FileSystemProvider` or `FilePreviewProvider` (kept `<CloudFilesPickerHost />`). `lib/redux/rootReducer.ts` no longer combines `fileSystem` or `storage` slices. `lib/redux/store.ts` no longer concats `storageMiddleware`. `components/overlays/OverlayController.tsx` lost its `QuickFilesSheet` / `FilePreviewWindow` / `FileUploadWindow` dynamic imports and selectors. `features/window-panels/registry/windowRegistry.ts` removed the `quickFilesWindow`, `fileUploadWindow`, `filePreviewWindow`, and `quickFiles` sheet entries. `features/window-panels/tools-grid/toolsGridTiles.ts` points `tile.quick-files` and `tile.file-upload` at `cloudFilesWindow`. `features/window-panels/url-sync/initUrlHydration.ts` routes the `"files"` URL key to `cloudFilesWindow`. `components/admin/state-analyzer/stateViewerTabs.tsx` replaces the `fileSystem` / `storage` tabs with a single `cloudFiles` tab. `features/chat/components/input/PromptInputContainer.tsx` replaced `FileChipsWithPreview` with inline chip rendering. `features/quick-actions/components/UtilitiesOverlay.tsx` now links the Files tab to `/cloud-files`. Image-grid and resource-preview components (which previously used the old `FilePreviewSheet`) now open URLs in a new tab until an embedded `FilePreview` is wired through cloud-files signed URLs.

  **utils/file-operations/constants.ts** was trimmed rather than deleted: `BUCKET_DEFAULTS` and `getBucketDetails` removed; `MatrxIcon` references stubbed with locally-imported icons; `TwoColorPythonIcon` import redirected to `@/features/code/styles/custom-icons`. The remaining exports (`EnhancedFileDetails` type, `getFileDetailsByName`, `getFileDetailsByUrl`) are still used by non-file-system callers.

  **Result.** Zero `supabase.storage.*` calls remain in the app surface. Zero references to any deleted surface (`pnpm type-check` passes with only pre-existing unrelated errors). The compatibility shim (`features/files/compat/`) is gone because every caller now uses the main `features/files` barrel directly. With Phase 10's soak period folded in, the migration is done — `/cloud-files` is the only file UI, and cloud-files is the only file system. The outstanding work is Phase 12 (backend asks logged in PYTHON_TEAM_COMMS.md).
- **2026-04-24** — **Bug fix:** the cloud-files browser client was hardcoded to `BACKEND_URLS.production` and ignored the admin server-toggle in `apiConfigSlice`. Symptom: flipping the admin localhost toggle changed `useBackendApi` traffic but cloud-files uploads still went to prod, so dev users couldn't see anything hit the local Python server. [api/client.ts](api/client.ts) → `resolveBaseUrl()` now reads the active server via `selectResolvedBaseUrl(getStore().getState())` first, falls back to env vars only when the store isn't ready. Same selector `useBackendApi` uses, so the entire app routes consistently. Server-side `api/server-client.ts` is untouched — it has no store; logged as a low-priority follow-up in PYTHON_TEAM_COMMS.md to plumb a cookie-based active-server hint through `createServerContext`.

  **Diagnostic harness shipped** at [app/(ssr)/ssr/demos/cloud-files-debug/](../../app/(ssr)/ssr/demos/cloud-files-debug/). Single page that exposes the resolved backend URL, the active JWT, the user id, and an inline server-toggle (Production / Development / Staging / Localhost / GPU / Custom). Quick-test buttons fire `/health`, the `cld_get_user_file_tree` RPC, `/files`, `/files/upload`, `/files/{id}/url`, `/files/{id}/download`, and `DELETE /files/{id}` — each one logs full request/response (URL, headers, body, X-Request-Id, status, timing) into a reverse-chronological event log with expandable rows. Includes a raw-request tester (method + path + JSON body). Use this page anytime "uploads succeed but nothing hits the backend" — every fetch shows you exactly what was sent, where, and what came back.
- **2026-04-24** — **Critical UX fix:** clicking a file no longer traps the user. Before: `PageShell` replaced the entire main pane with `<FilePreview/>` whenever `activeFileId` was set, the URL didn't change, and there was no close button — so opening any file stranded the user in a dead-end view with no escape. After: the file table/grid ALWAYS renders, and the preview slides in as a third resizable panel on the right.

  New: [components/surfaces/PreviewPane.tsx](components/surfaces/PreviewPane.tsx) — wraps `<FilePreview/>` with a header bar carrying the file name, copy-share-link, download, **Open full view** (routes to `/cloud-files/f/{fileId}` so the URL changes and the browser back button works), and a Close (X) action that clears `activeFileId`. Handlers are dispatch-based (no parent prop drilling) so the pane works inside any host that mounts it.

  Updated: [components/surfaces/PageShell.tsx](components/surfaces/PageShell.tsx) follows the v4 react-resizable-panels API previously fixed in Phase 6 — `orientation`, `autoSave="matrx-cloud-files-dropbox-v4"`, stable `id` per panel (`cloud-files-side`, `cloud-files-main`, `cloud-files-preview`), `defaultSize`/`minSize`/`maxSize` via `pct()`. The preview panel mounts conditionally on `showPreviewPane = !!activeFile`, so closing it actually unmounts the panel rather than collapsing to width 0; autoSave still remembers the preferred width across mounts via the stable id. Main-pane `minSize` drops from 40% → 30% while the preview is open so the user can shrink the list more aggressively to give the preview room. The `f/[fileId]/page.tsx` route is unchanged but now produces a much better UX: it hydrates `activeFileId`, the preview pane auto-opens to the right, and the back button returns to the previous view as expected.
- **2026-04-24** — Polish pass on the cloud-files page after first round of user testing exposed four issues:

  **(1) Preview close hardened.** [components/surfaces/PreviewPane.tsx](components/surfaces/PreviewPane.tsx) now: (a) listens for `Esc` keydown at the window level so users can dismiss the preview without finding the X button (skips the handler when an input/textarea/contentEditable element has focus); (b) when the URL is `/cloud-files/f/{fileId}`, the close action also pushes back to `/cloud-files` so reload doesn't re-open the panel; (c) the close button got bumped to `h-8` with a visible "Close" label on `lg+` breakpoints — it's now obviously the escape hatch.

  **(2) Preview error boundary.** New [components/surfaces/PreviewErrorBoundary.tsx](components/surfaces/PreviewErrorBoundary.tsx) wraps `<FilePreview/>` inside `PreviewPane`. A previewer crash (e.g. PDF worker fetch failure) is contained to the pane — sidebar, list, header, and close button stay interactive. Recovery UI exposes Try again (resets via key prop, remounts subtree), Open in new tab (re-fetches a signed URL via `getSignedUrl` thunk), and Close preview. [components/core/FilePreview/previewers/PdfPreview.tsx](components/core/FilePreview/previewers/PdfPreview.tsx) also got its inline error UI upgraded — when react-pdf's `onLoadError` fires, the user now sees a card with an alert icon, the error message, and an Open-in-new-tab button using the signed URL we already have.

  **(3) "..." menu fixed.** [components/surfaces/dropbox/FileTableRow.tsx](components/surfaces/dropbox/FileTableRow.tsx) — the inner `IconButton` now uses `React.forwardRef` and spreads `{...rest}` onto the `<button>`. The "More" button is the trigger of `<DropdownMenuTrigger asChild>`; without ref-forwarding Radix can't anchor the popper, and without prop-spread Radix's injected `onClick` / `aria-*` / `data-state` were being silently dropped. Either hole was enough to make the menu fail intermittently. Also added `onClick={e.stopPropagation()}` + `onDoubleClick={e.stopPropagation()}` to the trigger so the row's `onDoubleClick={onActivate}` doesn't race the menu open.

  **(4) Bulk actions bar.** New [components/surfaces/dropbox/BulkActionsBar.tsx](components/surfaces/dropbox/BulkActionsBar.tsx) — a fixed-position pill at the bottom of the viewport, rendered inside `PageShell`, that appears whenever `selection.selectedIds.length > 0`. Actions: Download (fans out per-file via `getSignedUrl` + hidden-anchor click, concurrency 4), Move… (opens the existing `openFolderPicker` then fans out `moveFile` thunk calls), Delete (alert-dialog confirm, then fans out `deleteFile` soft-deletes), and Cancel (clears selection). Folder bulk operations aren't supported yet because the backend has no folder-bulk endpoints (logged in PYTHON_TEAM_COMMS.md) — selected folders are skipped with a transient warning chip. Concurrency uses a small `runWithConcurrency` helper local to the component (max 4 parallel; per-item failures are caught + logged so one failure doesn't abort the rest).

  **Verification:** `pnpm type-check` clean. PreviewPane exported from the surfaces barrel; BulkActionsBar exported from the dropbox-subtree barrel. No public API changes — `f/[fileId]/page.tsx` and every existing caller of `PageShell` work unchanged.
- **2026-04-24** — **Previewer fidelity restored.** User testing flagged that the new system's previewer surface had regressed vs. the legacy: CSVs and PDFs were showing `"Failed to fetch"` errors, and several formats had been silently downgraded to a `<pre>` text dump. A subagent audit compared `features/files/components/core/FilePreview/` to the legacy `.claude/worktrees/agent-a953cddf/components/ui/file-preview/` + `components/FileManager/FilePreview/` and produced a gap list.

  **Restored previewers (this round):**
  - [previewers/DataPreview.tsx](components/core/FilePreview/previewers/DataPreview.tsx) — full tabular previewer for CSV / TSV / JSON-array / XLSX / XLS. PapaParse for delimited; SheetJS dynamic-imported (~600KB chunk) for Excel. Sheet selector for multi-sheet workbooks, search box (live row filter), per-column sort with toggle direction, 25-row pagination, copy-as-JSON button. JSON files whose root isn't an array fall back to a pretty-printed JSON view with a Copy button. Errors render as the same alert-card pattern PdfPreview uses with an "Open in new tab" fallback that uses the still-valid signed URL.
  - [previewers/MarkdownPreview.tsx](components/core/FilePreview/previewers/MarkdownPreview.tsx) — react-markdown + remark-gfm + remark-math + rehype-katex + rehype-prism-plus. Same alert-card error UX. Both new previewers are loaded via `next/dynamic` so they only ship to the browser when actually opened.

  **Routing:** [icon-map.ts](utils/icon-map.ts) `PreviewKind` type extended with `markdown`; `md`/`mdx` extension overrides now set `previewKind: "markdown"`. [preview-capabilities.ts](utils/preview-capabilities.ts) accepts `markdown` and `spreadsheet` as previewable. [FilePreview.tsx](components/core/FilePreview/FilePreview.tsx) switch:
  - `markdown` → `<MarkdownPreview/>`
  - `data` + `spreadsheet` → `<DataPreview/>` (replaces the previous `<TextPreview/>` for `data` and the `<GenericPreview/>` fallthrough for `spreadsheet`)
  - `code` + `text` → `<TextPreview/>` (unchanged)

  **Other fixes in the same pass:**
  - [TextPreview.tsx](components/core/FilePreview/previewers/TextPreview.tsx) error UI rewritten. The previous "Preview failed: Failed to fetch" was correctly called out by the user as misleading — it conflated network failure ("can't reach") with capability failure ("can't render"). New copy distinguishes the two: network-like errors say "Couldn't reach this file" and explain the likely causes (expired signed URL, backend unreachable, CORS); other errors say "Couldn't read this file" and surface the raw error. Both states show an "Open in new tab" button.
  - [PreviewPane.tsx](components/surfaces/PreviewPane.tsx) close button reverted to a clean icon button (no text). The previous variant with a text label was colliding visually with the page header's user-avatar dropdown — the panel header is the wrong place for prominent text controls. Esc shortcut + bigger hit area kept; Close still routes back to `/cloud-files` when on `/cloud-files/f/{fileId}`.

  **Remaining gaps logged for follow-up (not shipped this round):**
  - Code-file syntax highlighting (TextPreview for `code` kind currently renders `<pre>` only — `react-syntax-highlighter` is installed but not yet wired).
  - Rich AudioPreview (waveform / skip / loop) — the legacy version had it; new version uses the bare `<audio controls/>` HTML element.
  - PDF blob-prefetch (legacy used `fetchWithUrlRefresh` to pre-fetch the PDF as a blob, sidestepping CORS issues with react-pdf's direct URL fetch).

  **Verification:** A second subagent traced every routing path (CSV/TSV/JSON-array/JSON-non-array/XLSX/XLS/MD/MDX) end-to-end and confirmed all 10 pass. `PreviewKind` type, capability flags, dynamic-import boundaries, and the alert-card error fallback all behave as intended. `pnpm type-check` clean.

  **Other regressions discovered by the verification audit** (not shipped this round — logged for prioritization):
  1. **Drag-and-drop missing from the desktop surface.** `PageShell` mounts `FileTable`/`FileGrid` from the `dropbox/` subtree, neither of which has any dnd-kit usage. The plumbing already exists in `core/FileList/FileList.tsx` (DndContext wired to the `moveFile` thunk) but it's not used by the active surface. Users can currently move files only via the "Move…" context-menu item or the BulkActionsBar.
  2. **No file-versions UI.** `Files.listVersions` and the `restoreVersion` thunk exist; no component calls them. Legacy surfaced versions in the FileDetailsPanel.
  3. **No "File Info" dialog.** Size, mime-type, dates, storage path, etc. — entirely missing from the new context menu. Legacy [components/file-system/context-menu/FileContextMenu.tsx (worktree)] had a full Info modal at L750-959.
  4. **No Duplicate action.** Legacy menu had `Duplicate` (`_copy` suffix). Zero matches in the new surface.
  5. **Tree-wide search missing.** `TopBar` search feeds `searchQuery` into `buildRows`, which only filters the **current-folder** rows already passed in by `PageShell`. A user in folder A can't find a file in folder B via the search box — silent confusion.
  6. **Keyboard shortcuts missing from the context menu.** Legacy showed `⌘D` / `F2` / `⌘I` / `⌘L` / `⌘S` / `Enter` / `Space` / `⌫` labels via `DropdownMenuShortcut`. New menu has none and no global key handlers dispatch the actions.
  7. **Multi-select context menu doesn't batch.** Legacy `FileContextMenu` accepted `selectedNodes` and operated on all of them. New menu only takes a single `fileId`.
  8. **Starred is a stub** (`<EmptyState comingSoon />`); parity with legacy, but in scope for the migration.
  9. **No dedicated Recents section.** Filter chip exists but no route/sidebar entry for it.

  These are tracked as Phase 12+ follow-ups; ordering will be driven by user feedback.
- **2026-04-24** — Closed four of the highest-priority gaps from the verification audit:

  **(1) Tree-wide search.** [PageShell.tsx](components/surfaces/PageShell.tsx) now flips its row-source set when `searchQuery.trim() !== ""`: instead of just the current folder's children, it feeds `FileTable`/`FileGrid` the entire `selectAllFilesArray`/`selectAllFoldersArray` (minus deletes) so a user typing in the TopBar search box matches across the whole tree. New `treeWideSearch?: boolean` prop on FileTable + FileGrid drives a banner above the rows ("Showing N results from all folders for X") and a per-row breadcrumb subtitle ("in Images / Chat") via a new `parentPath` prop on `FileTableRow` + `FileGridCell`. Folder-path resolution is a small inline helper (depth-capped) using `selectAllFoldersMap` — no new selector required. Empty-search UX gets its own state ("No matches for X — tried searching across all folders"). Fixes the silently-misleading regression flagged in the previous audit.

  **(2) Drag-and-drop in the desktop surface.** Ports the existing `core/FileList` dnd-kit pattern into `dropbox/FileTable` + `FileTableRow` + `FileGrid` + `FileGridCell`. PointerSensor with `activationConstraint: { distance: 6 }` keeps single-click selection clean — drag only kicks in after 6px of movement. File rows/cells use `useDraggable`; folder rows/cells use `useDroppable`. `isOver` highlights the drop target with `bg-primary/10 ring-1 ring-inset ring-primary` (rows) or `ring-2 ring-primary bg-primary/5` (cells). `isDragging` adds `opacity-50` to the dragged source. `onDragEnd` lives on the FileTable / FileGrid wrapper and dispatches `moveFile` directly. Folder-folder moves intentionally skipped — the backend has no `moveFolder` thunk yet (logged Phase 12).

  **(3) File Info dialog.** New [components/core/FileInfo/FileInfoDialog.tsx](components/core/FileInfo/FileInfoDialog.tsx) — read-only modal showing size (formatted), mime-type, visibility chip with tone-coded icon, parent folder breadcrumb (resolved via the same depth-capped lookup as search), created/modified dates (locale-formatted), file path, and file id. The path + id fields use a small `CopyableMono` sub-component with a per-field copy button + transient "Copied" state — devs paste the id straight into Redux DevTools or API calls. Triggered from the new "File info" item in [FileContextMenu](components/core/FileContextMenu/FileContextMenu.tsx) (also added a "Show versions" item that emits a `cloud-files:open-preview-tab` CustomEvent the PreviewPane listens for).

  **(4) File Versions tab.** [components/surfaces/PreviewPane.tsx](components/surfaces/PreviewPane.tsx) now has a tab strip below the action header (Preview / Versions). Tab state is local to the component and resets when the user picks a different file (each fileId gets its own remount). The Versions tab renders new [components/core/FileVersions/FileVersionsList.tsx](components/core/FileVersions/FileVersionsList.tsx) — calls `loadFileVersions` thunk on mount, lists versions newest-first with version number, locale-formatted date, formatted size, short checksum, optional change-summary, "Current" badge on the latest, and a Restore button per non-current version. Restore uses an alert-dialog confirm and the existing `restoreVersion` thunk (which server-side creates a new top version pointing at the chosen version's storage URI — nothing is destroyed). The "Show versions" context-menu item from (3) opens this tab directly via the CustomEvent bus.

  **Verification:** `pnpm type-check` clean across `features/files/**`. Zero new files outside the established folder layout (`components/core/{FileInfo,FileVersions}/` follow the same pattern as `FileIcon`, `FileMeta`, etc.). No public API surface changes — `f/[fileId]/page.tsx`, `PageShell` props, and every existing caller still compile unchanged.
- **2026-04-24** — Closed six more regression items from the audit, end-to-end pass per the user's "go all the way through" directive:

  **(1) Code syntax highlighting.** New [components/core/FilePreview/previewers/CodePreview.tsx](components/core/FilePreview/previewers/CodePreview.tsx) — Prism via `react-syntax-highlighter`, ext-to-language map covering JS/TS/Python/Ruby/Go/Rust/Java/Kotlin/Swift/C/C++/C#/PHP/Scala/HTML/CSS/SCSS/LESS/JSON/YAML/TOML/INI/Bash/PowerShell/SQL/GraphQL/Protobuf/Docker/Makefile/Lua/R + filename-based fallbacks (`Dockerfile`, `Makefile`). Theme detection uses a tiny `useIsDark` hook that subscribes to `<html>` class via `MutationObserver` + `useSyncExternalStore` — matches the project's existing theme-reading pattern (no `next-themes` dep). Routed in `FilePreview.tsx`: `code` kind → `<CodePreview/>`, `text` stays on `<TextPreview/>`. Dynamic-imported, so the ~150KB highlighter only ships when a code file is opened.

  **(2) Recents section.** New route [app/(a)/cloud-files/recents/page.tsx](../../app/(a)/cloud-files/recents/page.tsx); new `recents` value in `CloudFilesSection` type and `PRIMARY_SECTIONS` nav array. PageShell auto-applies a synthetic `effectiveFilter = filter ?? (section === "recents" ? "recents" : null)` so users see the most-recent files immediately without clicking the chip. Folders hidden in this view (recently-changed folders rarely match user intent). [row-data.ts](components/surfaces/dropbox/row-data.ts) caps the recents output at 100 rows so a tree of thousands doesn't render in one page.

  **(3) Rich AudioPreview.** [components/core/FilePreview/previewers/AudioPreview.tsx](components/core/FilePreview/previewers/AudioPreview.tsx) rewritten — bare `<audio controls>` replaced by a custom UI driven by a hidden `<audio>` element: scrubable timeline (pointer down/move/up with `setPointerCapture`), buffered-bar overlay, scrub-suspend on `timeupdate` so the thumb tracks cleanly, ±10s skip buttons with the seconds badge, mute/unmute + volume slider, playback-rate dropdown (0.5×/0.75×/1×/1.25×/1.5×/2×), loop toggle, current/total timestamps. Errors render inline (`Couldn't load`). No waveform — wavesurfer isn't installed; legacy "waveform" was a CSS bar fake anyway.

  **(4) Multi-select batch context menu.** [components/core/FileContextMenu/FileContextMenu.tsx](components/core/FileContextMenu/FileContextMenu.tsx) detects `selection.selectedIds.length > 1 && includes(fileId)` and pivots to a batch menu (Download N / Move N… / Delete N). Operations fan out via a local `runBatch` helper with concurrency 4 — same posture as `BulkActionsBar` so file-level error isolation matches. Single-file menu is unchanged when the right-clicked row isn't part of the multi-selection. Folders in the selection are filtered out (no folder-batch endpoint yet, logged Phase 12).

  **(5) Keyboard shortcut hints.** Added `<DropdownMenuShortcut>` labels on Copy link (⌘L), Rename (F2), Duplicate (⌘D), File info (⌘I), Delete (⌫). Mac-vs-Ctrl detected via `navigator.platform`. Shortcut hints are visual-only this round — global key handlers race with browser/app shortcuts and need careful focus-scoping; the labels still serve as a discovery affordance.

  **(6) Duplicate action (client-side).** New menu item Duplicate (⌘D). Backend has no `copyFile` endpoint (Phase 12 ask), so the implementation is client-side: get a 10-minute signed URL → fetch as blob → `new File(blob, "name (copy).ext", {type: mime})` → re-upload via `uploadFiles` thunk under the original's parent folder + visibility. The `(copy)` suffix is inserted before the extension so the duplicate sorts adjacent to the original.

  **Verification:** `pnpm type-check` clean across `features/files/**` and `app/(a)/cloud-files/**`. No public API surface changes. Pre-existing unrelated errors in `features/cx-dashboard`, `features/prompt-actions`, `features/tts`, `lib/deepgram`, `lib/redux/shadow` are unchanged from the prior baseline.

  **Remaining audit items (not in scope this round):**
  - Global keyboard handlers — labels are visual-only; binding ⌘L / ⌘D / ⌫ globally needs proper focus-scoping work
  - Server-side dev backend override — `Api.Server` route handlers ignore the admin server-toggle (logged in PYTHON_TEAM_COMMS as a low-priority FE follow-up)
  - Starred — needs backend `cld_starred_files` schema (logged Phase 12)
  - Folder-bulk endpoints — needs backend `DELETE /folders/bulk`, `POST /folders/bulk/move` (logged Phase 12)
- **2026-04-24** — Final pass before handoff.

  **(1) Global keyboard handlers** with strict focus-scoping. New [components/surfaces/useFileShortcuts.ts](components/surfaces/useFileShortcuts.ts) — single `keydown` listener at the window level that fires only when (a) no input/textarea/contentEditable is focused, (b) no dialog/alertdialog is open, (c) `e.isComposing` is false. Bindings: ⌘L/Ctrl+L copy share link, ⌘D/Ctrl+D duplicate (client-side fetch + re-upload), Backspace/Delete soft-delete with confirm. Multi-selection wins over single — Backspace with 3 files selected fires a batch-delete confirm. The hook returns a `pendingDelete` state which `PageShell` renders an `<AlertDialog/>` against — destructive shortcuts always go through a confirm so an accidental Backspace doesn't silently trash files.

  **(2) Drag-from-table to NavSidebar.** Hoisted DndContext from `FileTable` + `FileGrid` up to `PageShell` so a single context owns table rows, grid cells, AND sidebar folders as drop targets. Removed the per-component DndContext wrappers; rows/cells still register draggables/droppables but they bind to the parent context. `NavSidebarFlatFolders` got a new `DroppableSidebarFolder` + `DroppableNestedFolder` wrapper that uses `useDroppable` and applies a `bg-primary/10 ring-1 ring-inset ring-primary` highlight on `isOver`. Files dragged from the table or grid can now be dropped onto any sidebar folder (root or nested) in addition to the visible folder rows in the main pane.

  **(3) Handoff doc.** New top-level [HANDOFF.md](HANDOFF.md) — consolidated list of items needing user / Python-team / FE-team involvement, broken into "what blocks on whom" with file paths and schema sketches where relevant. The user can scan the doc, send the Python-team section to the backend team, and follow the QA checklist in the user section to verify everything end-to-end. Frontend follow-ups (server-side dev override, PDF blob-prefetch, mobile-specific surfaces) are listed at the bottom for future planning.

  **Verification:** `pnpm type-check` clean across `features/files/**` and `app/(a)/cloud-files/**`. Same pre-existing unrelated errors in `features/cx-dashboard`, `features/prompt-actions`, `features/tts`, `lib/deepgram`, `lib/redux/shadow` — untouched baseline.

- **2026-04-25** — Removed reliance on the root `features/files/index.ts` barrel for cross-package imports: consumers now point at `types`, `api` (namespace), `redux/thunks`, `redux/selectors`, `hooks/useCloudTree`, `utils/folder-conventions`, and specific `components/` + `providers/` modules. The index file remains as a compatibility re-export but should not be used for new code.
- **2026-04-26** — Phase 11 closeout: previewer S3-CORS workaround, "Home" rename, and full wiring of the Python team's P-6/P-7 + guest-auth contracts.

  **(1) Previewer chain bypasses S3 CORS.** New [hooks/useFileBlob.ts](hooks/useFileBlob.ts) fetches file bytes through the Python `GET /files/{id}/download` endpoint (which already has correct CORS) and returns a same-origin `blob:` URL with auto-revoke on unmount/fileId change. Refactored every fetch-based previewer — [PdfPreview](components/core/FilePreview/previewers/PdfPreview.tsx), [MarkdownPreview](components/core/FilePreview/previewers/MarkdownPreview.tsx), [CodePreview](components/core/FilePreview/previewers/CodePreview.tsx), [TextPreview](components/core/FilePreview/previewers/TextPreview.tsx), [DataPreview](components/core/FilePreview/previewers/DataPreview.tsx) — to take `fileId` and call `useFileBlob(fileId)`. [FilePreview.tsx](components/core/FilePreview/FilePreview.tsx)'s switch passes `fileId` to all five. Symptom this fixes: CSV/PDF/TXT preview was failing with HTTP 403 Forbidden from `fetch(signedUrl)` because the S3 bucket policy doesn't allow our origin in CORS, even though the same URL works for `<img>`/`<video>`/`<audio>`/anchor navigation. Bucket-side fix logged as P-8 in [ARCHITECTURE_FLAWS.md](ARCHITECTURE_FLAWS.md) and [PYTHON_TEAM_COMMS.md](PYTHON_TEAM_COMMS.md).

  **(2) "All files" → "Home".** The section was misleadingly labeled "All files" but actually shows root-level items only — files deeper in the tree appear under Recents / Starred / dedicated folders. Renamed in [ContentHeader.tsx](components/surfaces/dropbox/ContentHeader.tsx) `SECTION_TITLES` and the `PRIMARY_SECTIONS` nav array in [section.ts](components/surfaces/dropbox/section.ts). The IconRail tooltip already said "Home" — labels are now consistent across all surfaces.

  **(3) Guest fingerprint header plumbed through `client.ts`.** [api/client.ts](api/client.ts) `buildHeaders()` now reads both an optional Supabase JWT (`getAccessTokenOrNull()`) and the cached fingerprint (`getCachedFingerprint()`); attaches `Authorization: Bearer <jwt>` for authed users and `X-Guest-Fingerprint: <fp>` whenever a fingerprint is available (so authed users still send it for backend correlation). Throws `auth_required` only when both are missing. `RequestOptions` gained `guestFingerprint?: string` for the migrate-guest endpoint, which needs to send the OLD fingerprint even though the request is authed. `uploadWithProgress` updated to match.

  **(4) Folder CRUD wired to REST.** Replaced supabase-js writes in `createFolder` and `deleteFolder` thunks with `POST /folders` and `DELETE /folders/{id}` calls. New [redux/thunks.ts](redux/thunks.ts) `updateFolder` thunk for rename / move / visibility / metadata via `PATCH /folders/{id}` with optimistic apply + rollback. New API client functions in [api/folders.ts](api/folders.ts): `createFolder`, `patchFolder`, `deleteFolder`, `bulkMoveFolders`. The browser no longer writes to `cld_folders` for these flows. `ensureFolderPath` is intentionally retained for the rare "explicit-create-without-upload" case until `POST /folders` confirms path-style support (logged in PYTHON_TEAM_COMMS).

  **(5) Bulk operations.** New thunks `bulkDeleteFiles`, `bulkMoveFiles`, `bulkMoveFolders` go through the new Python bulk endpoints in one round-trip with optimistic local updates and per-item rollback when the backend reports partial failures (`{ succeeded[], failed[{id, code, message}] }` envelope). New API functions in [api/files.ts](api/files.ts): `bulkDeleteFiles`, `bulkMoveFiles`. New `delJson` helper in [api/client.ts](api/client.ts) — DELETE with a JSON body, since `DELETE /files/bulk` takes `{ file_ids[] }`.

  **(6) Guest → user migration thunk.** New `migrateGuestToUser({ guestFingerprint, dryRun? })` calls `POST /files/migrate-guest-to-user` with the OLD fingerprint in both the body and `X-Guest-Fingerprint` header. After the call returns, callers should re-load the tree so the previously-guest-owned items appear. New API function `Files.migrateGuestToUser`. New types: `MigrateGuestToUserRequest`, `MigrateGuestToUserResponse`, `MigrateGuestToUserArg`. Ready to wire into a post-signup flow.

  **(7) Type additions.** [types.ts](types.ts) gained `CreateFolderRequest`, `FolderPatchRequest`, `BulkDeleteFilesRequest`, `BulkMoveFilesRequest`, `BulkMoveFoldersRequest`, `BulkOperationFailure`, `BulkOperationResponse`, `MigrateGuestToUserRequest`, `MigrateGuestToUserResponse`, plus camelCase thunk-arg variants `BulkDeleteFilesArg`, `BulkMoveFilesArg`, `BulkMoveFoldersArg`, `UpdateFolderArg`, `MigrateGuestToUserArg`. `RequestKind` extended with `folder-create` / `folder-update` / `folder-delete` / `bulk-delete-files` / `bulk-move-files` / `bulk-move-folders` / `migrate-guest`.

  **Verification:** `pnpm tsc --noEmit -p tsconfig.json` clean under `features/files/**` (zero errors). Pre-existing unrelated baseline elsewhere unchanged.
