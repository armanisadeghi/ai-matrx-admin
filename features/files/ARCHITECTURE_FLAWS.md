# Cloud Files — Architectural Flaws + Team Action Items

> Honest accounting of where the cloud-files migration drifted from the
> intent. The thesis the user articulated:
>
> > **React should do essentially nothing when it comes to file
> > handling. Python handles everything.**
>
> The current code violates that thesis in several places. This doc
> lists every violation with a clear fix, broken into Python-team work
> and React-team work.

**Status legend:** 🔴 must-fix · 🟡 should-fix · 🟢 nice-to-have ·
✅ already done in this round.

---

## Top-line architectural intent (target state)

```
                      ┌─────────────┐
                      │   Browser   │   Auth: Supabase JWT (or fingerprint
                      │   (React)   │          for guests — see ITEM P-1)
                      └──────┬──────┘
                             │
                             │ ONE call: POST /files/upload
                             │ with full file_path string
                             ▼
                      ┌─────────────┐
                      │ Python API  │   Owns everything:
                      │ (FastAPI)   │   • auth resolution (user OR guest)
                      └──────┬──────┘   • folder hierarchy (create on demand)
                             │          • file insert + version
                             │          • share-link generation (if asked)
                             │          • permissions
                             ▼
                      ┌─────────────┐
                      │  Supabase   │   Browser ONLY uses for:
                      │   + S3      │   • realtime subscriptions
                      └─────────────┘   • SECURITY DEFINER tree RPC reads
```

**The browser must never do these during an upload:**
- Query `cld_*` tables via supabase-js (RLS, recursion, complexity)
- Pre-create folders via supabase-js insert
- Resolve folder ids to paths
- Generate share links

The browser's only upload responsibility:
1. POST one multipart request with `file` + `file_path` string + JWT.
2. Show progress.
3. Render the response.

---

## What's been fixed (this round)

✅ **`features/files/upload/cloudUpload.ts`** — single-source upload
primitive. All 5 hooks (`useFileUploadWithStorage`,
`useUploadAndGet`, `useUploadAndShare`, the imperative
`uploadAndShare`, and the `uploadFiles` thunk) now go through it. None
of them call `supabase.from("cld_*")` anymore. The Python backend
handles folder creation server-side.

✅ **RLS recursion fix part 1** — applied migration that wraps the
cross-table EXISTS checks in SECURITY DEFINER helpers. Files /
folders / permissions can now be queried directly from the browser
without 42P17.

✅ **RLS recursion fix part 2** — same treatment for
`cld_user_group_members ↔ cld_user_groups`. Was uncovered after part 1
because `cld_files_shared_group_select` and
`cld_folders_shared_group_select` had inline group-member JOINs.

✅ **Debug harness with copy buttons** — `/ssr/demos/file-upload-debug`
exposes every upload pattern with raw error visibility. Copy a single
row or copy-all to clipboard with one click.

✅ **Real error propagation** — `failed[]` shape now carries
`{ name, error }` per file, `lastErrorRef` on the legacy hook surfaces
the synchronous reason, every caller's `catch` was rewritten to read
the actual cause instead of swallowing it.

---

## ⚠️ For the PYTHON TEAM

### 🔴 P-1. Guest uploads (CRITICAL — currently impossible)

**The problem:** Cloud-files requires a Supabase JWT on every
endpoint. Guests don't have one. We have a `guest_executions` table
that gives each fingerprint a stable `id` (UUID) plus tracking
metadata, but the `/files/*` endpoints don't accept it.

**Schema we already have:**
```sql
guest_executions(
  id uuid PRIMARY KEY,           -- the guest's stable user-id surrogate
  fingerprint text NOT NULL,
  ip_address inet,
  user_agent text,
  total_executions int,
  daily_executions int,
  daily_reset_at timestamptz,
  is_blocked boolean,
  blocked_until timestamptz,
  converted_to_user_id uuid,     -- when guest signs up, link to auth.users
  converted_at timestamptz,
  ...
)
```

**What we need from Python:**

1. **Accept fingerprint auth as an alternative to JWT** on
   `POST /files/upload` (and any other endpoint guests need —
   `GET /files/{id}/url`, `GET /files/{id}/download`).

2. **Auth header convention** (suggested):
   ```
   Authorization: Bearer <jwt>          ← authed user
   X-Guest-Fingerprint: <fingerprint>   ← guest
   ```
   Reject requests with neither. If only fingerprint is set, look up
   `guest_executions.id` by fingerprint (creating a row if none
   exists) and treat that UUID as the file's `owner_id`.

3. **Quota enforcement at the backend.** The `guest_executions` row
   already has `daily_executions` / `is_blocked`. Apply the same
   throttle to file uploads (e.g. max N MB per day per fingerprint).

4. **Conversion path.** When a guest converts to a real user
   (`converted_to_user_id` is set), files owned by the guest UUID
   should remain queryable as the new user. Either:
   - Re-write `cld_files.owner_id = converted_to_user_id`, OR
   - Have RLS treat `converted_to_user_id = auth.uid()` as ownership too.

