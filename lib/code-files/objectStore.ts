// lib/code-files/objectStore.ts
//
// Server-side object-store adapter for code file content. Migrated in
// Phase 9 to route through the cloud-files system — bytes now live under
// `Code/Editor/` in the user's cloud-files tree, owned by the user, visible
// in the Files app. The `code_files` DB row keeps its {s3_key, s3_bucket}
// columns for compat; we repurpose them:
//
//   - New rows:      s3_bucket = "cloud-files",  s3_key = <cloud-files UUID>
//   - Legacy rows:   s3_bucket = "code-editor",  s3_key = "code-files/<userId>/<fileId>.txt"
//
// Every function below branches on `bucket === "cloud-files"` so the two
// formats coexist during the migration. Legacy rows can be back-filled with
// a maintenance job later; old files continue working in the meantime.

import { createClient as createServerSupabase } from "@/utils/supabase/server";
import * as Api from "@/features/files/api";
import { CloudFolders } from "@/features/files/utils/folder-conventions";

/** Sentinel value stored in `code_files.s3_bucket` for new cloud-files-backed rows. */
export const CLOUD_FILES_BUCKET = "cloud-files";

/** Legacy sentinel (supabase-storage) kept for back-compat reads. */
export const CODE_FILE_BUCKET = "code-editor";

/** True for rows written by the legacy supabase-storage path. */
export function isLegacyKey(bucket: string): boolean {
  return bucket === CODE_FILE_BUCKET;
}

/** True for rows written by the cloud-files path. */
export function isCloudFilesKey(bucket: string): boolean {
  return bucket === CLOUD_FILES_BUCKET;
}

/** Legacy — retained for the back-compat read path only. */
export function buildCodeFileKey(userId: string, fileId: string): string {
  return `code-files/${userId}/${fileId}.txt`;
}

export interface UploadObjectArgs {
  userId: string;
  fileId: string;
  content: string;
  contentType: string;
}

export interface UploadObjectResult {
  key: string;
  bucket: string;
  size: number;
}

/**
 * Resolve the current user's Supabase access token from the request
 * context. Required to call the cloud-files REST API as that user (so RLS
 * and ownership match). Throws if there's no session.
 */
async function getAccessToken(): Promise<string> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error("Unauthorized — no active session");
  }
  return session.access_token;
}

// ---------------------------------------------------------------------------
// Upload — always writes via cloud-files now. The file lands under
// `Code/Editor/{fileId}.txt` so users can find their code files in the
// normal Files app. Subsequent uploads to the same path upsert (the
// backend auto-versions via `current_version`).
// ---------------------------------------------------------------------------

export async function uploadCodeFileObject(
  args: UploadObjectArgs,
): Promise<UploadObjectResult> {
  const accessToken = await getAccessToken();
  const ctx = Api.Server.createServerContext({ accessToken });

  const bytes = new TextEncoder().encode(args.content);
  const { data } = await Api.Server.uploadFile(ctx, {
    file: bytes,
    // Stable, predictable path so subsequent writes upsert in place.
    filePath: `${CloudFolders.CODE_EDITOR}/${args.fileId}.txt`,
    fileName: `${args.fileId}.txt`,
    contentType: args.contentType,
    visibility: "private",
    metadata: {
      origin: "code-editor",
      code_file_id: args.fileId,
    },
  });

  return {
    key: data.file_id,
    bucket: CLOUD_FILES_BUCKET,
    size: bytes.byteLength,
  };
}

// ---------------------------------------------------------------------------
// Download — routes by bucket. Cloud-files rows fetch via the REST download
// endpoint; legacy rows fall through to supabase.storage for back-compat.
// ---------------------------------------------------------------------------

export interface DownloadObjectArgs {
  key: string;
  bucket: string;
}

export async function downloadCodeFileObject(
  args: DownloadObjectArgs,
): Promise<string> {
  if (isCloudFilesKey(args.bucket)) {
    const accessToken = await getAccessToken();
    const ctx = Api.Server.createServerContext({ accessToken });
    const blob = await Api.Server.downloadFile(ctx, args.key);
    return await blob.text();
  }

  // Legacy path.
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .download(args.key);
  if (error || !data) {
    throw new Error(`Download failed: ${error?.message ?? "unknown error"}`);
  }
  return await data.text();
}

// ---------------------------------------------------------------------------
// Delete — same routing.
// ---------------------------------------------------------------------------

export async function deleteCodeFileObject(
  args: DownloadObjectArgs,
): Promise<void> {
  if (isCloudFilesKey(args.bucket)) {
    const accessToken = await getAccessToken();
    const ctx = Api.Server.createServerContext({ accessToken });
    await Api.Server.deleteFile(ctx, args.key, /* hardDelete */ true);
    return;
  }

  // Legacy path.
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(args.bucket).remove([args.key]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Authorize access to a key. Cloud-files keys are RLS-enforced by the
 * backend, so we only rely on the session check here — the cloud-files
 * delete/download will 403 on its own if the caller doesn't own the file.
 * Legacy keys are structured as `code-files/<userId>/...` so we can verify
 * ownership client-side for them.
 */
export function isAuthorizedForKey(
  key: string,
  userId: string,
  bucket?: string,
): boolean {
  if (bucket && isCloudFilesKey(bucket)) {
    // RLS enforces this server-side. Any non-empty key passes the pre-check.
    return Boolean(key);
  }
  if (!key.startsWith("code-files/")) return false;
  const segments = key.split("/");
  if (segments.length < 3) return false;
  return segments[1] === userId;
}
