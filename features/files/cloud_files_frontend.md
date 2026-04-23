# Cloud Files — React Integration Guide

This is the canonical reference for integrating the new cloud file management
system into the React frontend. It replaces all previous direct uses of
`supabase.storage.from(...)` for user-owned files.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Before you start](#2-before-you-start)
3. [Realtime — not optional](#3-realtime--not-optional)
4. [Reading via supabase-js](#4-reading-via-supabase-js)
5. [Mutations via the backend API](#5-mutations-via-the-backend-api)
6. [Endpoint reference](#6-endpoint-reference)
7. [TypeScript types](#7-typescript-types)
8. [Share links](#8-share-links)
9. [Signed URLs](#9-signed-urls)
10. [Migration recipes](#10-migration-recipes)
11. [Error codes](#11-error-codes)
12. [Quick checklist](#12-quick-checklist)

---

## 1. Architecture overview

```
          ┌────────────────────────────────┐
          │           React (SPA)          │
          │                                │
          │   reads  ─┐            ┌─ writes
          │           │            │
          └───────────┼────────────┼───────┘
                      │            │
                      ▼            ▼
        ┌─────────────────┐   ┌──────────────┐
        │  supabase-js    │   │ AIDream API  │
        │  (RLS enforced) │   │ /files/* …   │
        └────────┬────────┘   └──────┬───────┘
                 │                   │
                 ▼                   ▼
        ┌─────────────────┐   ┌──────────────┐
        │ Supabase        │◄──│   S3 bucket  │
        │ Postgres (RLS)  │   │ (private)    │
        │  cloud_files    │   └──────────────┘
        │  cloud_folders  │
        │  cloud_versions │
        │  cloud_perms    │
        │  cloud_shares   │
        │  cloud_groups   │
        └─────────────────┘
```

**Division of responsibility**

| Concern | Who handles it |
|---|---|
| Auth / user identity | JWT from Supabase — backend reads `user_id` from the request context |
| File bytes (S3) | **Backend only** — React never touches S3 directly |
| Metadata reads (lists, tree, versions, permissions) | **supabase-js** — RLS auto-filters to what the user can see |
| Writes, permission changes, version restores, share-link creation | **Backend API** — enforces admin/write/read checks |
| Realtime updates | **supabase-js** — subscribe to `cloud_files` / `cloud_file_versions` |

> **Rule of thumb:** If it needs to mutate state or return file bytes, hit the backend. Otherwise read directly from Supabase.

---

## 2. Before you start

### Backend env

Ensure the backend is configured with:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=<service-role key>
AWS_S3_DEFAULT_BUCKET=<bucket name>
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
```

On startup you'll see:

```
[FastAPI lifespan] Cloud sync: configured (bucket=<name>)
```

### Frontend env

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>   # NOT the service-role key
VITE_AIDREAM_API_URL=https://api.aidream…
```

### Supabase client init

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

When the user signs in, their JWT flows to both supabase-js (for RLS-filtered reads) and the backend `Authorization: Bearer <jwt>` header (for writes).

---

## 3. Realtime — not optional

Because mutations happen on the backend but reads go through supabase-js, **the client will not see updates unless it subscribes to realtime**. This is the single most important architectural detail in this integration.

Subscribe once per authenticated session:

```ts
useEffect(() => {
  if (!user?.id) return;

  const channel = supabase.channel(`files:${user.id}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cloud_files',
        filter: `owner_id=eq.${user.id}` },
      (payload) => dispatch(cloudFileChanged(payload)))
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cloud_file_versions' },
      (payload) => dispatch(cloudVersionChanged(payload)))
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cloud_file_permissions',
        filter: `grantee_id=eq.${user.id}` },
      (payload) => dispatch(cloudPermissionChanged(payload)))
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [user?.id]);
```

If you skip this step, React will show stale data after any backend mutation until the user manually refreshes.

### Alternative: refetch-on-mutation

If you prefer not to use realtime, you MUST refetch affected queries (e.g. via TanStack Query invalidation) after every API call that mutates. Realtime is the recommended path because it also handles mutations from other devices / share-link visitors.

---

## 4. Reading via supabase-js

All read paths below are RLS-filtered — the user only sees files they own, files shared with them, and files marked public.

### 4.1 List all files

```ts
const { data, error } = await supabase
  .from('cloud_files')
  .select('*')
  .is('deleted_at', null)
  .order('file_path');
```

### 4.2 Full tree (sidebar / explorer)

Use the RPC — single round-trip, includes effective permission for each row:

```ts
const { data, error } = await supabase
  .rpc('cloud_get_user_file_tree', { p_user_id: user.id });
// data: Array<{ id, file_path, visibility, effective_permission, … }>
```

### 4.3 Files in a folder

Look up the folder row first, then filter files by `parent_folder_id`:

```ts
const { data: folder } = await supabase
  .from('cloud_folders')
  .select('id')
  .eq('folder_path', 'reports/2026')
  .single();

const { data: files } = await supabase
  .from('cloud_files')
  .select('*')
  .eq('parent_folder_id', folder?.id);
```

### 4.4 Version history

```ts
const { data } = await supabase
  .from('cloud_file_versions')
  .select('*')
  .eq('file_id', fileId)
  .order('version_number', { ascending: false });
```

### 4.5 Single file by id

```ts
const { data } = await supabase
  .from('cloud_files')
  .select('*')
  .eq('id', fileId)
  .single();
```

### 4.6 Permissions visible to the user

```ts
const { data } = await supabase
  .from('cloud_file_permissions')
  .select('*')
  .eq('resource_id', fileId)
  .eq('resource_type', 'file');
```

---

## 5. Mutations via the backend API

All mutating endpoints require `Authorization: Bearer <jwt>`. Prefer creating a typed API client (see section 7).

```ts
const api = (path: string, init: RequestInit = {}) => fetch(
  `${import.meta.env.VITE_AIDREAM_API_URL}${path}`,
  {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers ?? {}),
    },
  }
).then(async (r) => {
  if (!r.ok) throw new ApiError(r.status, await r.json());
  return r.json();
});
```

### 5.1 Upload a file

```ts
const form = new FormData();
form.append('file', blob);                // File/Blob
form.append('file_path', 'reports/q1.json');
form.append('visibility', 'private');     // public | private | shared
// Optional:
form.append('share_with', 'uid1,uid2');   // comma-separated user ids
form.append('share_level', 'read');
form.append('change_summary', 'Q1 revision 3');
form.append('metadata_json', JSON.stringify({ quarter: 'q1', year: 2026 }));

const res = await api('/files/upload', { method: 'POST', body: form });
// { file_id, file_path, storage_uri, version_number, file_size, checksum, url, is_new }
```

Limit is **100 MB** per upload. Uploads over the limit return `413 Request Entity Too Large`.

### 5.2 Download a file

Two options:

```ts
// Streaming response — use when you need the bytes immediately
const r = await fetch(`${API}/files/${fileId}/download`, { headers });
const blob = await r.blob();

// Signed URL — use for <img>, <video>, etc.
const { url } = await api(`/files/${fileId}/url?expires_in=3600`);
<img src={url} />
```

### 5.3 Update metadata / visibility only

```ts
await api(`/files/${fileId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ visibility: 'public', metadata: { tag: 'v2' } }),
});
```

### 5.4 Delete

```ts
// Soft delete — flips deleted_at, bytes stay in S3
await api(`/files/${fileId}`, { method: 'DELETE' });

// Hard delete — removes bytes from S3 too
await api(`/files/${fileId}?hard_delete=true`, { method: 'DELETE' });
```

### 5.5 Grant / revoke permissions

```ts
// Grant
await api(`/files/${fileId}/permissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ grantee_id: userId, level: 'read' }),
});

