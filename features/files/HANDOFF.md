# Cloud Files — Handoff Items

> Live ledger of items that **require involvement from the user, the Python
> team, or another team** to close out. Updated 2026-04-24.
>
> Pure FE follow-ups (which I can do without external help) are tracked in
> [migration/INVENTORY.md](migration/INVENTORY.md) and the change log inside
> [FEATURE.md](FEATURE.md). This doc is only for items that block on
> someone else.

---

## Quick triage

| Owner | Items |
|---|---|
| **You (admin / user)** | 4 items — env vars, Supabase migration, FE follow-up decisions |
| **Python team** | 7 items — backend endpoints, RLS, CORS, schema |
| **Frontend team (later)** | 3 items — surfaces with no current consumers |

Each item below is independently actionable. Where useful, I included the
exact file paths or schema columns so the receiving team has zero
ambiguity.

---

## ⚠️ For YOU — admin / user follow-ups

### 1. Verify CORS on the Python `/health` and `/files/*` endpoints

**Why:** The cloud-files diagnostic page at `/ssr/demos/cloud-files-debug`
fires browser-side requests directly to the Python server. If CORS isn't
configured for our origin (localhost:3000 in dev, deployed origins in
prod), every test row shows a confusing `"Network error: Failed to fetch"`
even when the server is up.

**What to check:**

1. With the admin server-toggle set to **Localhost**, hit the diagnostic
   page and click `GET /health`. If it shows a network error in dev tools
   with no HTTP status, CORS is the most likely cause.
2. Confirm with the Python team that the FastAPI CORS middleware allows:
   - `Origin: http://localhost:3000` (dev)
   - Your prod origins
   - Headers: `Authorization`, `Content-Type`, `X-Request-Id`
   - Methods: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`

**File:** `features/files/PYTHON_TEAM_COMMS.md` — already logged 2026-04-24.

---

### 2. Confirm Supabase realtime publishes `cld_share_links`

**Why:** The cloud-files realtime middleware subscribes to share-link
inserts/deletes so the UI updates when the owner creates or revokes a
link from another device. If the table isn't in the realtime publication,
the UI silently goes stale and re-fetches only on focus.

**What to do:** in the Supabase SQL editor, run:

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename LIKE 'cld_%';
```

Expected to include: `cld_files`, `cld_folders`, `cld_file_versions`,
`cld_file_permissions`, `cld_share_links`. If any are missing, add them:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.cld_share_links;
```

**File:** `features/files/PYTHON_TEAM_COMMS.md` § 2026-04-23 Q.

---

### 3. Decide on backend env vars for prod

**Why:** The cloud-files browser client now reads from the Redux
`apiConfigSlice.activeServer`, which itself reads
`NEXT_PUBLIC_BACKEND_URL_PROD` / `NEXT_PUBLIC_BACKEND_URL_DEV` /
`NEXT_PUBLIC_BACKEND_URL_LOCAL`. Confirm these are set in:

- `.env.local` (dev) — at minimum `NEXT_PUBLIC_BACKEND_URL_LOCAL` (or it
  falls back to `http://localhost:8000`).
- Vercel project env (prod) — `NEXT_PUBLIC_BACKEND_URL_PROD` must be set
  for production users.

`features/files/api/server-client.ts` (used by route handlers) currently
reads `BACKEND_URLS.production`/`NEXT_PUBLIC_BACKEND_URL_PROD` only —
server-side calls always go to prod. See item §FE-1 below for the cookie
plumbing that would let server-side respect the admin toggle.

---

### 4. Test the new UI end-to-end

The previous round shipped the high-priority gaps. You said you wanted a
test page; the diagnostic harness at `/ssr/demos/cloud-files-debug` is
intentionally **separate** from the main `/cloud-files` route — it bypasses
Redux, fires raw fetches, and shows the request body / response / timing.
Use it whenever a real-system bug is unclear.

The main UI to QA:

| Surface | URL | What to test |
|---|---|---|
| Main shell | `/cloud-files` | Sidebar tree, file table, file grid |
| Recents | `/cloud-files/recents` | Top 100 most-recent files |
| Photos | `/cloud-files/photos` | Image-only filter |
| Shared | `/cloud-files/shared` | Files with permissions or non-private visibility |
| Trash | `/cloud-files/trash` | Soft-deleted files |
| File detail | `/cloud-files/f/{fileId}` | Direct preview-pane open |
| Public share | `/share/{token}` | Unauth share view |
| Diagnostic | `/ssr/demos/cloud-files-debug` | Per-endpoint test harness |

