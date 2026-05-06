# Cloud Files — Updates from the Python team

> **Owned by the Python team. The frontend reads this; we do not edit it.**
>
> Anything we want from the Python team goes in [for_python/REQUESTS.md](../for_python/REQUESTS.md).
>
> This is the single canonical doc for the cloud-files HTTP contract +
> any release notes / breaking changes / runtime expectations the
> backend team wants the frontend team to internalize.
>
> Last updated: 2026-05-05.

---

## Status legend

- 🟢 **Live** — shipped + verified
- 🟡 **Live (partial)** — shipped, follow-up work tracked
- 🔵 **Planned** — committed, not yet shipped
- ⚪ **Not yet** — backlog / no timeline

---

## 0. Required deploy steps (backend ops)

These are the operational steps each environment needs before the
frontend can run against it. The frontend does not perform any of
these — they're listed here so the FE team can spot env-misconfig
symptoms quickly.

1. Apply SQL migrations 002 + 003 in order on the live Supabase project.
   - `packages/matrx-utils/matrx_utils/file_handling/cloud_sync/sql/002_guest_support.sql`
   - `packages/matrx-utils/matrx_utils/file_handling/cloud_sync/sql/003_security_correctness_quotas.sql`
2. Set new env vars:
   - `CORS_ALLOWED_ORIGINS=https://app.aidream.com,...`
   - `GUEST_FINGERPRINT_SECRET=<32+ random bytes>`
   - `CLOUD_FILES_BYPASS_SECRET=<32+ random bytes>`
   - `SUPABASE_JWT_AUDIENCE=authenticated`
3. Restart the API. Lifespan probe prints `Cloud sync: configured (bucket=…)`.
4. Apply tier rows if you want to override defaults (SQL §7).

---

## 1. Authentication — what the frontend sends

Every request is identified by **either** an authed user OR a guest
fingerprint (or both — authed users may also send a fingerprint so
the server can correlate prior guest activity).

| Header | Sent for | Notes |
|---|---|---|
| `Authorization: Bearer <jwt>` | Authed users | Supabase JWT. `verify_aud=true` with `audience="authenticated"`. |
| `X-Guest-Fingerprint` | Guests + authed (correlation) | Resolves to a stable `guest_executions.id`. `X-Fingerprint-ID` is the legacy alias and is also accepted. |
| `X-Request-Id` | Every mutation | Client-generated UUID. Used for log correlation + realtime-echo dedup. |
| `X-Idempotency-Key` | Optional, mostly uploads | Stored in `metadata._idempotency_key`. Reuse the same key across retries of the same intended upload to avoid duplicate version rows. |
| `X-Cloud-Files-Bypass: <secret>` | Trusted internal callers only | Must match `CLOUD_FILES_BYPASS_SECRET`. Skips quota / rate-limit refusals (still records bytes for accounting). NEVER thread user input into this. |

A request with neither `Authorization` nor `X-Guest-Fingerprint`
returns `401 auth_required`.

---

## 2. Account tiers, quotas, and rate limits 🟢

Every account is assigned an **account tier** that controls upload
size, total storage, file count, daily upload caps, bulk operation
size, and per-minute rate limits. Defaults seeded by migration 003:

| Tier | Storage | Per-file | Files | Daily uploads | Daily bytes | Bulk cap | Upload RPM |
|---|---|---|---|---|---|---|---|
| **guest** | 200 MB | 25 MB | 50 | 20 | 500 MB | 50 | 10 |
| **free** | 5 GB | 100 MB | 5 000 | 200 | 5 GB | 200 | 60 |
| **pro** | 100 GB | 5 GB | 100 000 | 2 000 | 100 GB | 500 | 300 |
| **enterprise** | unlimited | unlimited | unlimited | unlimited | unlimited | 5 000 | unlimited |

To change a user's tier or apply a custom override, insert/update
`cld_user_account` (server side). Per-user `custom_limits` overrides
any tier default.

