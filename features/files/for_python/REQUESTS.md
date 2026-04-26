# Cloud Files — Requests for the Python team

> **Owned by the Frontend team. The Python team reads this; we update it.**
>
> Anything the Python team wants to broadcast to us goes in
> [from_python/UPDATES.md](../from_python/UPDATES.md).
>
> This is the single canonical doc for everything the FE needs from
> the BE. Items move from `Open` → `Resolved` when the corresponding
> work ships and we've verified it on our side.
>
> Last updated: 2026-04-26.

---

## Status legend

- 🔴 **blocking** — FE work is stalled until this lands.
- 🟡 **open** — asked, awaiting movement.
- 🟠 **deferred** — agreed not to do now; tracked for later.
- 🟢 **resolved** — shipped + verified on our side.

---

## Open items

### 1. 🟡 Server-side thumbnail / poster generation on upload

**Priority:** Medium (significant UX win; no user-facing breakage today).

**Context:** The grid view falls back to a category icon for every
file type that isn't an image. We added a client-side first-frame
poster for videos in 2026-04-26 — but PDFs, presentations, documents,
audio cover art, and any future format with a meaningful visual still
render as colored squares with a small icon. That's the single biggest
reason the grid view feels less polished than Dropbox / Drive / Box.

**Ask:** On every successful upload, generate a small thumbnail
(target 256×256 longest side, JPEG or WebP, ~10–30KB) and expose it
via either:
1. `metadata.thumbnail_url` on `FileRecord` (FE already plumbed —
   just populate the field), OR
2. A new `cld_files.thumbnail_storage_uri` column + a
   `GET /files/{id}/thumbnail` endpoint, OR
3. Convention: `s3://bucket/<owner>/<file_id>/thumb.webp`

Per file kind:
- **Image** → resize the source (Pillow / sharp)
- **Video** → first-frame at t=0 (ffmpeg)
- **PDF** → first page rasterized (pdf2image / Poppler)
- **Audio** → embedded album art if any (mutagen / eyed3)
- **DOCX / PPTX** → first slide / page render (LibreOffice unoconv)
  — nice-to-have

**Why option 1 is easiest for us:** FE has a `backend-thumb`
thumbnail strategy in the file-type registry that reads
`metadata.thumbnail_url` and falls back to the category icon when
missing. As soon as the field is populated, that record renders the
backend thumbnail — no FE work beyond switching a few entries'
`thumbnailStrategy` value in
[features/files/utils/file-types.ts](../utils/file-types.ts).

**Blocker?** No.

**Current FE workaround:** Client-side video first-frame thumbnails
shipped. No client-side path for PDF / cover art (would require
loading a 400KB pdfjs bundle in the folder listing — not worth it).

---

### 2. 🟡 S3 bucket CORS for browser `fetch()` of signed URLs

**Priority:** Medium (DX + latency, not a correctness break).

