/**
 * features/files/compat/legacy-file-store.ts
 *
 * Drop-in compatibility shim for the legacy `utils/supabase/file-store.ts`
 * API. Every function here matches the signature of the legacy export so
 * consumers can migrate with a single import change:
 *
 *   // Before
 *   import { uploadFile, downloadFile } from "@/utils/supabase/file-store";
 *
 *   // After
 *   import { uploadFile, downloadFile } from "@/features/files/compat/legacy-file-store";
 *
 * Under the hood these call the new cloud-files system (REST API + Python
 * backend + S3), mapping the legacy `bucketName` to a top-level folder in
 * the user's logical tree. The old bucket concept is translated as folder
 * prefix — `bucket="Images"` / `path="a/b.png"` → logical path `Images/a/b.png`.
 *
 * This is a MIGRATION bridge. Do NOT add new callers to it — prefer
 * `useUploadAndGet` / `useFileActions` / `openFilePicker` from the main barrel.
 * Callers should be weaned off this shim during Phase 9, and this file is
 * scheduled for deletion in Phase 11.
 */

import { supabase } from "@/utils/supabase/client";
import { Files } from "../api";
import { newRequestId } from "../api/client";
import { registerRequest, releaseRequest } from "../redux/request-ledger";
import type { FileUploadResponse, Visibility } from "../types";

// ---------------------------------------------------------------------------
// Types (mirror the legacy shapes so callers type-check unchanged)
// ---------------------------------------------------------------------------

export interface LegacyFileUploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
  /**
   * NEW: visibility to use for the upload. Defaults to "private". Old
   * `file-store.ts` didn't have a concept of visibility; opt into "shared" /
   * "public" here if you want parity with your existing behavior.
   */
  visibility?: Visibility;
  /** NEW: owner id for paths that used to include `${userId}/…`. Optional; server infers. */
  ownerId?: string;
}