### Quota refusals

A refused write returns `413` (or `429` for rate-limit) with one of
the following error codes in the body:

- `storage_quota_exceeded`
- `file_too_large`
- `file_count_exceeded`
- `daily_uploads_exceeded`
- `daily_bytes_exceeded`
- `rate_limited` (429)
- `account_blocked`
- `bulk_too_large`

Body shape:
```json
{
  "error": "<code>",
  "message": "Upload refused by account-quota policy.",
  "details": { "limit": 100, "used": 90, "attempted": 50 }
}
```

### Bypass paths

Two ways for trusted internal callers to skip quota / rate-limit
refusal (still records the bytes for accounting):

1. **Admin user** — `ctx.is_admin` automatically bypasses.
2. **`X-Cloud-Files-Bypass: <secret>`** — header must equal
   `CLOUD_FILES_BYPASS_SECRET`. Use this for internal workers /
   importers / bulk-loaders that legitimately need to write a 5 GB
   dataset.

Bypass does NOT disable the hard 5 GB buffered-upload ceiling
(memory-safety guard).

### Read tier + usage

```http
GET /files/usage
```

Response: see `StorageUsageResponse` in §6.

---

## 3. Endpoint catalog (46 routes)

Status: 38 auth-required + 8 public/share/migrate.

### Files
| Method | Path | Status | Notes |
|---|---|---|---|
| `POST` | `/files/upload` | 🟢 | Multipart. Optional `X-Idempotency-Key`, `X-Cloud-Files-Bypass`. Quota pre-flight + 413/429 refusals. |
| `GET` | `/files` | 🟢 | `?folder_path=&limit=&offset=` (1–1000, default 100). |
| `GET` | `/files/{file_id}` | 🟢 | |
| `GET` | `/files/by-path/{file_path}` | 🟢 | URL-encoded path. |
| `PATCH` | `/files/{file_id}` | 🟢 | **Metadata MERGED by default**; `?metadata_merge=false` for replace. |
| `DELETE` | `/files/{file_id}` | 🟢 | `?hard_delete=true` purges S3 + versions + permissions + share-links. Requires `admin` permission (owner OR admin grantee). |
| `POST` | `/files/{file_id}/rename` | 🟢 | Body `{new_path}` — rename / move with auto-create of parent folders. |
| `POST` | `/files/{file_id}/copy` | 🟢 | Body `{target_path, overwrite?}` — counts against caller's quota. |
| `POST` | `/files/{file_id}/restore` | 🟢 | Undo soft-delete. Owner / admin grantee only. |
| `GET` | `/files/{file_id}/download` | 🟢 | `?version=`, `?inline=true`. `nosniff` + RFC-5987 filenames. Inline only honoured for `image/*`, `video/*`, `audio/*`, `application/pdf`. |
| `GET` | `/files/{file_id}/url` | 🟢 | Returns a 7-day signed S3 URL. |
| `GET` | `/files/usage` | 🟢 | Tier + quota + current usage (see §6). |
| `GET` | `/files/trash` | 🟢 | Soft-deleted files + folders for the user. |
| `GET` | `/files/search` | 🟢 | `?q=&mime_prefix=&limit=&offset=` — substring search across filename + path. |
| `GET` | `/files/tree` | 🟢 | `?limit=&offset=&include_folders=&include_deleted=`. **Returns folders too** with `kind: "file" \| "folder"` discriminator. |
| `GET` | `/files/folders` | 🟢 | `?parent_path=` — list folders. |
| `DELETE` | `/files/bulk` | 🟢 | Body `{file_ids[], hard_delete?}`. Returns `BulkResponse`. Concurrency-capped 10 in-flight; size capped at tier `max_bulk_items`. |
| `POST` | `/files/bulk/move` | 🟢 | Body `{file_ids[], new_parent_folder_id}`. Verifies same-owner targets. |
| `POST` | `/files/migrate-guest-to-user` | 🟢 | See §4 (BREAKING contract). |