**Context:** Signed URLs returned by `GET /files/{id}/url` work fine
for HTML elements that don't trigger CORS (`<img>`, `<video>`,
`<audio>`, `<iframe>`, anchor navigation). They fail with `HTTP 403
Forbidden` when the browser does `fetch(signedUrl)` because the
`matrx-user-files` bucket policy doesn't allow our origin in CORS, so
the preflight is rejected. This was breaking PDF / Markdown / Code /
Text / Data previews — all of which need to read bytes via `fetch()`
(or pdfjs's worker, which uses fetch under the hood).

**Ask:** Add production app origins to the bucket CORS policy:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://app.aimatrx.com</AllowedOrigin>
    <AllowedOrigin>https://*.vercel.app</AllowedOrigin>
    <AllowedOrigin>http://localhost:3000</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Type</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

**Blocker?** No.

**Current FE workaround:** Every fetch-based previewer routes through
the Python `GET /files/{id}/download` endpoint via the
[useFileBlob](../hooks/useFileBlob.ts) hook — same-origin blob URL,
no CORS preflight. Removing the workaround is a latency / bandwidth
win, not a correctness fix.

---

### 3. 🟡 Resumable / TUS uploads for files larger than 100 MB

**Priority:** Medium (blocks video, large datasets, codebase
imports).

**Context:** Current cap on the buffered path is 100 MB (tier
default; bypass header allows up to 5 GB). User flows that hit this
today: podcast episodes, training video captures, multi-GB datasets.

**Ask:** TUS or S3 multipart upload support — either a presigned
multipart init + complete endpoint, or a full TUS server.

**Blocker?** No.

**Current FE workaround:** Error early with a clear "contact
support for large uploads" message and skip the file.

---

### 4. 🟡 Range download / streaming response on `/files/{id}/download`

**Priority:** Medium (blocks video scrubbing, partial reads).

**Context:** The endpoint currently buffers the whole file into
memory before returning. We need `Range:` header support so video
players can seek and so large-file downloads stream.

**Ask:** Stream the S3 byte stream directly through FastAPI;
implement `Range:` request handling.

**Blocker?** No — small video files work fine.

---

### 5. 🟡 CDN-backed permanent URLs for `visibility="public"` files

**Priority:** Low.

**Context:** Signed S3 URLs cap at 7 days. Anything user-facing
(podcast feed images, public landing imagery, share previews
embedded in third-party sites) needs a permanent URL.

**Ask:** A CDN (CloudFront / Cloudflare) in front of public files
with stable URLs like `https://cdn.aidream.com/<file_id>` that
authenticate via the file's `visibility` flag.

**Blocker?** No.

---

### 6. 🟡 Storage re-keying by `file_id` (not logical path)

**Priority:** Low — architectural cleanup.

**Context:** S3 keys today are `s3://<bucket>/<owner_id>/<file_path>`,
which bakes the logical path into the physical key. Every rename or
bulk move re-copies bytes (or accepts drift between
`cld_files.file_path` and `cld_files.storage_uri`).

**Ask:** Re-key by `file_id` (or `<owner>/<file_id>`). The DB row's
`file_path` becomes the only logical mutable field. Renames become
free; tenant migration becomes a single UPDATE; storage stays
immutable.

**Blocker?** No — current bulk-move shipped works.

---

### 7. 🟡 Confirm `POST /folders` accepts path-style `folder_path`

**Priority:** Low.

**Context:** The FE's `ensureFolderPath` thunk creates intermediate
folders (e.g. "Images/Chat/2026") via supabase-js because no
backend equivalent existed. With `POST /folders` live, we want to
delete that thunk's supabase-js path too.

**Ask:** Confirm `POST /folders` accepts `{ folder_path: "A/B/C" }`
and creates each missing segment atomically (matching upload
auto-create semantics). If not, please add it — the alternative is
the FE sequencing N create calls, which races on concurrent uploads
to the same path.

**Blocker?** No — supabase-js path still works.

---

### 8. 🟡 Confirm realtime publishes `cld_share_links` events

**Priority:** Low.

**Context:** We need share-link UI to update live when the owner
creates / revokes a link from another device. Backend doc lists
`cld_files`, `cld_file_versions`, `cld_file_permissions` as
realtime-published; share-links is unconfirmed.

**Ask:** Confirm publication on `cld_share_links`. If yes, what
filter key (owner? resource_id?) makes sense?

**Blocker?** No — share-link UI re-fetches on focus until this is
confirmed.

---

### 9. 🟡 Thread `X-Request-Id` into realtime echo payloads

**Priority:** Low — quality-of-life.

**Context:** Our client generates a `requestId` for every mutation
and sends it as `X-Request-Id`. The realtime middleware uses it to
dedup echoes of our own writes so optimistic state isn't overwritten
by the server broadcast. If the realtime payload doesn't carry
`request_id`, we fall back to a 2s timestamp-fuzzy match against
recent own writes to the same `file_id` — works but brittle under
clock skew or parallel edits.

**Ask:** When a write is made, include `request_id` in the realtime
payload — either as a dedicated column on the changed row, or
inside `metadata.request_id`. Either works; the second requires no
schema change.

**Blocker?** No — timestamp-fuzzy fallback is shipped.

---

### 10. 🟡 Webhooks / SSE for events beyond Supabase Realtime

**Priority:** Low.

**Context:** Eventually we want third-party integrations
(Slack notify on share, Zapier on upload, etc.). Supabase Realtime
is fine for in-app UI but isn't a webhook system.

**Ask:** A `cld_events` table + worker for periodic batch
processors (lifecycle, search index, audit, webhooks). Audit logs +
webhooks ride on the same event bus.

**Blocker?** No.

---

### 11. 🟠 Per-org tenancy

**Priority:** Deferred — schema columns added, no immediate
business need.

**Context:** Single `owner_id` works for personal Drive. The instant
a customer says "my team needs shared folders" or "we want billing
per-org", the data model needs `organization_id` on every row.
Backend has added the columns but routes are still single-owner.

**Ask:** When the org product lands, populate `organization_id` on
new uploads + add an org-aware variant of `cld_get_user_file_tree`.
Deferred until org product spec lands.

**Blocker?** No.

---

### 12. 🟠 Comments / annotations / file locking

**Priority:** Deferred — collaboration features for a later phase.

---

### 13. 🟠 Antivirus scan on upload

**Priority:** Deferred — compliance feature.

**Context:** S3 → Lambda → ClamAV (or vendor scan) on every upload
that lands in shared folders. For internal-only uploads we can defer.

---

## Resolved items

(Most recent first.)

### 🟢 CORS `Access-Control-Allow-Headers` includes all upload custom headers

**Resolved:** 2026-04-26 (Python).

**What broke:** After the security/CORS lockdown release, the
preflight `Access-Control-Allow-Headers` was missing `Accept`,
`X-Idempotency-Key`, and `X-Cloud-Files-Bypass` (plus several
browser-default headers). Starlette's `CORSMiddleware` only echoes
back what's in `allow_headers`, so the preflight silently rejected
any request whose actual request-header set wasn't a subset. Browser
symptom: every direct (non-proxy) upload returned `xhr.error` after
~30 ms — a cached preflight rejection. Only the same-origin Next.js
`/api/images/upload` proxy worked.

**What shipped:** Python's `aidream/api/app.py` middleware now
allows the full canonical set:
```
Authorization, Content-Type, Accept,
X-Request-Id, X-Guest-Fingerprint, X-Fingerprint-ID,
X-Idempotency-Key, X-Cloud-Files-Bypass,
+ accept-encoding, accept-language, cache-control, pragma,
+ content-length, content-disposition, content-type,
+ if-match, if-modified-since, if-none-match, if-unmodified-since,
+ origin, range, referer, user-agent, x-requested-with,
+ x-correlation-id, x-sandbox-service-token
```
plus `HEAD` added to `allow_methods` and `Last-Modified`,
`Content-Range`, `Accept-Ranges`, `Content-Disposition` to
`expose_headers`.

**FE side:** Re-enabled `X-Idempotency-Key` as the default on every
upload — both in [features/files/upload/cloudUpload.ts](../upload/cloudUpload.ts)
(both `cloudUploadRaw` paths and the dispatch-aware `cloudUpload`)
and in the `uploadFiles` thunk in
[features/files/redux/thunks.ts](../redux/thunks.ts). Each upload
reuses its `requestId` as the idempotency key so any automatic retry
hits the same backend record (stored in
`metadata._idempotency_key`).

---

### 🟢 Folder CRUD endpoints

**Resolved:** 2026-04-26.
**Ship:** `POST /folders`, `PATCH /folders/{id}`,
`DELETE /folders/{id}` are live. FE wired in
[features/files/api/folders.ts](../api/folders.ts) and consumed by
`createFolder`, `updateFolder`, `deleteFolder` thunks. No browser-side
writes to `cld_folders` remain in the upload + folder-CRUD paths.

---

### 🟢 Bulk operations

**Resolved:** 2026-04-26.
**Ship:** `DELETE /files/bulk`, `POST /files/bulk/move`, `POST
/folders/bulk/move`. The wire envelope is `BulkResponse`:
`{ results: BulkResultItem[], succeeded: number, failed: number }`
where each `BulkResultItem = { id, ok, error }`.
**FE side:** [features/files/api/files.ts](../api/files.ts) +
[folders.ts](../api/folders.ts); thunks `bulkDeleteFiles`,
`bulkMoveFiles`, `bulkMoveFolders` consume the envelope with
optimistic local apply + per-item rollback when items report `ok: false`.

---

### 🟢 New endpoints wired (2026-04-26)

| Endpoint | FE consumer |
|---|---|
| `GET /files/usage` | `Files.getStorageUsage` |
| `GET /files/trash` | `Files.listTrash` |
| `POST /files/{id}/restore` | `Files.restoreFile` |
| `GET /files/search` | `Files.searchFiles` |
| `POST /files/{id}/rename` | `Files.renameFile` (drives both rename + single-file move thunks; obsoletes the old metadata-hack patch) |
| `POST /files/{id}/copy` | `Files.copyFile` |

---

### 🟢 Migrate-guest-to-user breaking contract reconciled

**Resolved:** 2026-04-26.
**Change:** Body shape became `{ new_user_id, guest_id? }`,
fingerprint moved to required `X-Guest-Fingerprint` header.
**FE side:** `migrateGuestToUser` thunk + `Files.migrateGuestToUser`
client function rewritten. Dual-name response (`files` +
`files_migrated` etc.) accepted in `MigrateGuestToUserResponse` type.

---

### 🟢 `BulkOperationResponse` → `BulkResponse` reconciled

**Resolved:** 2026-04-26.
**FE side:** Old `{ succeeded: string[], failed: BulkOperationFailure[] }`
shape replaced by `{ results: BulkResultItem[], succeeded: number,
failed: number }`. Bulk thunks updated to iterate `results.filter(r => !r.ok)`
for rollback.

---

### 🟢 Header plumbing: `X-Idempotency-Key`, `X-Cloud-Files-Bypass`

**Resolved:** 2026-04-26.
**FE side:** Both headers added to [features/files/api/client.ts](../api/client.ts)
`RequestOptions`. Upload thunks pass `idempotencyKey: requestId` so
the same key is reused across retries. Bypass is opt-in only.

---

### 🟢 `X-Guest-Fingerprint` header on every request

**Resolved:** 2026-04-26.
**FE side:** `client.ts` reads `getCachedFingerprint()` synchronously
and attaches the header on every request when present. Authed users
also send it for backend correlation. Throws `auth_required` only
when both `Authorization` and fingerprint are missing.

---

### 🟢 PATCH metadata default-merge

**Resolved:** 2026-04-26.
**FE side:** Default behavior matches FE expectation; explicit
`patchFileReplaceMetadata` exposed for the rare overwrite-the-blob case.

---

### 🟢 RLS recursion 42P17 fix (Part 1: file-permissions)

**Resolved:** 2026-04-26 (Python applied migration).

---

### 🟢 RLS recursion 42P17 fix (Part 2: user-group-members)

**Resolved:** 2026-04-26 (Python applied migration).

---

### 🟢 `cld_get_user_file_tree` returns folder rows with `kind` discriminator

**Resolved:** 2026-04-26.
**FE side:** Discriminated union (`CloudTreeFileRow` / `CloudTreeFolderRow`)
already in place; tree converter handles the discriminator.

---

### 🟢 Per-endpoint quotas and rate limits

**Resolved:** 2026-04-26.
**FE side:** Tier-based defaults from the `cld_account_tiers` table.
FE error codes `storage_quota_exceeded`, `daily_uploads_exceeded`,
`rate_limited`, etc. added to `CloudFilesErrorCode`. UI tier badge +
storage indicator wiring is the next FE chunk (not blocking — refresh
shows up-to-date numbers via `GET /files/usage`).

---

## Entry template

When logging a new item, copy-paste:

```md
### N. <emoji> <one-line title>

**Priority:** High | Medium | Low.

**Context:** (What prompted this.)

**Ask:** (Specific deliverable.)

**Blocker?** Yes / No — (what's stalled).

**Current FE workaround:** (What we ship in the meantime.)
```