export interface LegacyStorageResponse<T> {
  data: T | null;
  error: { message: string; name?: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a legacy `(bucketName, path)` pair to a single logical cloud-files
 * path. Strips any `${userId}/` prefix callers used to prepend — the new
 * system derives owner_id from the auth session.
 */
function toLogicalPath(bucketName: string, path: string): string {
  const cleanBucket = bucketName.replace(/^\/+|\/+$/g, "");
  // Strip a leading uuid-looking segment (old user-id prefix).
  const cleanPath = path
    .replace(/^\/+|\/+$/g, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i, "");
  return `${cleanBucket}/${cleanPath}`;
}

async function ensureFile(file: File | ArrayBuffer, filename: string): Promise<File> {
  if (file instanceof File) return file;
  // Wrap ArrayBuffer in a File so the multipart request has a filename.
  return new File([new Blob([file])], filename);
}

// ---------------------------------------------------------------------------
// uploadFile / uploadFiles
// ---------------------------------------------------------------------------

export async function uploadFile(
  bucketName: string,
  path: string,
  file: File | ArrayBuffer,
  options?: LegacyFileUploadOptions,
): Promise<LegacyStorageResponse<FileUploadResponse>> {
  const filePath = toLogicalPath(bucketName, path);
  const filename = filePath.split("/").pop() ?? "untitled";
  try {
    const asFile = await ensureFile(file, filename);
    const requestId = newRequestId();
    registerRequest({
      requestId,
      kind: "upload",
      resourceId: null,
      resourceType: "file",
    });
    try {
      const { data } = await Files.uploadFile(
        {
          file: asFile,
          filePath,
          visibility: options?.visibility ?? "private",
        },
        { requestId },
      );
      return { data, error: null };
    } finally {
      releaseRequest(requestId);
    }
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function uploadFiles(
  bucketName: string,
  files: {
    path: string;
    file: File | ArrayBuffer;
    options?: LegacyFileUploadOptions;
  }[],
): Promise<LegacyStorageResponse<FileUploadResponse>[]> {
  return Promise.all(
    files.map(({ path, file, options }) =>
      uploadFile(bucketName, path, file, options),
    ),
  );
}

// ---------------------------------------------------------------------------
// downloadFile / downloadFiles
// ---------------------------------------------------------------------------

export async function downloadFile(
  bucketName: string,
  path: string,
): Promise<LegacyStorageResponse<Blob>> {
  const filePath = toLogicalPath(bucketName, path);
  try {
    const { data: fileRow, error: lookupError } = await supabase
      .from("cld_files")
      .select("id")
      .eq("file_path", filePath)
      .is("deleted_at", null)
      .maybeSingle();
    if (lookupError) {
      return { data: null, error: { message: lookupError.message } };
    }
    if (!fileRow) {
      return { data: null, error: { message: "not_found" } };
    }
    const { blob } = await Files.downloadFile(fileRow.id);
    return { data: blob, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function downloadFiles(
  bucketName: string,
  paths: string[],
): Promise<LegacyStorageResponse<Blob>[]> {
  return Promise.all(paths.map((p) => downloadFile(bucketName, p)));
}

// ---------------------------------------------------------------------------
// deleteFile / deleteFiles
// ---------------------------------------------------------------------------

export async function deleteFile(
  bucketName: string,
  path: string,
): Promise<LegacyStorageResponse<true>> {
  const filePath = toLogicalPath(bucketName, path);
  try {
    const { data: fileRow, error: lookupError } = await supabase
      .from("cld_files")
      .select("id")
      .eq("file_path", filePath)
      .is("deleted_at", null)
      .maybeSingle();
    if (lookupError) {
      return { data: null, error: { message: lookupError.message } };
    }
    if (!fileRow) return { data: true, error: null }; // idempotent

    const requestId = newRequestId();
    registerRequest({
      requestId,
      kind: "delete",
      resourceId: fileRow.id,
      resourceType: "file",
    });
    try {
      await Files.deleteFile(fileRow.id, { hardDelete: false }, { requestId });
      return { data: true, error: null };
    } finally {
      releaseRequest(requestId);
    }
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function deleteFiles(
  bucketName: string,
  paths: string[],
): Promise<LegacyStorageResponse<true>[]> {
  return Promise.all(paths.map((p) => deleteFile(bucketName, p)));
}

// ---------------------------------------------------------------------------
// getPublicUrl — now returns a signed URL. This is an intentional behavior
// change: the new system ONLY vends presigned URLs. Callers that embedded
// the return value in <img src> keep working; callers that persisted the
// string expecting it to last forever must switch to storing `fileId` and
// calling `useSignedUrl(fileId)` / `getSignedUrl(fileId)` at render time.
// ---------------------------------------------------------------------------

export async function getPublicUrl(
  bucketName: string,
  path: string,
): Promise<{ data: { publicUrl: string } }> {
  const filePath = toLogicalPath(bucketName, path);
  const { data: fileRow, error } = await supabase
    .from("cld_files")
    .select("id")
    .eq("file_path", filePath)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !fileRow) {
    return { data: { publicUrl: "" } };
  }
  try {
    const { data } = await Files.getSignedUrl(fileRow.id, {
      expiresIn: 3600,
    });
    return { data: { publicUrl: data.url } };
  } catch {
    return { data: { publicUrl: "" } };
  }
}

// ---------------------------------------------------------------------------
// listFiles — list rows under a legacy bucket/path prefix.
// ---------------------------------------------------------------------------

export async function listFiles(
  bucketName: string,
  path?: string,
): Promise<
  LegacyStorageResponse<
    Array<{ name: string; id: string; updated_at: string | null }>
  >
> {
  const prefix = toLogicalPath(bucketName, path ?? "");
  try {
    const { data, error } = await supabase
      .from("cld_files")
      .select("id, file_name, file_path, updated_at")
      .is("deleted_at", null)
      .like("file_path", `${prefix}%`);
    if (error) {
      return { data: null, error: { message: error.message } };
    }
    return {
      data: (data ?? []).map((r) => ({
        name: r.file_name,
        id: r.id,
        updated_at: r.updated_at,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

// ---------------------------------------------------------------------------
// Bucket operations — no-ops in the new system. Kept so callers' typecheck
// doesn't break; they log-and-return to surface silent migration gaps.
// ---------------------------------------------------------------------------

function warnUnsupported(name: string): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      `[cloud-files/legacy-shim] ${name}() is a no-op in the new cloud-files system. The concept of "buckets" has been replaced by folders. Remove this caller during Phase 9 migration.`,
    );
  }
}

export async function createBucket(
  _bucketName: string,
): Promise<LegacyStorageResponse<null>> {
  warnUnsupported("createBucket");
  return { data: null, error: null };
}

export async function deleteBucket(
  _bucketName: string,
): Promise<LegacyStorageResponse<null>> {
  warnUnsupported("deleteBucket");
  return { data: null, error: null };
}

export async function listBuckets(): Promise<
  LegacyStorageResponse<never[]>
> {
  warnUnsupported("listBuckets");
  return { data: [], error: null };
}

export async function getBucket(
  _bucketName: string,
): Promise<LegacyStorageResponse<null>> {
  warnUnsupported("getBucket");
  return { data: null, error: null };
}