// Revoke
await api(`/files/${fileId}/permissions/${userId}?grantee_type=user`, { method: 'DELETE' });
```

### 5.6 Versions

```ts
// Restore version N as current (creates new version pointing at N's bytes)
await api(`/files/${fileId}/versions/${n}/restore`, { method: 'POST' });

// Download a specific version
const r = await fetch(`${API}/files/${fileId}/versions/${n}/download`, { headers });
```

---

## 6. Endpoint reference

### Files (auth required)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/files/upload` | Multipart upload. Form: `file`, `file_path`, `visibility`, `share_with`, `share_level`, `change_summary`, `metadata_json` |
| `GET` | `/files` | Query `?folder_path=` — list files |
| `GET` | `/files/tree` | RPC: full tree w/ effective permission |
| `GET` | `/files/folders` | Query `?parent_path=` — list folders |
| `GET` | `/files/by-path/{file_path}` | Look up by logical path |
| `GET` | `/files/{file_id}` | File metadata |
| `PATCH` | `/files/{file_id}` | Body `{visibility?, metadata?}` — metadata-only update |
| `DELETE` | `/files/{file_id}` | Query `?hard_delete=true|false` |
| `GET` | `/files/{file_id}/download` | Stream bytes; optional `?version=N` |
| `GET` | `/files/{file_id}/url` | `?expires_in=3600` — signed URL (60s–7d) |

