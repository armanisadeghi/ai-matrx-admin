# Cloud Files — Python Team Communications

Live ledger of questions, feature requests, and backend-side asks. Every interaction with the Python team is logged here with a date, status, and resolution.

**Owners:** Frontend files migration team.
**Python-side contact:** (TBD — add Slack handle here.)
**Backend contract:** [cloud_files_frontend.md](cloud_files_frontend.md) — the Python team's canonical doc. Do not edit.

---

## Status legend

- **🟡 awaiting** — asked, no answer yet.
- **🟢 resolved** — answered or shipped; include outcome.
- **🔴 blocked** — we can't proceed on our side without this.
- **🟠 deferred** — not blocking; on their backlog.

---

## Open items

### 2026-04-24 — Q: CORS on `/health` and the rest of `/files/*` for browser dev?

**Status:** 🟡 awaiting.
**Context:** We just shipped a diagnostic harness at `/ssr/demos/cloud-files-debug` that fires every cloud-files endpoint from the browser so devs can see exactly where the pipeline breaks. With the admin server-toggle set to `localhost`, the page POSTs to `http://localhost:8000/files/upload`. We need confirmation that:
  1. `/health` accepts unauthenticated GETs from `Origin: http://localhost:3000` (and our deployed origins).
  2. The full `/files/*` API permits the browser's preflight `OPTIONS` for `Authorization`, `Content-Type`, `X-Request-Id`.
**Ask:** Confirm CORS allowlist; if it's environment-conditional, document the rule.
**Blocker?** No, but a missing `Access-Control-Allow-*` will produce confusing "Network error" rows in the diagnostic log instead of a clear 4xx.

---

### 2026-04-24 — Req: Server-side respect of dev backend overrides

**Status:** 🟠 deferred — internal frontend follow-up first.
**Priority:** Low.
**Context:** [features/files/api/server-client.ts](api/server-client.ts) (used by App Router route handlers like `/api/agent-apps/generate-favicon` and `/api/images/upload`) resolves the backend URL from `BACKEND_URLS.production` only — server contexts have no Redux store to read the active environment from. In production this is fine. In local dev, server-side cloud-files calls always hit prod even when the developer flipped the admin toggle to localhost.
**Ask:** None of the Python team — this is an FE plumbing item we'll solve on our side (likely by reading a `Cookie: matrx_active_server` set by the admin toggle and parsed in `createServerContext`). Logged here so it doesn't get lost.

---

### 2026-04-23 — Q: Table naming discrepancy between doc and DB

**Status:** 🟡 awaiting.
**Context:** [cloud_files_frontend.md §3](cloud_files_frontend.md) example subscribes to tables named `cloud_file_versions`, `cloud_file_permissions`. That matches the DB. But the doc elsewhere mentions `cloud_file_share_links` and `cloud_file_groups` — the actual DB tables are `cloud_share_links` and `cloud_user_groups` / `cloud_user_group_members`. There's also a `cloud_get_effective_permission` RPC that's undocumented.
**Ask:** Confirm canonical table names and update the doc. Or confirm the DB was renamed and the doc hasn't caught up.
**Blocker?** No — we'll code against the actual DB names (`cloud_share_links`, `cloud_user_groups`, `cloud_user_group_members`) and add a comment explaining the doc mismatch.

---

### 2026-04-23 — Q: Shape of `cloud_get_user_file_tree` return

**Status:** 🟡 awaiting.
**Context:** The Supabase-generated type for the RPC return is `Json` (opaque). We need the exact row shape to type it client-side. The doc §4.2 mentions `{ id, file_path, visibility, effective_permission, ... }` but that's prose.
**Ask:** Provide the full shape — ideally add it to the OpenAPI schema so `api-types.ts` picks it up. Include whether folder rows are returned alongside file rows (see next item).
**Blocker?** Soft — we'll hand-type a tolerant reader in [features/files/types.ts](types.ts) and flag any runtime mismatches.

---

### 2026-04-23 — Q: Does `cloud_get_user_file_tree` return folder rows?