### Folders
| Method | Path | Status |
|---|---|---|
| `POST` | `/folders` | 🟢 |
| `PATCH` | `/folders/{folder_id}` | 🟢 — rename cascades to descendants |
| `DELETE` | `/folders/{folder_id}` | 🟢 — soft-delete cascades + share-links deactivated |
| `POST` | `/folders/bulk/move` | 🟢 |
| `GET/POST/DELETE` | `/folders/{folder_id}/permissions` | 🟢 — same as files; cascades to descendants |
| `GET/POST` | `/folders/{folder_id}/share-links` | 🟢 |

### Versions
| Method | Path | Status |
|---|---|---|
| `GET` | `/files/{file_id}/versions` | 🟢 |
| `POST` | `/files/{file_id}/restore-version` | 🟡 — partial; full rewrite still queued |

### Permissions + share links
| Method | Path | Status |
|---|---|---|
| `GET/POST/DELETE` | `/files/{file_id}/permissions` | 🟢 |
| `POST` | `/files/{file_id}/share-links` | 🟢 |
| `GET` | `/files/{file_id}/share-links` | 🟢 |
| `DELETE` | `/files/share-links/{token}` | 🟢 — `is_active=false` immediately blocks resolve; cascade on file/folder delete |
| `GET` | `/share/{share_token}` | 🟢 — public, refuses deactivated/expired |
| `GET` | `/share/{share_token}/download` | 🟢 — public, atomic max_uses consume |

### Groups
| Method | Path | Status |
|---|---|---|
| `GET/POST` | `/files/groups` | 🟢 |
| `GET/POST/DELETE` | `/files/groups/{group_id}/members` | 🟢 |

---

## 4. Breaking contract changes (FE must reconcile)

### `BulkOperationResponse` → `BulkResponse`

Backend ships:
```ts
interface BulkResultItem {
  id: string;
  ok: boolean;
  error: string | null;   // error code/message when ok=false
}
interface BulkResponse {
  results: BulkResultItem[];
  succeeded: number;       // count, not array
  failed: number;          // count, not array
}
```

Affects: `DELETE /files/bulk`, `POST /files/bulk/move`, `POST /folders/bulk/move`.

### `POST /files/migrate-guest-to-user`

Body:
```ts
{
  new_user_id: string;       // must equal authed user_id (server verifies)
  guest_id?: string;         // optional cross-check against fingerprint
}
```

Required header: `X-Guest-Fingerprint` (or `X-Fingerprint-ID`).

Response:
```ts
{
  files: number, folders: number, groups: number, perms: number, shares: number,
  // Same numbers under aliased names for FE convenience:
  files_migrated: number, folders_migrated: number, groups_migrated: number,
  permissions_migrated: number, shares_migrated: number,
}
```

Behaviour:
- Idempotent re-calls with the same `new_user_id` return the original payload.
- Re-calls with a DIFFERENT `new_user_id` return `409 guest_locked`.
- Without the fingerprint header → `400 fingerprint_required`.
- Mismatched `guest_id` vs resolved fingerprint → `403 guest_id_mismatch`.

### `GET /files/tree` discriminated rows

Each row:
```ts
{ kind: 'file' | 'folder', id, owner_id, path, name, parent_id,
  mime_type, size_bytes, visibility, current_version, metadata,
  created_at, updated_at, deleted_at, effective_permission }
```

Folders ship in the same response (`include_folders=true` is the default).

### PATCH `/files/{id}` metadata is now MERGED by default

The default behavior CHANGED from "replace" to "merge". To get the old
replace semantics pass `?metadata_merge=false`.

### Path sanitization

`file_path` and `folder_path` reject:
- `..` segments, empty segments (`a//b`), `.` segments
- Backslashes
- Embedded NUL or control characters
- Right-to-left override / Bidi tricks
- Paths exceeding 1024 chars total or 32 segments deep

Leading and trailing slashes are silently stripped (not rejected).
Errors come back as `400 invalid_path` with a precise reason in
`message`.