### Versions (auth required)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/files/{file_id}/versions` | List |
| `GET` | `/files/{file_id}/versions/{n}` | Metadata |
| `GET` | `/files/{file_id}/versions/{n}/download` | Bytes |
| `POST` | `/files/{file_id}/versions/{n}/restore` | Restore as current |

### Permissions (auth required, admin on resource)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/files/{file_id}/permissions` | List |
| `POST` | `/files/{file_id}/permissions` | Grant `{grantee_id, level, grantee_type?, expires_at?}` |
| `DELETE` | `/files/{file_id}/permissions/{grantee_id}?grantee_type=user` | Revoke |
| `GET` | `/folders/{folder_id}/permissions` | Same as files, but for folders (cascades) |
| `POST` | `/folders/{folder_id}/permissions` | ↑ |
| `DELETE` | `/folders/{folder_id}/permissions/{grantee_id}` | ↑ |

### Share links (auth required, admin on resource)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/files/{file_id}/share-links` | List active |
| `POST` | `/files/{file_id}/share-links` | Create `{permission_level, expires_at?, max_uses?}` |
| `GET` | `/folders/{folder_id}/share-links` | Same for folders |
| `POST` | `/folders/{folder_id}/share-links` | ↑ |
| `DELETE` | `/files/share-links/{share_token}` | Deactivate |

### Groups (auth required)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/files/groups` | Groups the user owns or belongs to |
| `POST` | `/files/groups` | Body `{name}` |
| `GET` | `/files/groups/{group_id}/members` | — |
| `POST` | `/files/groups/{group_id}/members` | Body `{user_id, role}` |
| `DELETE` | `/files/groups/{group_id}/members/{user_id}` | — |

### Public (no auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/share/{share_token}` | Resolve to file metadata + 1h signed URL |
| `GET` | `/share/{share_token}/download` | Stream bytes directly |

Full interactive docs at `/docs` (Swagger UI) on the backend.

---

## 7. TypeScript types

Copy these into `src/types/cloudFiles.ts` (or generate them with `supabase gen types typescript > src/types/database.ts` and alias).

```ts
export type Visibility = 'public' | 'private' | 'shared';
export type PermissionLevel = 'read' | 'write' | 'admin';
export type ResourceType = 'file' | 'folder';
export type GranteeType = 'user' | 'group';

export interface CloudFile {
  id: string;
  owner_id: string;
  file_path: string;
  storage_uri: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  checksum: string | null;
  visibility: Visibility;
  current_version: number;
  parent_folder_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface FileUploadResponse {
  file_id: string;
  file_path: string;
  storage_uri: string;
  version_number: number;
  file_size: number | null;
  checksum: string | null;
  url: string | null;
  is_new: boolean;
}

export interface CloudFileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_uri: string;
  file_size: number | null;
  checksum: string | null;
  created_by: string | null;
  created_at: string | null;
  change_summary: string | null;
}

export interface CloudFilePermission {
  id: string;
  resource_id: string;
  resource_type: ResourceType;
  grantee_id: string;
  grantee_type: GranteeType;
  permission_level: PermissionLevel;
  granted_by: string | null;
  granted_at: string | null;
  expires_at: string | null;
}

export interface CloudShareLink {
  id: string;
  resource_id: string;
  resource_type: ResourceType;
  share_token: string;
  permission_level: 'read' | 'write';
  created_by: string | null;
  created_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
}

export interface ShareLinkResolveResponse {
  share_token: string;
  resource_type: ResourceType;
  resource_id: string;
  permission_level: 'read' | 'write';
  file: CloudFile | null;
  url: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
}
```

---

## 8. Share links

### Create

```ts
const link = await api(`/files/${fileId}/share-links`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    permission_level: 'read',
    max_uses: 20,
    expires_at: '2026-12-31T23:59:59Z',
  }),
});
// link.share_token → build URL: https://app.aidream.com/share/${link.share_token}
```

### Resolve (public, no auth)

```ts
const info = await fetch(
  `${import.meta.env.VITE_AIDREAM_API_URL}/share/${token}`
).then(r => r.ok ? r.json() : Promise.reject(r.status));
// info.file        → metadata
// info.url         → 1h signed URL to the bytes
// info.use_count, info.max_uses, info.expires_at
```

### Deactivate (owner/admin only, auth required)

```ts
await api(`/files/share-links/${token}`, { method: 'DELETE' });
```

### Inbound share routes

For `/share/:token` in the React router, the page should:

1. `GET /share/{token}` → show file metadata.
2. On "Download", hit `/share/{token}/download` (no auth needed) or use `info.url`.
3. Show remaining uses if `max_uses` is set: `max_uses - use_count`.

---

## 9. Signed URLs

