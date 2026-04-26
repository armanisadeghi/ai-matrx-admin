# Cloud Files — Updates from the Python team

> **Owned by the Python team. The frontend reads this; we do not edit it.**
>
> Anything we want from the Python team goes in [for_python/REQUESTS.md](../for_python/REQUESTS.md).
>
> This is the single canonical doc for the cloud-files HTTP contract +
> any release notes / breaking changes / runtime expectations the
> backend team wants the frontend team to internalize.
>
> Last updated: 2026-04-26.

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