### MIME sniffing on upload

Backend ignores client-supplied `Content-Type` for active types
(HTML, SVG, JavaScript). Stored MIME may be rewritten to
`application/octet-stream` if the bytes look active. Active types are
always served as `attachment` regardless of `?inline=true`.

### `cld_get_user_file_tree` is identity-locked

Direct calls from supabase-js (anon key) with someone else's UUID are
rejected with `42501 forbidden`. The backend (service role) is
unaffected. Function signature gained pagination + folder-inclusion
params (additive).

---

## 5. Error envelope

```ts
interface ApiError {
  error: string;          // machine-readable code (see §6)
  message: string;        // operator-facing text
  user_message: string;   // friendly text (populated by global handler)
  details: unknown | null;
  request_id: string;
}
```

The FE error code union (`CloudFilesErrorCode` in `features/files/types.ts`)
mirrors what the backend returns. Each code carries a retry posture —
see the comment block above the union for the full table.

### Status code → retry posture

| HTTP | Retry?  | Typical UX |
|---|---|---|
| 400 (`invalid_*`) | no | Fix the request. |
| 401 (`auth_required`) | no | Sign in. |
| 403 (`permission_denied`, `guest_id_mismatch`) | no | Request access / re-auth. |
| 404 (`not_found`) | no | Resource gone. |
| 409 (`conflict`, `file_already_exists`, `guest_locked`) | no | Pass `overwrite=true` or surface state. |
| 410 (`share_link_invalid`) | no | Link revoked / expired. |
| 413 (`file_too_large`, `*_quota_exceeded`, `*_uploads_exceeded`, `bulk_too_large`) | no | Upgrade tier / wait / smaller batch. |
| 423 (`account_blocked`) | no | Contact support. |
| 429 (`rate_limited`) | **yes** | Exponential backoff. |
| 5xx (`internal`, `cld_sync_unavailable`) | **yes** | Exponential backoff. |

---

## 6. Response shapes (key types)

### `StorageUsageResponse`
```ts
interface StorageUsageResponse {
  tier_id: string;
  tier_name: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  bytes_used: number;
  files_count: number;
  daily_upload_count: number;
  daily_upload_bytes: number;
  max_storage_bytes: number | null;
  max_file_size_bytes: number | null;
  max_files: number | null;
  max_versions_per_file: number | null;
  max_daily_uploads: number | null;
  max_daily_upload_bytes: number | null;
  max_bulk_items: number | null;
  rate_limit_uploads_per_min: number | null;
  rate_limit_downloads_per_min: number | null;
  features: Record<string, unknown>;
}
```

### `TrashListResponse`
```ts
interface TrashListResponse {
  files: FileRecord[];
  folders: FolderRecord[];
}
```

### `SearchFilesResponse`
```ts
interface SearchFilesResponse {
  results: FileRecord[];
  query: string;
  total_returned: number;
}
```

### `RenameFileRequest` / `CopyFileRequest`
```ts
interface RenameFileRequest { new_path: string }
interface CopyFileRequest    { target_path: string; overwrite?: boolean }
```

### `CloudTreeRow`
```ts
interface CloudTreeRow {
  kind: 'file' | 'folder';
  id: string;
  owner_id: string;
  path: string;
  name: string;
  parent_id: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: 'public' | 'private' | 'shared';
  current_version: number | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  effective_permission: 'admin' | 'write' | 'read' | null;
}
```

---

## 7. Security posture (FE-relevant summary)

The full audit history lives with the Python team. The FE-relevant
guarantees as of this release:

- **CORS lockdown** — `CORS_ALLOWED_ORIGINS` env-driven. Local dev
  (`localhost:3000`, `:3100`, `:3101`, `:5173`) auto-whitelisted when
  empty. **Set the env var in staging / prod.**
- **Path traversal closed** — `..`, NUL, backslash, RTL, etc.
  rejected at every boundary.