- URLs returned by `POST /files/upload` and `GET /files/{file_id}/url` are S3 V4 presigned URLs.
- Min expiry: 60 seconds. Max expiry: 7 days (604800 s).
- URLs ARE safe to put in `<img src>` and `<video src>` — no additional auth header needed.
- Cache them in state, but **refetch if you detect a 403/expired response**. A small helper:

```ts
async function freshenIfExpired(current: string | null, fileId: string, expiresIn = 3600) {
  if (!current) return getFileUrl(fileId, expiresIn);
  const r = await fetch(current, { method: 'HEAD' });
  if (r.status === 403 || r.status === 404) return getFileUrl(fileId, expiresIn);
  return current;
}

const getFileUrl = (fileId: string, expiresIn = 3600) =>
  api(`/files/${fileId}/url?expires_in=${expiresIn}`).then(r => r.url);
```

For Redux / TanStack Query: wrap the URL in a selector that checks the expiry timestamp you stored alongside it and re-fetches when you've crossed it.

---

## 10. Migration recipes

### Replace `supabase.storage.upload(...)`

Before:

```ts
const { data, error } = await supabase.storage
  .from('user-files')
  .upload(`${userId}/reports/q1.json`, file);
```

After:

```ts
const form = new FormData();
form.append('file', file);
form.append('file_path', 'reports/q1.json');  // logical path, no user prefix
form.append('visibility', 'private');

const result = await api('/files/upload', { method: 'POST', body: form });
// result.file_id is now available — store it for future ops
```

Notes:
- You no longer prefix with `userId/` — the backend does it for you.
- `file_path` is **logical** and what the user sees; it's what the permission system indexes.
- The returned `file_id` is the stable identifier for all future ops (download, versions, permissions). Keep it, not the path.

### Replace `supabase.storage.download(...)`

Before:

```ts
const { data } = await supabase.storage
  .from('user-files')
  .download(`${userId}/reports/q1.json`);
```

After:

```ts
// If you have file_id:
const blob = await fetch(`${API}/files/${fileId}/download`, { headers }).then(r => r.blob());

// If you only have the path:
const { id } = await api(`/files/by-path/${encodeURIComponent('reports/q1.json')}`);
const blob = await fetch(`${API}/files/${id}/download`, { headers }).then(r => r.blob());
```

### Replace `supabase.storage.createSignedUrl(...)`

Before:

```ts
const { data } = await supabase.storage
  .from('user-files')
  .createSignedUrl(`${userId}/reports/q1.json`, 3600);
const url = data.signedUrl;
```

After:

```ts
const { url } = await api(`/files/${fileId}/url?expires_in=3600`);
```

### Replace `supabase.storage.remove(...)`

Before:

```ts
await supabase.storage.from('user-files').remove([`${userId}/reports/q1.json`]);
```

After:

```ts
// Soft delete (preserves bytes — recoverable from cloud_file_versions)
await api(`/files/${fileId}`, { method: 'DELETE' });

// Hard delete
await api(`/files/${fileId}?hard_delete=true`, { method: 'DELETE' });
```

---

## 11. Error codes

All errors come back in the AIDream `APIError` envelope:

```json
{ "error": "<code>", "message": "<human-readable>", "request_id": "…" }
```

| Status | Code | Meaning | Action |
|---|---|---|---|
| 400 | `invalid_request` | Bad parameters | Validate client-side, don't retry blindly |
| 400 | `invalid_metadata` | `metadata_json` didn't decode to an object | Fix and retry |
| 401 | `auth_required` | Missing/invalid JWT | Redirect to sign-in |
| 403 | `permission_denied` | User lacks required level | Don't retry |
| 404 | `not_found` | File, version, or path doesn't exist | Refetch listing |
| 404 | `share_link_invalid` | Token expired, exhausted, or deactivated | Show "link no longer valid" |
| 413 | `file_too_large` | Exceeds 100 MB upload cap | Use a different flow (or ask for streaming upload) |
| 500 | `internal` | Server error — logged with `request_id` | Report `request_id` if persistent |
| 503 | `cloud_sync_unavailable` | Backend isn't configured for cloud sync | Backend issue, not a client one |

---

## 12. Quick checklist

When wiring a new feature, confirm you've:

- [ ] Got a valid Supabase JWT on both `supabase-js` and `Authorization: Bearer …`.
- [ ] Subscribed to `cloud_files` realtime (or set up query invalidation).
- [ ] Used `file_id` (not `file_path`) as the stable identifier.
- [ ] Caught `403` + `404` distinctly from `500`.
- [ ] Refetched signed URLs before they expire.
- [ ] Scoped `visibility` correctly — `private` by default.
- [ ] Not used the service-role key in client code.
