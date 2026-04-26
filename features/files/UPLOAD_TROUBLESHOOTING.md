# File Upload Troubleshooting

> If uploads fail in the app, this is the playbook.

---

## What broke (and what got fixed)

The Phase 11 cloud-files migration introduced a subtle but devastating
issue: every layer in the upload chain was **swallowing errors and
replacing them with the filename**. So when a 4.7 MB PNG failed to
upload, the user saw `screenshot.png` as the error message — not the
actual cause (CORS, 413, 401, etc.).

Fixed in this round (2026-04-24):

1. **`uploadFiles` thunk** — `failed` array changed from `string[]`
   (filenames) to `Array<{ name: string; error: string }>`. Real backend
   errors now propagate.
2. **`useFileUploadWithStorage`** — gained a `lastErrorRef` callers can
   read synchronously after `await` so toast messages show the real
   reason.
3. **`useUploadAndGet` / `useUploadAndShare` / `uploadAndShare`** — were
   calling `failed.join(", ")` on the old shape; would have rendered
   `[object Object]` once the type changed. Now correctly extract the
   real message.
4. **`FeedbackWindow` paste handler + `UploadResourcePicker`** — now
   surface the real error in the toast and the per-file error slot.
5. **Debug page** at `/ssr/demos/file-upload-debug` — exhaustive
   consumer-pattern harness.

---

## How to diagnose an upload failure now

1. **Open `/ssr/demos/file-upload-debug`.**
   - Top of page shows the active backend URL and your JWT/userId so
     you know who you are and where you're pointing.
   - Server picker switches between Production / Localhost / etc. —
     the same selector the rest of the app reads.

2. **Pick a file (or paste an image).**
   - Any file works. For images, the page also auto-runs the
     public-assets path on paste.

3. **Click "Run all" to fire every pattern in sequence.**
   - Each pattern logs a row with: timestamp, pattern name, target
     folder, success/failure, duration, raw error if any, fileId &
     shareUrl on success.
   - Expand any row to see the full request/response.

4. **Read the error.**
   - Common patterns:
     - `Failed to fetch` → backend unreachable (CORS, network, server
       down).
     - `HTTP 401` → JWT missing or expired; refresh the session.
     - `HTTP 413` → file too large (current cap 100 MB).
     - `HTTP 403` → RLS / permissions.
     - `cloud_sync_unavailable` → `NEXT_PUBLIC_BACKEND_URL_*` env not
       set.
     - `File uploaded but share link couldn't be created: ...` → upload
       succeeded; the post-upload share-link create failed (often
       another auth issue or RLS on `cld_share_links`).

---

## The five known-good upload patterns

If you're writing code that uploads files, use ONE of these. The audit
subagent flags any new code that uses a different pattern.

### 1. `useFileUploadWithStorage` (legacy compat)

For consumers that already exist and shouldn't be migrated yet.

```ts
const { uploadToPublicUserAssets, lastErrorRef } =
  useFileUploadWithStorage("user-public-assets", "feedback-images");

const result = await uploadToPublicUserAssets(file);
if (!result) toast.error(lastErrorRef.current ?? "Upload failed");
```

### 2. `useUploadAndGet` (preferred for chat/agent attachments)

Clean, returns the fileId. Throws on failure.

```ts
const { upload } = useUploadAndGet();
try {
  const { fileId } = await upload({ file, folderPath: "Chat Attachments" });
  // ... use fileId
} catch (err) {
  toast.error(err.message);
}
```

### 3. `useUploadAndShare` (preferred for public-link assets)

Returns fileId + permanent share URL.

```ts
const { upload } = useUploadAndShare();
try {
  const { fileId, shareUrl } = await upload({ file, folderPath: "Images" });
  // shareUrl is `/share/:token` — safe to persist into DB rows
} catch (err) {
  toast.error(err.message);
}
```

### 4. `uploadFiles` thunk (direct dispatch — for thunks/effects)

```ts
const result = await dispatch(uploadFiles({
  files: [file],
  parentFolderId,
  visibility: "private",
})).unwrap();
if (result.failed.length > 0) {
  toast.error(result.failed[0].error); // <-- not just the filename!
}
```

### 5. `Api.Server.uploadAndShare` (server-side route handlers)

```ts
import { Api } from "@/features/files";

const ctx = Api.Server.createServerContext({
  accessToken: session.access_token,
});
const { fileId, shareUrl } = await Api.Server.uploadAndShare(ctx, {
  file: bytes,
  filePath: `${folderForAgentApp(appId)}/favicon.svg`,
  contentType: "image/svg+xml",
  appOrigin: req.nextUrl.origin,
});
```

---

## What's forbidden

- ❌ `supabase.storage.from(...).upload(...)` — legacy. The new system
  is the ONLY valid path.
- ❌ Direct `fetch("/files/upload", ...)` — use the typed client
  (`Api.uploadFile` / `Api.uploadFileWithProgress`) instead.
- ❌ Custom retry/queue layers around uploads. The thunks already
  handle progress, concurrency, and rollback.

If you find code using any of these, fix it or open a ticket.

---

## Backend-side things this doc CAN'T fix

These need the Python team or admin involvement:

- **CORS** must permit `Origin: http://localhost:3000` (dev) and your
  prod origins on every `/files/*` endpoint plus `/health`. Headers:
  `Authorization`, `Content-Type`, `X-Request-Id`. Methods: GET / POST /
  PATCH / DELETE / OPTIONS.
- **`NEXT_PUBLIC_BACKEND_URL_PROD` / `_LOCAL`** must be set in the
  appropriate `.env` files / Vercel env config.
- **Realtime publication** must include `cld_share_links` (see
  `HANDOFF.md` for the SQL).

The cloud-files diagnostic page (`/ssr/demos/cloud-files-debug`) shows
the active URL + JWT and fires raw fetches against the backend — use
that to confirm the server is up and reachable BEFORE blaming the
upload code.