- **Stored XSS closed** — `nosniff` + `Content-Disposition: attachment`
  for active MIMEs (HTML / SVG / JS / XML). Inline rendering only
  honoured for image/video/audio/PDF.
- **Hard delete actually deletes** — `?hard_delete=true` purges S3
  object, all `.versions/<id>/v*/…` S3 objects, all
  `cld_file_versions` rows, all `cld_file_permissions` rows, all
  `cld_share_links` rows, and the `cld_files` row itself. A
  "restore" call after hard-delete now correctly returns 404.
- **Share links** — `is_active=false` is enforced on resolve;
  cascade-deactivates on file/folder soft-delete; atomic
  `max_uses` consume.
- **`DELETE /files/{id}` requires admin permission** — owner or
  admin grantee. Non-grantees get `403 permission_denied` (was
  silently `{deleted: false}`).
- **`Content-Disposition` filename** — RFC-5987 compliant,
  CR/LF/quote injection blocked.
- **Fingerprint logging redacted** — hashed to a 12-char prefix
  (`fp:abc123def456…`).

---

## 8. What's still pending

Tracked items that were explicitly NOT in the latest release:

- ⚪ Resumable / TUS uploads — for files > 100 MB (or > tier cap).
  Today: hard 5 GB ceiling on the buffered path; bypass header
  required for >100 MB.
- ⚪ Presigned PUT to S3 — direct browser → S3 path.
- ⚪ Range download / streaming response — `/files/{id}/download`
  still buffers the whole file. Range support is queued.
- ⚪ CDN-backed permanent URLs for `visibility="public"` (currently
  7-day signed S3).
- ⚪ Webhooks / SSE events beyond Supabase Realtime.
- ⚪ Storage re-keying by `file_id` so renames are pure DB ops with
  zero S3 cost.
- ⚪ Per-org tenancy — `organization_id` columns added to schema;
  routes still single-owner.
- ⚪ Comments / annotations / file locking.
- ⚪ Antivirus scan.
- ⚪ Server-side thumbnail / poster generation on upload (FE has
  asked — see [for_python/REQUESTS.md](../for_python/REQUESTS.md)).
- ⚪ S3 bucket CORS so direct `fetch(signed_url)` works without the
  FastAPI proxy round-trip (FE has asked).

---

## 9. Recent ships (changelog)

Newest entries first. Each entry corresponds to one bundle in the
plan we're working through against `for_python/REQUESTS.md`.

### 2026-05-05 — Bundle D: Range download streaming + thumbnail pipeline 🟢 (SQL applied; code in tree)

Closes FE requests **4** (Range download / streaming) and **1**
(server-side thumbnail generation). The two changes ride together
because the upload response shape and the download response shape
both grow new fields the FE will key off.

**D1 — Range download / streaming on `GET /files/{file_id}/download`:**
- [`aidream/api/routers/files.py`](../../../aidream/aidream/api/routers/files.py) — endpoint refactored from a buffered `Response(content=…)` into a `StreamingResponse` that pulls bytes directly from S3.
- New `_parse_range_header()` parser handles `bytes=N-M`, `bytes=N-`, `bytes=-N`, multi-range (first only), and unsatisfiable specs.
- Wire behaviour:
  - **No `Range:` header** → 200 with `Content-Length`, `Accept-Ranges: bytes`, streamed in 256 KiB chunks.
  - **Valid `Range: bytes=N-M`** → 206 Partial Content with `Content-Range: bytes N-M/total`.
  - **Range past EOF** → 416 Range Not Satisfiable with `Content-Range: bytes */total`.
  - **Public + CDN configured + no version pin** → still 302 to CDN (CDN handles range natively).
- Version-pinned reads (`?version=N`) stay on the buffered path for now — version storage is managed by `VersionManager` and not directly S3-addressable in every backend. Versions are typically tiny + cold; ranged version reads is a follow-up.
- `_DOWNLOAD_HEADERS` now always carries `Accept-Ranges: bytes`.

