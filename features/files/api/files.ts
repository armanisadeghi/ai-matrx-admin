/**
 * features/files/api/files.ts
 *
 * REST endpoints under /files/*. Wraps the typed client with endpoint-specific
 * args/returns so thunks don't hand-craft URLs or bodies.
 *
 * Backend contract: features/files/cld_files_frontend.md §6 (Files).
 */

import {
  del,
  downloadBlob,
  getJson,
  patchJson,
  postMultipart,
  uploadWithProgress,
  type RequestOptions,
  type ResponseMeta,
  type UploadProgressEvent,
} from "./client";
import type {
  FilePatchRequest,
  FileRecordApi,
  FileUploadResponse,
  PermissionLevel,
  SignedUrlResponse,
  Visibility,
} from "../types";

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadFileParams {
  file: File;
  filePath: string;
  visibility?: Visibility;
  shareWith?: string[];
  shareLevel?: PermissionLevel;
  changeSummary?: string;
  metadata?: Record<string, unknown>;
}

export async function uploadFile(
  params: UploadFileParams,
  opts: RequestOptions = {},
): Promise<{ data: FileUploadResponse; meta: ResponseMeta }> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("file_path", params.filePath);
  if (params.visibility) form.append("visibility", params.visibility);
  if (params.shareWith?.length)
    form.append("share_with", params.shareWith.join(","));
  if (params.shareLevel) form.append("share_level", params.shareLevel);
  if (params.changeSummary) form.append("change_summary", params.changeSummary);
  if (params.metadata)
    form.append("metadata_json", JSON.stringify(params.metadata));

  return postMultipart<FileUploadResponse>("/files/upload", form, opts);
}

export async function uploadFileWithProgress(
  params: UploadFileParams,
  onProgress: (event: UploadProgressEvent) => void,
  opts: RequestOptions = {},
): Promise<{ data: FileUploadResponse; meta: ResponseMeta }> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("file_path", params.filePath);
  if (params.visibility) form.append("visibility", params.visibility);
  if (params.shareWith?.length)
    form.append("share_with", params.shareWith.join(","));
  if (params.shareLevel) form.append("share_level", params.shareLevel);
  if (params.changeSummary) form.append("change_summary", params.changeSummary);
  if (params.metadata)
    form.append("metadata_json", JSON.stringify(params.metadata));

  return uploadWithProgress<FileUploadResponse>(
    "/files/upload",
    form,
    onProgress,
    opts,
  );
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * List files. Reading via supabase-js is preferred (RLS-filtered, no roundtrip
 * through the backend). Exposed here for parity with the REST contract.
 */
export async function listFiles(
  params: { folderPath?: string } = {},
  opts: RequestOptions = {},
): Promise<{ data: FileRecordApi[]; meta: ResponseMeta }> {
  const q = params.folderPath
    ? `?folder_path=${encodeURIComponent(params.folderPath)}`
    : "";
  return getJson<FileRecordApi[]>(`/files${q}`, opts);
}

export async function getFile(
  fileId: string,
  opts: RequestOptions = {},
): Promise<{ data: FileRecordApi; meta: ResponseMeta }> {
  return getJson<FileRecordApi>(`/files/${fileId}`, opts);
}

export async function getFileByPath(
  filePath: string,
  opts: RequestOptions = {},
): Promise<{ data: FileRecordApi; meta: ResponseMeta }> {
  return getJson<FileRecordApi>(
    `/files/by-path/${encodeURIComponent(filePath)}`,
    opts,
  );
}

/**
 * Full tree via the RPC. Prefer calling the RPC directly via supabase-js in
 * thunks (reducer dispatches don't need a round-trip through the backend).
 * This is provided for backend-mediated contexts only.
 */
export async function getFileTree(
  opts: RequestOptions = {},
): Promise<{ data: unknown[]; meta: ResponseMeta }> {
  return getJson<unknown[]>("/files/tree", opts);
}

// ---------------------------------------------------------------------------
// Mutate
// ---------------------------------------------------------------------------

export async function patchFile(
  fileId: string,
  body: FilePatchRequest,
  opts: RequestOptions = {},
): Promise<{ data: FileRecordApi; meta: ResponseMeta }> {
  return patchJson<FileRecordApi, FilePatchRequest>(
    `/files/${fileId}`,
    body,
    opts,
  );
}

export async function deleteFile(
  fileId: string,
  params: { hardDelete?: boolean } = {},
  opts: RequestOptions = {},
): Promise<{ data: null; meta: ResponseMeta }> {
  const q = params.hardDelete ? "?hard_delete=true" : "";
  return del<null>(`/files/${fileId}${q}`, opts);
}

// ---------------------------------------------------------------------------
// Bytes + signed URL
// ---------------------------------------------------------------------------

export async function downloadFile(
  fileId: string,
  params: { version?: number } = {},
  opts: RequestOptions = {},
): Promise<{ blob: Blob; filename: string | null; meta: ResponseMeta }> {
  const q = params.version !== undefined ? `?version=${params.version}` : "";
  return downloadBlob(`/files/${fileId}/download${q}`, opts);
}

export async function getSignedUrl(
  fileId: string,
  params: { expiresIn?: number } = {},
  opts: RequestOptions = {},
): Promise<{ data: SignedUrlResponse; meta: ResponseMeta }> {
  const expiresIn = params.expiresIn ?? 3600;
  return getJson<SignedUrlResponse>(
    `/files/${fileId}/url?expires_in=${expiresIn}`,
    opts,
  );
}