**Status:** 🟡 awaiting.
**Context:** We need to render the full hierarchy (folders + files). The backend doc §4.2 only documents file rows in the RPC return.
**Ask:** Either the RPC returns folder rows too (with a discriminator column `node_type: 'file' | 'folder'`), or add a companion RPC `cloud_get_user_folder_tree(p_user_id)` returning folders with parent/child refs.
**Blocker?** Soft — we can paginate folder fetches as a fallback, but a single-RPC tree is strongly preferred for initial render perf.

---

### 2026-04-23 — Q: Does realtime publish `cloud_file_share_links` events?

**Status:** 🟡 awaiting.
**Context:** Backend doc §3 example subscribes to `cloud_files`, `cloud_file_versions`, and `cloud_file_permissions` only. We want share-link UI to update live when the owner creates/revokes from another device.
**Ask:** Confirm publication on `cloud_file_share_links`. If yes, what filter key (owner? resource_id?) makes sense?
**Blocker?** No — share-link UI will re-fetch on focus until this is confirmed.

---

### 2026-04-23 — Q: Per-endpoint rate limits and concurrent-upload ceilings?

**Status:** 🟡 awaiting.
**Context:** We parallelize uploads with concurrency 3 by default. Need to know if that's safe or if we should back off.
**Ask:** Rate limits (req/s) per endpoint. Max concurrent `/files/upload` per user.
**Blocker?** No — default concurrency 3 is conservative.

---

### 2026-04-23 — Req: Thread `X-Request-Id` into realtime echo payloads

**Status:** 🟡 awaiting.
**Priority:** High — drives optimistic-UI stability.
**Context:** Our client generates a `requestId` for every mutation and sends it as `X-Request-Id`. The realtime middleware uses it to dedup echoes of our own writes so optimistic state isn't overwritten by the server broadcast.
**Ask:** When a write is made, include `request_id` in the realtime payload — either as a dedicated column on the changed row, or inside `metadata.request_id`. Either works; the second requires no schema change.
**Fallback we'll ship if unsupported:** Timestamp-fuzzy dedup within 2s of a recent own write to the same `file_id`. Works but brittle under clock skew or parallel edits.

---

### 2026-04-23 — Req: Chunked / resumable uploads >100MB

**Status:** 🟡 awaiting, no ETA.
**Priority:** Medium — blocks video files, large datasets, full-codebase imports.
**Context:** Current cap is 100MB (§5.1, 413 beyond). Use cases from users: podcast episodes, training video captures, multi-GB datasets.
**Ask:** TUS or S3 multipart upload support. Give us either (a) a presigned multipart init + complete endpoint, or (b) a full TUS server.
**Workaround:** We'll error early with a clear "contact support for large uploads" message and skip the file.

---

### 2026-04-23 — Req: Folder CRUD endpoints

**Status:** 🟡 awaiting.
**Priority:** Medium.
**Context:** The REST contract exposes no folder-create, folder-rename, or folder-delete endpoints. Clients that need "new folder" / "move folder" / "delete folder" currently write directly to `cld_folders` via supabase-js (RLS allows it). That works but skips any server-side validation you might want (quotas, name normalization, cascading permission updates).
**Ask:** Provide `POST /folders`, `PATCH /folders/:id`, `DELETE /folders/:id` with a body similar to `FilePatchRequest`. If you'd prefer to keep folders client-managed via RLS, confirm that's the intended design and we'll formalize the client-side path.
**Workaround:** We already ship `createFolder` / `deleteFolder` / `ensureFolderPath` thunks that hit `cld_folders` directly. If/when the REST endpoints exist, only the thunk internals change — callers are unaffected.

---

### 2026-04-23 — Req: Bulk operations

**Status:** 🟡 awaiting.
**Priority:** Medium — drives Dropbox/Drive-level UX.
**Context:** Today we have single-file move/delete. Users routinely multi-select 50+ files.
**Ask:**
- `DELETE /files/bulk` with body `{ file_ids: string[], hard_delete?: boolean }`.
- `POST /files/bulk/move` with body `{ file_ids: string[], new_parent_folder_id: string | null }`.
- `POST /folders/bulk/move` likewise.
**Workaround:** We'll issue parallel per-file calls (concurrency-limited) until available.