5. **Public-chat path retired.** Once guest uploads work via cloud-files,
   we can delete `hooks/usePublicFileUpload.ts` and the `public-chat-uploads`
   Supabase Storage bucket entirely.

**FE side:** see item R-3.

---

### 🔴 P-2. Standard folders auto-created on signup AND on first guest interaction

**The problem:** "Images", "Audio", "Documents", "Code", "Generated",
etc. are described as canonical folders in `folder-conventions.ts`,
but no user actually has them until they upload to that path. Same
for guests.

**What we need from Python:**

A trigger or signup hook that, on every `auth.users` insert AND on
every new `guest_executions` insert, runs:

```sql
INSERT INTO cld_folders (owner_id, parent_id, folder_name, folder_path, visibility)
VALUES
  ($owner, NULL, 'Images',           'Images',           'private'),
  ($owner, NULL, 'Audio',            'Audio',            'private'),
  ($owner, NULL, 'Documents',        'Documents',        'private'),
  ($owner, NULL, 'Code',             'Code',             'private'),
  ($owner, NULL, 'Chat Attachments', 'Chat Attachments', 'private'),
  ($owner, NULL, 'Task Attachments', 'Task Attachments', 'private'),
  ($owner, NULL, 'Generated',        'Generated',        'private');
ON CONFLICT DO NOTHING;
```

(The exact list lives in
[features/files/utils/folder-conventions.ts](utils/folder-conventions.ts).)

After this, the FE never has to ask "does this folder exist?" — it
always does for top-level conventions. The backend only needs to
auto-create *deep* paths users build (e.g. `Images/Chat`,
`Task Attachments/<taskId>`).

---

### 🟡 P-3. `POST /files/upload` should accept and create deep folder paths atomically

**Current behavior:** Confirmed working — `/api/images/upload` posts
`Images/Generated/<uuid>/cover.jpg` and the file appears with all
intermediate folders. ✅

**What we still need:** Make it explicit + documented in
`cloud_files_frontend.md` so future FE work doesn't re-introduce
client-side folder creation. Suggested wording:

> The `file_path` field is a logical path. The server will create any
> missing parent folders atomically as part of the upload. Clients
> MUST NOT pre-create folders — pass the full path and let the
> server handle it.

---

### 🟡 P-4. Surface real errors in the response body

The `/files/upload` endpoint returns BackendApiError shapes today,
which the FE handles fine. Just confirm the response always includes
`{ code, message, user_message, details }` for every 4xx/5xx — a few
errors come through as bare strings and force the FE to guess the
category.

---

### 🟡 P-5. `cld_get_user_file_tree` should accept guest IDs

The RPC takes `p_user_id uuid` and is `SECURITY DEFINER`. Update it
to also accept a `guest_executions.id` — same code path, just
filter `cld_files.owner_id = p_user_id OR p_user_id` against the
guest table. Gate by an additional arg (`p_is_guest boolean`) if you
want to be paranoid.

---

### 🟢 P-6. Folder CRUD endpoints (still missing)

Already on the backlog (from prior `PYTHON_TEAM_COMMS.md` — left
here for completeness):

- `POST /folders` — create a folder explicitly (rare; usually upload auto-creates).
- `PATCH /folders/:id` — rename.
- `DELETE /folders/:id` — soft-delete recursively.
- `POST /folders/:id/move` — move to a new parent.

Right now folder rename / delete is unsupported in the UI because no
endpoint exists.

---

### 🟢 P-7. Bulk operations

- `DELETE /files/bulk` `{ file_ids[], hard_delete? }`
- `POST /files/bulk/move` `{ file_ids[], new_parent_folder_id }`
- `POST /folders/bulk/move`

The FE currently fans out per-file calls (concurrency 4). Works but
generates 50× the request volume on bulk delete.

---

## ⚠️ For the REACT TEAM

### 🔴 R-1. Use `cloudUpload` for every new upload caller

**The rule:** if you need to upload a file, the import is exactly:

```ts
import { cloudUpload } from "@/features/files/upload";
// or one of the wrappers:
import { useUploadAndShare } from "@/features/files";
import { useUploadAndGet } from "@/features/files";
```

**Forbidden patterns** in any new code:
- ❌ `supabase.storage.from(...).upload(...)` (legacy)
- ❌ `supabase.from("cld_files").insert(...)` from the browser
- ❌ `supabase.from("cld_folders").insert(...)` from the browser
- ❌ Calling `ensureFolderPath` for the purpose of uploading
- ❌ Custom multipart fetch to `/files/upload` (use the typed client)
- ❌ Wrapping `cloudUpload` in another layer of abstraction

The single-source rule is enforced by code review, not by tooling.
If you find yourself wanting another upload primitive, fix `cloudUpload`
instead.

---

### 🔴 R-2. Stop calling `ensureFolderPath` for upload paths