**Behaviors to QA in the main shell:**

- Click a file → preview panel slides in on the right (X dismisses, Esc dismisses, "Open" routes to `/cloud-files/f/{id}`)
- Right-click a file → context menu with shortcuts (⌘L copy link, F2 rename, ⌘D duplicate, ⌘I file info, ⌫ delete)
- ⌫ when a file is selected and no input is focused → confirms then deletes
- ⌘L when a file is selected → copies link silently
- ⌘D when a file is selected → duplicates client-side (`name (copy).ext`)
- Multi-select 2+ files → BulkActionsBar appears at bottom (Download / Move / Delete / Cancel)
- Right-click a file that's part of multi-selection → batch context menu
- Drag a file row onto a folder row → moves
- Drag a file row onto a sidebar folder → moves
- Search box → tree-wide results with breadcrumb subtitles, clear "No matches" state
- Open a `.csv` / `.xlsx` → tabular DataPreview (sort, search, sheets, pagination)
- Open a `.md` → MarkdownPreview (GFM tables, math, code highlighting)
- Open a `.py` / `.ts` → CodePreview with syntax highlighting + copy button
- Open an `.mp3` → rich AudioPreview (scrub, ±10s, volume, speed, loop)
- Click "Versions" tab in the preview pane → list with restore confirmation
- Click "File info" in the menu → modal with size/mime/visibility/path/id, copyable

---

## ⚠️ For the PYTHON TEAM — backend follow-ups

All items live in [PYTHON_TEAM_COMMS.md](PYTHON_TEAM_COMMS.md) with full
context. Quick summary of what's blocking what:

### 1. CORS on `/health` and `/files/*` (high)

See item §1 above. Without this, the diagnostic page reports false
networking errors.

### 2. Confirm `cld_get_user_file_tree` RPC return shape (high)

We need the row shape (TS-typed). Currently we use a tolerant reader in
`features/files/redux/converters.ts`. A typed return shape would let us
remove the `as unknown as` casts.

### 3. Folder rows in the tree RPC (high)

Either:
- Have `cld_get_user_file_tree` return folder rows tagged with
  `node_type: 'folder' | 'file'`, OR
- Add a companion `cld_get_user_folder_tree(p_user_id)` RPC.

Currently we paginate folders separately on first load.

### 4. Realtime publishes `cld_share_links` (medium)

See user item §2.

### 5. Thread `X-Request-Id` into realtime payloads (high)

Our optimistic UI dedup model relies on the realtime echo carrying the
same `request_id` we sent on the originating mutation, so the middleware
can ignore echoes of our own writes. Either as a column on the changed
row or inside `metadata.request_id`.

**Without this:** we fall back to timestamp-fuzzy dedup (2s window) which
is brittle under clock skew or parallel edits from the same user on two
devices.

### 6. Folder CRUD endpoints (medium)

`POST /folders`, `PATCH /folders/:id`, `DELETE /folders/:id`. Currently we
write directly to `cld_folders` via supabase-js (RLS-protected) — works
but bypasses any server-side validation. Our thunks
(`createFolder`/`deleteFolder`/`ensureFolderPath`) are already structured
so only their internals change when the REST endpoints exist.

### 7. Bulk operations (medium)

- `DELETE /files/bulk` body `{ file_ids: string[], hard_delete?: boolean }`
- `POST /files/bulk/move` body `{ file_ids: string[], new_parent_folder_id: string | null }`
- `POST /folders/bulk/move` likewise

The BulkActionsBar + multi-select context menu currently fan-out per-file
calls (concurrency 4). Folder bulk-ops are skipped entirely because
there's no per-folder thunk yet (they're hidden from the bulk menu).

### 8. Chunked / resumable uploads >100MB (medium)

Current cap is 100MB (413 beyond). Use cases: podcast video files,
training video captures, multi-GB datasets. TUS or S3 multipart init+complete
endpoints either work.

### 9. Per-endpoint rate limits + concurrent-upload ceilings (low)

