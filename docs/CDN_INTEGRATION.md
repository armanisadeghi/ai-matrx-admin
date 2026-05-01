# CDN Integration — Frontend Handoff

**Status**: backend complete + verified end-to-end (May 2026). Awaiting Cloudflare provisioning + frontend rollout.

This doc tells the React team **exactly** what changes on the wire when the
Cloudflare CDN goes live, what stays the same, and the small set of code
changes the frontend needs to make.

---

## TL;DR (read this first)

- The server now decides — per file — whether the URL it returns is a
  long-lived **CDN URL** (for `visibility="public"` files) or a 1-hour
  **AWS-signed URL** (for `visibility="private"` and `"shared"`).
- **You always render the URL the server gave you.** Don't construct
  URLs from `file_id` + your own logic. Don't strip query strings.
  Don't guess based on the filename.
- The server response shape gained two optional fields:
  - `FileRecord.public_url` — `string | null` (canonical CDN URL when
    public, `null` otherwise)
  - `FileUploadResponse.cdn_url` — same thing on the upload response
- The existing `url` field is still authoritative — it's the CDN URL
  for public files, the signed URL for everything else. **If you only
  read `url` and ignore the new fields, your code already works.**
- The new fields exist so you can show a "share this link forever"
  affordance in the UI for public files (no expiry) without showing it
  for private files (which expire after 1h).

---

## What changed on the wire

### 1. Upload response (`POST /files/upload`, `POST /files/finalize-upload`)

**Before:**
```json
{
  "file_id": "abc-...",
  "file_path": "uploads/foo.png",
  "storage_uri": "s3://matrx-user-files/<owner>/uploads/foo.png",
  "version_number": 1,
  "file_size": 1556,
  "checksum": "abc123...",
  "url": "https://matrx-user-files.s3.amazonaws.com/...?X-Amz-Signature=...",
  "is_new": true
}
```

**After (public upload, CDN configured):**
```json
{
  "file_id": "abc-...",
  "file_path": "uploads/foo.png",
  "storage_uri": "s3://cdn.matrxserver.com/<owner>/uploads/foo.png",
  "version_number": 1,
  "file_size": 1556,
  "checksum": "abc123...",
  "url": "https://cdn.matrxserver.com/<owner>/uploads/foo.png?v=abc12345",
  "is_new": true,
  "cdn_url": "https://cdn.matrxserver.com/<owner>/uploads/foo.png?v=abc12345"
}
```

Note: `storage_uri` for public files lives in a dedicated public S3
bucket whose name equals the CDN host. Private/shared keep the
existing `s3://matrx-user-files/<owner>/<path>` layout.

**After (private upload, OR public upload with CDN unset in dev):**
```json
{
  "file_id": "abc-...",
  "file_path": "uploads/foo.png",
  "storage_uri": "s3://matrx-user-files/<owner>/uploads/foo.png",
  "version_number": 1,
  "file_size": 1556,
  "checksum": "abc123...",
  "url": "https://matrx-user-files.s3.amazonaws.com/...?X-Amz-Signature=...",
  "is_new": true,
  "cdn_url": null
}
```

**Rule of thumb**: if `cdn_url !== null` you have a permanent URL. If
`cdn_url === null` the URL in `url` expires.

### 2. File metadata (`GET /files/{id}`, `GET /files`, `GET /files/search`, …)

`FileRecord` gained one field:

```ts
interface FileRecord {
  id: string;
  owner_id: string;
  file_path: string;
  storage_uri: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  checksum: string | null;
  visibility: "public" | "private" | "shared";
  current_version: number;
  // ... existing fields ...
  public_url: string | null;   // ← NEW. CDN URL when public, null otherwise.
}
```

### 3. `GET /files/{id}/url`

Same response shape (`{ url: string, expires_in: number }`). The
difference is what's IN `url`:

- public file + CDN configured → `url` is the CDN URL (no actual
  expiry; `expires_in` is still echoed back as you requested it but
  it's meaningless for the CDN URL — you can ignore it for public).
- private/shared (or CDN unset) → `url` is an AWS-signed URL that
  really does expire after `expires_in` seconds.

### 4. `GET /files/{id}/download`

- public file + CDN configured → `302 Found` redirect to the CDN URL.
  Browsers follow this transparently. `<img src="/files/{id}/download">`
  still works; the browser ends up loading from the CDN.
- private/shared → unchanged. The endpoint streams bytes directly.

### 5. `GET /share/{token}` (resolve a share link)

`ShareLinkResolveResponse.url`:
- file is public → CDN URL (permanent).
- file is private/shared → AWS-signed URL (1h).

### 6. `GET /share/{token}/download`

- public file → 302 to CDN.
- private/shared → streams bytes.

### 7. Cache-busting query string

Public CDN URLs always carry `?v=<8-char-hex>` derived from the file's
SHA-256 checksum. **Do not strip this.** When the file content changes
(a new version is uploaded), the checksum changes, the URL changes,
Cloudflare misses cache, fresh bytes are served. This is how we get
"immediate global invalidation" without an explicit purge call.

If you currently strip query strings somewhere (e.g. for "clean URL
display" in the share-modal), special-case CDN URLs.

---

## What you need to change

### A. Type updates

1. Regenerate `api-types.ts` from the new OpenAPI: `pnpm gen:api`
   (or whatever your existing command is). Confirm:
   - `FileRecord.public_url` exists
   - `FileUploadResponse.cdn_url` exists

### B. Components that render media

These should already work without changes — they read `record.url`
and the server is now choosing the right URL per-file. But review
them anyway and remove any client-side URL construction:

- `<FilePreview>`, `<ImagePreview>`, `<MediaThumbnail>`,
  `<AvatarImage>` → drop any `${API_BASE}/files/${id}/download`
  pattern. Use `record.public_url ?? record.url`.
- Chat-attachment renderers → use `media.url` from the server's
  resolved MediaRef. The boundary normaliser at AI Dream returns the
  canonical URL on every assistant response.
- Any `<a href={…}>` "view file" link → same: use the server URL.

### C. Share-modal UX

When the user opens "Get share link" on a file:

```ts
if (record.visibility === "public" && record.public_url) {
  // Permanent shareable URL. Hide "expires" badge.
  return record.public_url;
}
// Private/shared: keep the existing /share/{token} flow.
```

For public files you can skip creating a share-link token entirely —
the `public_url` IS the share. Tokens still make sense for private/shared
because they grant read-access to a specific user.

### D. Visibility-toggle UX

When the user flips a file from private → public (or back) via the
visibility settings:

1. Send `PATCH /files/{id}` with `{"visibility":"public"}`.
2. The response is the **updated `FileRecord`** with the new
   `public_url` (or `null` if going private), updated `storage_uri`
   (different bucket now), and updated `visibility`.
3. **Refresh any cached URL state for this file**: file list, image
   tags showing the file, etc. The previous URL shape may have been
   AWS-signed — it's now a permanent CDN URL (or vice-versa).

The S3 object physically moves between buckets when visibility
flips (private bucket ↔ public bucket). The previous URL becomes a
404 within seconds. The server also fire-and-forgets a Cloudflare
cache purge for the old URL, so a stale `<img>` somewhere in the DOM
that's still pointing at the old URL will start failing fast — show
a re-render, don't try to recover from a 404 with the old URL.

**Failure mode if you skip the re-fetch**: an `<img src="…">` whose
`src` was set BEFORE the toggle keeps the old URL in the DOM. After
public→private the cache is purged and the URL 404s. Browsers show
the broken-image icon. Solution: subscribe to the patch response and
re-render with the new `public_url`/`url` fields.

### Delete UX

When the user deletes a file, the server purges the CDN cache for
that file's URL automatically. Any `<img>` still pointing at the
deleted file's CDN URL will start 404'ing within seconds (not the
full 1-year edge TTL). Re-fetch your file list after a successful
delete to drop the entry from the UI.

### E. Things you should NOT do

- ❌ Don't construct CDN URLs from `file_id` or `file_path`.
- ❌ Don't strip `?v=…` query strings — they're cache-busters.
- ❌ Don't cache `getSignedUrl()` results in IndexedDB / localStorage.
  Signed URLs expire. Always read the latest from the API response.
- ❌ Don't infer "is this CDN" by string-matching the URL — read
  `record.public_url` (presence = CDN-eligible) or `record.cdn_url`
  on uploads.
- ❌ Don't block on visibility-toggle UI feedback. The PATCH does an
  S3 server-side copy; it's fast (~100ms) but not instant. Show a
  loading state, await the response, then re-render with the new
  URLs.

---

## How public/private propagates through chat & AI requests

(This is mostly a backend concern but worth knowing.)

When a user sends a chat message with an attachment, the FE puts a
`MediaRef` in the message content:

```jsonc
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Describe this" },
    { "type": "image", "file_id": "abc-..." }       // canonical
    // OR
    { "type": "image", "url": "https://cdn.matrxserver.com/..." }  // also fine
  ]
}
```

The backend's boundary normaliser recognises both shapes and resolves
to bytes before the LLM provider ever sees the message. Public CDN
URLs are recognised the same way `https://www.aimatrx.com/share/<token>`
URLs are.

**FE rule**: prefer `file_id` (the canonical form). If you only have a
URL, send `url`. Don't send both.

---

## Rollout plan (for awareness — not your work)

1. **Phase 1 — provisioning** (in progress): Cloudflare DNS + Origin
   Rule + cache rules; AWS bucket policy for `public/*`. The browser
   agent is doing this.
2. **Phase 2 — backend deploy** (ready): the Python changes are
   merged and verified. Server reads `CDN_PUBLIC_BASE_URL` from env.
   When unset, behaviour is identical to today (everything → AWS-signed).
3. **Phase 3 — flip env var** (ops): set `CDN_PUBLIC_BASE_URL=https://cdn.matrxserver.com`
   in production. New uploads with `visibility=public` immediately go
   to the new prefix; existing public files keep working until step 4.
4. **Phase 4 — backfill**: run `scripts/migrate_public_files_to_cdn_prefix.py`
   to move any existing `visibility=public` files into the `public/`
   prefix. Server-side S3 copies, no downtime, idempotent.
5. **Phase 5 — frontend deploy** (this doc): regen types, ship the
   tiny UI changes above. **The FE works fine before this step too**
   — `record.url` does the right thing automatically; the new fields
   just enable nicer UX.

---

## Reference: full server-side architecture

(For the curious — none of this affects FE code, but it explains why
things behave the way they do.)

- **Cloudflare** sits in front of a dedicated public S3 bucket whose
  name equals the CDN host (e.g. `cdn.matrxserver.com`). The Cloudflare
  CNAME points at the regional path-style endpoint
  (`s3.us-east-2.amazonaws.com`) so the original Host header passes
  through and S3 routes by bucket name. No Origin Rule needed (the
  rewrite-Host feature is Cloudflare Enterprise-only).
- **Bucket policy** allows `s3:GetObject` to `Principal: "*"` on the
  ENTIRE public bucket. The default bucket (`matrx-user-files`) stays
  100% private with Block Public Access fully ON. Hard separation by
  bucket — auditable in one screen.
- **Cache-busting**: every CDN URL ends with `?v=<checksum[:8]>`. CF
  cache key includes the full query string, so a content change → new
  checksum → new URL → cache miss → fresh bytes. No purge call needed.
- **Explicit purge**: on visibility flips and deletes, the server
  fire-and-forgets a `POST https://api.cloudflare.com/.../purge_cache`
  to drop any stale entries. Best-effort; never blocks the request.
- **Boundary normaliser**: when the FE sends a CDN URL inside a chat
  request, the server walks the parsed body, sees `cdn.matrxserver.com`
  as one of our hosts, looks up the underlying `cld_files` row by
  `storage_uri = s3://cdn.matrxserver.com/<key>` (the public bucket),
  and resolves to bytes from S3 (or the in-memory byte cache). Never
  re-fetches via HTTP. Idempotent.
- **External URLs** (any URL not on our hosts) are pre-fetched into
  base64 by the boundary normaliser using `httpx.AsyncClient`. So by
  the time a provider serializer (`to_google()`, `to_openai()`, …)
  runs, every media item has either `base64_data` or `file_uri` set.
  Provider methods never do I/O.

---

## Questions / contact

Backend changes live in:
- `/aidream/api/routers/files.py` — routes
- `/aidream/api/utils/cdn_purge.py` — Cloudflare purge client
- `/aidream/api/config.py` — settings (`cdn_public_base_url`,
  `cloudflare_api_token`, `cloudflare_zone_id`)
- `/packages/matrx-utils/matrx_utils/file_handling/cloud_sync/cdn.py`
  — `public_url_for(record)` is the single source of truth for "should
  this file get a CDN URL?"
- `/packages/matrx-utils/matrx_utils/file_handling/cloud_sync/sync_engine.py`
  — `change_visibility_async` for the visibility-flip flow
- `/scripts/migrate_public_files_to_cdn_prefix.py` — backfill script