**Status:** ✅ done — fixed in this round across `useUploadAndGet`,
`useUploadAndShare`, `useFileUploadWithStorage`, and the debug page.

**What was wrong:** Each browser hook resolved the folder client-side
before uploading. That meant 1 supabase-js query per upload (which
hit the now-fixed RLS recursion) and double-bookkeeping with the
backend.

**What it does now:** Pass `folderPath: "Images/Chat"` directly to
`cloudUpload`. The backend creates any missing folders atomically.
The browser never queries `cld_folders` during upload.

`ensureFolderPath` is kept in the codebase for the rare case of
"create a folder explicitly without uploading anything" (e.g. user
clicks "New Folder" in the cloud-files UI). When folder CRUD endpoints
land (P-6), this will move to the backend too.

---

### 🔴 R-3. Wire guest-upload support once Python ships P-1

**FE work** (after Python lands fingerprint auth):

```diff
  // features/files/api/client.ts → buildHeaders()
  async function buildHeaders(opts, includeContentType) {
-   const token = await getAccessToken();        // throws if no JWT
+   const { user, fingerprint } = await getAuthOrFingerprint();
    const headers = { ... };
+   if (user) headers.Authorization = `Bearer ${user.token}`;
+   else if (fingerprint) headers["X-Guest-Fingerprint"] = fingerprint;
+   else throw new BackendApiError(...);
  }
```

`getAuthOrFingerprint` already has most of its plumbing in
`hooks/useFingerprint.ts` and `lib/redux/slices/userSlice.ts`. Need
to plumb the fingerprint into the `cloudUpload` request headers.

After this, **delete** `hooks/usePublicFileUpload.ts` entirely. It's
only there because guest uploads were impossible.

---

### 🟡 R-4. Stop reading `cld_*` tables directly from the browser

The RLS migration unblocked direct reads, but they're still a
liability — the browser needs to know table schemas, handle RLS
errors gracefully, and re-query on auth changes. Better: route
reads through:

- `cld_get_user_file_tree` RPC (already used; SECURITY DEFINER)
- Realtime subscriptions (already used)
- Specific Python endpoints for niche reads (file detail, version
  history, etc.) — `/files/{id}`, `/files/{id}/versions`, etc. (these
  exist).

Audit these surviving direct reads (from `features/files/redux/thunks.ts`)
and migrate one at a time:

| File:line | Table | Replace with |
|---|---|---|
| `thunks.ts:243` | `cld_files` | `Files.getFile()` + slice upsert |
| `thunks.ts:248` | `cld_folders` | tree RPC |
| `thunks.ts:285` | `cld_file_versions` | `Versions.listVersions()` |
| `thunks.ts:302` | `cld_file_permissions` | `Permissions.listFor()` |
| `thunks.ts:318` | `cld_share_links` | `ShareLinks.listFor()` |
| `thunks.ts:373/407/413/464` | `cld_folders` | tree RPC |

These all work now (RLS fixed), but they violate the architectural
intent. Phase out at leisure.

---

### 🟡 R-5. Drop `usePublicFileUpload` once R-3 ships

Currently kept because guests have no other path. Once `cloudUpload`
supports fingerprint auth, this hook's reason for existing
disappears. Delete it and the `public-chat-uploads` Supabase bucket.

---

### 🟡 R-6. Folder CRUD UI is half-built

`createFolder` / `deleteFolder` / `ensureFolderPath` thunks exist but
write to `cld_folders` directly. Once Python ships P-6, switch them
to REST calls. UI shouldn't change.

---

### 🟢 R-7. Centralize upload-progress UI

Every consumer renders its own progress bar / spinner. The
`uploadsByRequestId` state in the slice is the source of truth — a
single `<UploadProgressList/>` component already exists in
`features/files/components/core/FileUploadDropzone/`. Use it
everywhere.

---

## Verification

After both teams ship their pieces:

1. Guest at `/p/[some-public-app]` pastes an image → uploads via
   `cloudUpload` with `X-Guest-Fingerprint` header → file owned by
   the guest's `guest_executions.id` → appears in their tree (when
   they sign up, files migrate to their auth.uid).

2. Authed user at `/cloud-files` drags 5 files → all upload via
   `cloudUpload` → folder hierarchy created server-side → real-time
   subscription delivers the inserts → list refreshes.

3. `/ssr/demos/file-upload-debug` → "Run all" → all 7 patterns
   succeed for the same file.

4. No `supabase.from("cld_*")` calls in any upload code path
   (verified by grep:
   `grep -rn 'supabase.from("cld_' features/files/upload features/files/hooks components/ui/file-upload`
   should return zero hits).

---

## How to read this doc

- **🔴 must-fix** items block major use cases (guests can't upload at
  all; we never centralized when we said we would).
- **🟡 should-fix** items are architectural drift — the system works
  but is harder to reason about than it should be.
- **🟢 nice-to-have** items improve performance or DX without changing
  the contract.

Each item has a clear owner (Python or React) and is independently
shippable. Don't batch them; ship as small PRs that each move us
closer to the target state.