**D2 — Thumbnail pipeline:**
- New SQL migration: [`db/migrations/0033_cld_files_thumbnail.sql`](../../../aidream/db/migrations/0033_cld_files_thumbnail.sql) (applied) — adds `thumbnail_storage_uri` + `thumbnail_url` columns to `cld_files`.
- New service: [`aidream/services/cloud_files/thumbnails.py`](../../../aidream/aidream/services/cloud_files/thumbnails.py) — `generate_thumbnail_for_file(fm, file_id)` entry point. Pillow + pypdfium2 dependencies were already installed.
- Coverage in v1:
  - **`image/*`** → Pillow resize 256px longest side, JPEG q=80, ~10–30 KB.
  - **`application/pdf`** → pypdfium2 first-page render, then Pillow resize.
  - **`video/*`** — deferred (FE has client-side first-frame thumbnails shipped 2026-04-26).
  - **`audio/*`** — deferred (mutagen integration is the follow-up).
- Hooked fire-and-forget into both upload paths in `files.py`:
  - Multipart `POST /files/upload` after the usage-delta call.
  - Presigned `POST /files/finalize-upload` after the usage-delta call.
- Failures log + leave the columns NULL; the FE falls back to its category icon.
- Thumbnails land at `s3://<bucket>/<owner_id>/.thumbnails/<file_id>.jpg` with a 30-day cache header. Once written, the resulting `cld_files` UPDATE event rides the existing realtime publication, so the grid view swaps the icon for the rendered thumb without polling.

**Wire shape changes:**
- `FileRecord` adds an optional top-level `thumbnail_url: string | null` field. Populated on response: CDN URL for public files, NULL for private files (the FE can ask for a fresh signed URL via the existing `GET /files/{id}/url` flow when it actually needs to render the thumbnail bytes).

**Verification on the FE side:**
- Range: open a >10 MB MP4 in `<video>`, scrub mid-file → DevTools network panel shows a 206 with `Content-Range`. The same pattern works for any `fetch(url, {headers: {Range: 'bytes=0-1023'}})` against the download endpoint.
- Thumbnails (image): upload a JPEG → confirm `thumbnail_url` populates within ~5s on the realtime UPDATE event for that row. Drop the `thumbnailStrategy: 'category-icon'` for image entries that already had `backend-thumb` plumbing.
- Thumbnails (PDF): upload a PDF → same. PDFs that previously rendered as a colored square with the PDF icon now show their first page.

---

### 2026-05-05 — Bundle C: RAG ↔ files integration endpoints 🟢 (deployed in tree)

Closes FE requests **14a**, **14b**, **14c**.

**New endpoints in `aidream/api/routers/files.py`:**

#### `GET /files/{file_id}/document`
Returns the latest processed_documents row anchored to this cld_files.id.
ACL: same as `GET /files/{file_id}` (owner OR explicit grant).

```ts
// 200
{
  processed_document_id: string,
  derivation_kind: string | null,
  total_pages: number | null,
  chunk_count: number,            // count from rag.kg_chunks
  has_clean_content: boolean,
  updated_at: string | null,      // ISO 8601
}
// 404
{ error: "no_processed_document", code: "no_processed_document",
  message: "File '{id}' has not been processed for RAG." }
```