---

## Resolved items

*(none yet)*

---

### 2026-04-26 — Req: S3 bucket CORS for browser `fetch()` of signed URLs

**Status:** 🟠 deferred — frontend has a clean workaround.
**Priority:** Medium (DX / latency, not a user-facing breakage).
**Context:** Signed URLs returned by `GET /files/{id}/url` work
fine for HTML elements that don't trigger CORS (`<img>`, `<video>`,
`<audio>`, `<iframe>`, anchor navigation). They **fail with HTTP 403
Forbidden** when the browser does `fetch(signedUrl)` because the
`matrx-user-files` bucket policy doesn't allow our origin in CORS,
so the preflight is rejected. This was breaking PDF / Markdown /
Code / Text / Data previews, all of which need to read bytes via
`fetch()` (or pdfjs's worker, which uses fetch under the hood).
**Workaround in production now:** every fetch-based previewer routes
through the Python `/files/{id}/download` endpoint via the new
`useFileBlob` hook. The endpoint streams the bytes through FastAPI
(which already has correct CORS) and we hand the previewer a
`blob:` URL.
**Ask:** Add the production app origins to the bucket CORS policy
so direct signed-URL fetch works too. Suggested policy in
[ARCHITECTURE_FLAWS.md item P-8](ARCHITECTURE_FLAWS.md#p-8).
**Blocker?** No — workaround is shipped and stable. Removing the
extra Python round-trip is a latency / bandwidth win, not a
correctness fix.

---

### 2026-04-26 — Req: Confirm bulk + folder CRUD wire formats

**Status:** 🟢 partially resolved — endpoints accepted by FE; field
names assumed.
**Priority:** Low.
**Context:** Per the Python team's last status report, P-6 (folder
CRUD) and P-7 (bulk operations) shipped. We've wired the FE assuming
these wire formats:
- `POST /folders` body: `{ folder_path? | folder_name + parent_id?, visibility?, metadata? }`
- `PATCH /folders/{id}` body: `{ folder_name?, parent_id?, visibility?, metadata? }`
- `DELETE /folders/{id}?hard_delete=true`
- `DELETE /files/bulk` body: `{ file_ids: string[], hard_delete?: boolean }`
- `POST /files/bulk/move` body: `{ file_ids: string[], new_parent_folder_id: string | null }`
- `POST /folders/bulk/move` body: `{ folder_ids: string[], new_parent_id: string | null }`
- `POST /files/migrate-guest-to-user` body: `{ guest_fingerprint: string, dry_run?: boolean }`
- Bulk response envelope: `{ succeeded: string[], failed: { id, code, message }[] }`
**Ask:** Confirm field names match exactly (snake_case spelled
above). Update `cloud_files_frontend.md` §6 with these shapes so
future agents don't have to reverse-engineer them.
**Workaround:** FE renames at the boundary if anything differs;
small fix.

---

### 2026-04-26 — Req: `POST /folders` should accept path-style `folder_path`

**Status:** 🟡 awaiting confirmation.
**Priority:** Low.
**Context:** The FE's `ensureFolderPath` thunk creates intermediate
folders (e.g. "Images/Chat/2026") via supabase-js because no
backend equivalent existed. Now that `POST /folders` is live, we
want to delete that thunk's supabase-js path too.
**Ask:** Confirm `POST /folders` accepts `{ folder_path: "A/B/C" }`
and creates each missing segment atomically (matching the upload
auto-create semantics). If not, please add it — the alternative is
the FE sequencing N create calls, which races on concurrent
uploads to the same path.

---

## Entry template

When logging a new item, copy-paste:

```md
### YYYY-MM-DD — Q/Req: <short title>

**Status:** 🟡 awaiting | 🟢 resolved | 🔴 blocked | 🟠 deferred.
**Priority:** High | Medium | Low (for Req only).
**Context:** (What prompted this.)
**Ask:** (Specific deliverable from their side.)
**Blocker?** Yes/No — (what blocks on our side).
**Workaround:** (What we'll do in the meantime.)
**Resolution:** (Fill in when 🟢. Include date, outcome, and what we changed on our side.)
```
