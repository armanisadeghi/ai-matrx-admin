# Cloud Files — Feature Architecture

**Status:** 🚧 Phase 0 (foundation docs only). No runtime code yet.
**Owner:** Files migration team.
**Last updated:** 2026-04-23.

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
- [ ] Phase 5 — Routes
- [ ] Phase 6 — WindowPanel integration
- [ ] Phase 7 — Hooks + pickers
- [ ] Phase 8 — First consumer migration
- [ ] Phase 9 — Progressive consumer migration
- [ ] Phase 10 — Validation soak
- [ ] Phase 11 — Legacy deletion
- [ ] Phase 12 — Backend optimization follow-ups

---

## Change log

- **2026-04-23** — Phase 0 kickoff. Created FEATURE.md, SKILL.md, PYTHON_TEAM_COMMS.md, migration/ scaffold. No runtime code yet.
- **2026-04-23** — Phase 1 complete. Shipped [types.ts](types.ts) (domain, DB row, API, runtime, tree, upload, error types) and [api/](api/) (client.ts with JWT + X-Request-Id + multipart + XHR progress + public endpoints; files.ts, folders.ts, versions.ts, permissions.ts, share-links.ts, groups.ts). All typecheck clean. Logged two new items in PYTHON_TEAM_COMMS.md: table-naming discrepancy (`cloud_share_links` vs `cloud_file_share_links`, `cloud_user_groups` vs `cloud_file_groups`) and `cloud_get_user_file_tree` return shape.
- **2026-04-23** — Phase 2 complete. Shipped Redux backbone: [redux/slice.ts](redux/slice.ts) (normalized filesById/foldersById + tree spine + selection + ui + uploads + realtime state; FieldFlags + optimistic/rollback pattern), [redux/converters.ts](redux/converters.ts) (DB row → domain, tolerant tree RPC parser), [redux/tree-utils.ts](redux/tree-utils.ts) (ancestry, sorting, search, tree builder), [redux/selectors.ts](redux/selectors.ts) (memoized read paths + imperative getters), [redux/thunks.ts](redux/thunks.ts) (loadUserFileTree/reconcileTree/loadFolderContents/loadFileVersions/loadPermissions/loadShareLinks + optimistic upload/rename/move/updateMetadata/delete/restoreVersion/grant/revoke/share-link thunks), [redux/request-ledger.ts](redux/request-ledger.ts) (X-Request-Id correlation with 30s TTL + 2s fuzzy fallback), [redux/realtime-middleware.ts](redux/realtime-middleware.ts) (supabase Realtime subscription with per-row echo dedup + reconcile-on-reconnect), and [providers/CloudFilesRealtimeProvider.tsx](providers/CloudFilesRealtimeProvider.tsx). Wired `cloudFiles` reducer into [lib/redux/rootReducer.ts](../../lib/redux/rootReducer.ts) and middleware into [lib/redux/store.ts](../../lib/redux/store.ts). All typecheck clean under features/files (pre-existing errors in unrelated admin pages are unchanged).
- **2026-04-23** — Phase 3 complete. Shipped core components + utilities + hooks. Utils: [utils/path.ts](utils/path.ts), [utils/format.ts](utils/format.ts), [utils/mime.ts](utils/mime.ts), [utils/icon-map.ts](utils/icon-map.ts) (duplicated + curated from legacy constants), [utils/preview-capabilities.ts](utils/preview-capabilities.ts). Hooks: [hooks/useSignedUrl.ts](hooks/useSignedUrl.ts) (expiry-aware auto-refresh), [hooks/useFileNode.ts](hooks/useFileNode.ts), [hooks/useFolderContents.ts](hooks/useFolderContents.ts), [hooks/useFileSelection.ts](hooks/useFileSelection.ts) (shift-click range), [hooks/useFileUpload.ts](hooks/useFileUpload.ts), [hooks/useCloudTree.ts](hooks/useCloudTree.ts). Core components: [FileIcon](components/core/FileIcon/), [FileMeta](components/core/FileMeta/), [FileBreadcrumbs](components/core/FileBreadcrumbs/), [FileActions](components/core/FileActions/) (headless useFileActions), [FileContextMenu](components/core/FileContextMenu/) (with delete confirm), [FileTree](components/core/FileTree/) (VS Code-style, virtualized via @tanstack/react-virtual, keyboard-navigable ↑/↓/←/→/Enter, dnd-kit moves), [FileList](components/core/FileList/) (list + grid views with content-visibility, sortable columns, dnd moves), [FileUploadDropzone](components/core/FileUploadDropzone/) (react-dropzone + clipboard paste + live UploadProgressList), [FilePreview](components/core/FilePreview/) (registry + Image/Video/Audio/Text/Generic previewers; PDF lazy-loaded via next/dynamic per `bundle-dynamic-imports`), [ShareLinkDialog](components/core/ShareLinkDialog/), [PermissionsDialog](components/core/PermissionsDialog/). All dialogs export a `*Body` variant for mobile Drawer reuse in Phase 4. Applied react-best-practices: memoized row components, `next/dynamic` for heavy PDF bundle, functional setState, derived state in render (no effects for derivations), content-visibility for grid view. Typecheck clean under features/files.
- **2026-04-23** — Phase 4 complete. Shipped surface wrappers: [surfaces/PageShell.tsx](components/surfaces/PageShell.tsx) (Next.js route host — resizable sidebar + breadcrumbs + view-mode toggle + FileList/FilePreview; auto-delegates to MobileStack on mobile via `useIsMobile()`), [surfaces/WindowPanelShell.tsx](components/surfaces/WindowPanelShell.tsx) (sidebar + tabs: Browse / Recent / Shared / Trash; content forceMount-free via `data-[state=inactive]:hidden`), [surfaces/MobileStack.tsx](components/surfaces/MobileStack.tsx) (iOS hierarchical push-nav with CSS-transform slide; 44pt touch targets; `dvh` + `pb-safe`; swipe-back via popstate; floating upload FAB), [surfaces/EmbeddedShell.tsx](components/surfaces/EmbeddedShell.tsx) (inline — folder / owner / custom scopes; isolated selection state so it doesn't hijack global activeFileId), [surfaces/PickerShell.tsx](components/surfaces/PickerShell.tsx) exporting `DialogShell` (desktop) + `DrawerShell` (mobile) + adaptive `PickerShell` that picks between them. All surfaces obey the `useIsMobile()` → Dialog↔Drawer rule. Typecheck clean. Ready for Phase 5 routes.
