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