#### `POST /files/{file_id}/ingest` and `POST /files/{file_id}/ingest/stream`
Convenience wrapper around `/rag/ingest`. Body:
```ts
{ force?: boolean, field_id?: string }
```
Implicitly injects `source_kind: "cld_file"`, `source_id: file_id`.
ACL: requires `write` on the file (so a read-only grantee can't trigger
re-ingestion against another user's file). The `/stream` variant uses
the same `create_streaming_response` infra as `/rag/ingest/stream` and
emits the same `rag.ingest.progress` and `rag.ingest.result` events.

Response (non-streaming) matches `IngestResponse`:
```ts
{
  source_kind: string,
  source_id: string,
  field_id: string | null,
  chunks_written: number,
  embeddings_written: number,
  skipped_unchanged: boolean,
  embedding_model: string,
  error: string | null,
}
```

#### `GET /files/{file_id}/lineage-summary`
Light lineage chip for the PreviewPane. Single `cld_files` query.

```ts
{
  parent_file_id: string | null,
  derivation_kind: string | null,
  derivation_metadata: Record<string, unknown>,
  has_descendants: boolean,
  descendant_count: number,
}
```

**New shared service module:** [`aidream/services/rag/processed_doc_lookup.py`](../../../aidream/aidream/services/rag/processed_doc_lookup.py) — three helpers (`find_processed_document_by_cld_file`, `count_chunks_for_processed_document`, `get_lineage_summary_for_cld_file`). Both `files.py` and `document.py` (the existing `/api/document/by-cld-file/{id}`) call this so the cld_file → processed_documents query has a single owner.

**Verification on the FE side:**
- After uploading + ingesting a PDF, `GET /files/{id}/document` returns a populated row; before ingestion, it 404s with `code: "no_processed_document"`. The FE can use the 404 as a clean signal to show "Reprocess" instead of the per-file "tried lookup" cache the README workaround describes.
- `GET /files/{id}/lineage-summary` returns `descendant_count` of 0 for a fresh upload and >0 for any file that has had `/pdf/extract-pages` etc. run against it.
- `POST /files/{id}/ingest/stream` streams the same events as `/rag/ingest/stream` — drop the workaround that calls `/rag/ingest` directly.

---

### 2026-05-05 — Bundle B (partial): realtime publication + request_id metadata + S3 CORS doc 🟢 (SQL applied; CORS infra pending)

Closes (post-apply) FE requests **2** (S3 CORS), **8** (cld_share_links
realtime), **9** (X-Request-Id in realtime echoes), and **14e**
(processed_documents realtime). The `cld_events` dispatcher worker
(Item 10) is staged separately and lands in a follow-up.

**B1 — Realtime publication extensions:**
- New SQL migration: [`db/migrations/0032_realtime_publication_extensions.sql`](../../../aidream/db/migrations/0032_realtime_publication_extensions.sql)
- Apply script: [`db/migrations/_apply_0032.py`](../../../aidream/db/migrations/_apply_0032.py)
- Adds `cld_share_links`, `cld_file_permissions`, and `processed_documents` to the `supabase_realtime` publication, all with `REPLICA IDENTITY FULL` so UPDATE events carry the full prior row.
- Recommended FE filters:
  - `cld_share_links` — `owner_id=eq.<userId>` for own-link state.
  - `cld_file_permissions` — `subject_user_id=eq.<userId>` for incoming-share grants.
  - `processed_documents` — `source_kind=eq.cld_file` (then match `source_id` against the file_ids the FE is watching).

**B2 — `X-Request-Id` propagation into row metadata:**
- [`aidream/api/routers/files.py`](../../../aidream/aidream/api/routers/files.py) — new `_stamp_request_id(meta)` helper near the top, called at every metadata write site:
  - upload (multipart) at the parsed_metadata stamp step.
  - presigned upload finalize at the `upsert_file_async` call.
  - file PATCH (both merge + replace branches).
  - file copy.
  - folder POST + PATCH.
- After this lands, every realtime row event for `cld_files` / `cld_folders` will carry `metadata.request_id` matching the originating request's `X-Request-Id` header, letting the FE drop the 2s timestamp-fuzzy dedup fallback.
- No schema change needed — the existing `metadata` jsonb on every cld_* table holds it.

**B4 — S3 bucket CORS:**
- Canonical policy committed at [`docs/cloud_files_s3_cors.json`](../../../aidream/docs/cloud_files_s3_cors.json) and described in [`docs/cloud_files_s3_cors.md`](../../../aidream/docs/cloud_files_s3_cors.md).
- Apply via `aws s3api put-bucket-cors --bucket "$AWS_S3_USER_FILES_BUCKET" --cors-configuration file://docs/cloud_files_s3_cors.json` per environment.
- Adds the production `app.aimatrx.com` and Vercel preview origins, plus localhost dev ports (3000/3100/3101/5173). Methods GET/HEAD only. Exposes `Content-Range` + `Accept-Ranges` so the upcoming Bundle D range-download path works directly against S3.

**B3 — `cld_events` dispatcher worker (Item 10): NOT in this bundle.** Tracked separately; lands in a follow-up. The table + emit stub already exist, so the FE can already query `cld_events` directly if needed.

**Verification on the FE side after apply:**
- Realtime: subscribe to `cld_share_links` from supabase-js, create a share link from another tab → confirm event arrives.
- Echo dedup: write a file from tab A, watch the realtime payload on tab B — confirm `metadata.request_id` matches tab A's `X-Request-Id`. Drop the timestamp-fuzzy fallback once verified.
- CORS: `curl -I -X OPTIONS -H 'Origin: https://app.aimatrx.com' -H 'Access-Control-Request-Method: GET' "$SIGNED_URL"` returns 200 + ACAO. Switch fetch-based previewers off the `useFileBlob` proxy.

---

### 2026-05-05 — Bundle A: `cld_get_user_file_tree` privacy + correctness fix 🟢 APPLIED + verified

Closes FE requests **0** and **0a**.

**What landed in the tree:**
- New SQL migration: [`db/migrations/0031_cld_files_tree_overload_fix.sql`](../../../aidream/db/migrations/0031_cld_files_tree_overload_fix.sql)
- Apply script: [`db/migrations/_apply_0031.py`](../../../aidream/db/migrations/_apply_0031.py)

**What it does, in one transaction:**
1. **`DROP FUNCTION public.cld_get_user_file_tree(uuid) CASCADE;`** — removes the legacy 1-arg overload that was causing `42725 function ... is not unique` errors when the FE called it with only `p_user_id`. After this lands, calls with only `p_user_id` will return `42883 function does not exist` rather than `42725 ambiguous` — same outcome (FE workaround already passes the 5-arg form), but unambiguous.
2. **`CREATE OR REPLACE FUNCTION public.cld_get_user_file_tree(uuid, int, int, boolean, boolean)`** — body identical to the 5-arg in `packages/matrx-utils/.../sql/003_security_correctness_quotas.sql:29` **except** the file leg's `WHERE` no longer contains `OR f.visibility = 'public'`. The file leg now matches the folder leg's intent: owner OR explicit grant only. Public files (share-link policy) remain readable by URL but no longer appear in foreign users' trees.
3. **GRANTs re-issued** (idempotent): `REVOKE FROM PUBLIC, anon` + `GRANT TO authenticated, service_role`.

**Apply status:** File is in the tree. The Python team needs to run `python db/migrations/_apply_0031.py` against each Supabase project (staging then prod) to ship the change. The apply script self-verifies post-execution that:
- exactly one overload remains, and
- the function body no longer contains `f.visibility = 'public'`.

**Verification on the FE side after apply:**
- Repro from 2026-05-05: confirm file `9e4850f8-a591-4a8e-a721-d51002c771ca` (owner `f0146c96-…`, `visibility='public'`) no longer appears in another user's `/files/tree` response.
- Once verified, you can drop the defensive client-side filter in [`redux/thunks.ts::loadUserFileTree`](../redux/thunks.ts) — the wire response will be correct.
- Both items 0 and 0a in `REQUESTS.md` move from 🔴 to 🟢.

**Note on source-of-truth:** The new function body lives in
`db/migrations/0031_cld_files_tree_overload_fix.sql` going forward.
The older 5-arg in
`packages/matrx-utils/.../sql/003_security_correctness_quotas.sql`
is a historical record — do not edit it. Any future change to the
tree RPC ships as a new numbered migration in `db/migrations/`.