Our concurrency-3 default is conservative. We'd like to know the real
ceiling so we can tune up if there's headroom.

### 10. Schema for "Starred" + "File requests" + "Activity" (low)

Three sections in the sidebar render `<EmptyState comingSoon />` because
their backing tables don't exist yet. Schema sketches:

```sql
-- "Starred" — per-user pinned items
CREATE TABLE cld_starred_files (
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE,
  file_id   uuid REFERENCES cld_files  ON DELETE CASCADE,
  starred_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, file_id)
);

-- "File requests" — collect-files-from-anyone links
CREATE TABLE cld_file_requests (
  id           uuid PRIMARY KEY,
  owner_id     uuid REFERENCES auth.users,
  target_folder_id uuid REFERENCES cld_folders,
  title        text,
  description  text,
  is_active    boolean,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz,
  ...
);

-- "Activity" — append-only feed
CREATE TABLE cld_file_activity (
  id          uuid PRIMARY KEY,
  user_id     uuid,
  file_id     uuid,
  folder_id   uuid,
  kind        text,  -- 'upload' | 'rename' | 'move' | 'share' | 'delete' | 'restore'
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);
```

These are nice-to-have; the FE stubs are ready.

---

## ⚠️ For the FRONTEND team (deferrable)

### FE-1. Server-side dev-backend override

`features/files/api/server-client.ts` (used by App Router route handlers
like `/api/agent-apps/generate-favicon` and `/api/images/upload`) reads
`BACKEND_URLS.production` only. In dev, server-side cloud-files calls
ignore the admin server-toggle and always go to prod.

**Fix sketch:** when `setActiveServer` is dispatched, also set a cookie
`matrx_active_server` (HttpOnly: false so client and server can read).
`createServerContext` parses the cookie to choose the base URL. Roughly
30 minutes of work.

### FE-2. PDF blob-prefetch via a `useFileBlob` hook

PdfPreview hands the signed URL directly to react-pdf, which fetches it
again. This means the file is fetched twice (once by `useSignedUrl`'s
expiry refresh check, once by react-pdf), and any intermediate URL
expiration causes a confusing "Failed to fetch" error.

**Fix sketch:** new `useFileBlob(fileId)` hook that fetches the bytes
once, returns a stable `blob:` URL, and revokes it on unmount. Plumb the
result into PdfPreview's `<Document file={...}>` prop. Gives the same
benefit to image / video / audio previewers (consistent caching, no
re-fetch on tab switch).

### FE-3. Mobile-specific surfaces for Code/Data/Markdown previewers

The new previewers (CodePreview, DataPreview, MarkdownPreview) work on
mobile but were designed desktop-first. Particularly DataPreview — the
sticky table header and per-cell tooltips don't translate to a phone.

**Fix sketch:** wrap each previewer in `useIsMobile()` and serve a card
view on phones (one card per row, primary fields at top, tap-to-expand
for the rest). Until done, mobile users get a usable but cramped
experience.

---

## Status of items that ARE done (no involvement needed)

For completeness, these were closed in this round and don't need anyone
else's help:

- ✅ Tree-wide search with per-row breadcrumbs
- ✅ Drag-and-drop in FileTable + FileGrid + sidebar folder tree
- ✅ File Info dialog (size, mime, visibility, path, copyable id)
- ✅ File Versions tab in PreviewPane (list + restore)
- ✅ CodePreview with Prism syntax highlighting (~30 languages)
- ✅ Recents section + route + auto-applied filter, capped at 100
- ✅ Rich AudioPreview (scrub, ±10s, volume, speed, loop, time display)
- ✅ Multi-select batch context menu (operates on whole selection)
- ✅ Keyboard shortcut hints in context menu (visual labels, ⌘L/F2/⌘D/⌘I/⌫)
- ✅ Global keyboard handlers (⌘L copy, ⌘D duplicate, ⌫ delete) with strict focus-scoping
- ✅ Duplicate action (client-side fetch + re-upload, no backend change needed)
- ✅ Diagnostic test page (`/ssr/demos/cloud-files-debug`)
- ✅ Cloud-files browser client now respects the admin server-toggle (was hardcoded to prod)

Full change log: [FEATURE.md](FEATURE.md).
