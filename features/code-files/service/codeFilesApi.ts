// features/code-files/service/codeFilesApi.ts
//
// Thin public facade over codeFilesService + s3Service. App code should
// import CodeFilesAPI instead of reaching into the service modules directly.
//
// Handles the Postgres-vs-S3 routing decision so callers don't have to think
// about it: small payloads land in code_files.content, large payloads land in
// S3 with only metadata in Postgres.

import type { CodeFile, CodeFolder } from "../redux/code-files.types";
import { S3_OFFLOAD_THRESHOLD_BYTES } from "../redux/code-files.types";
import {
  createCodeFile,
  createCodeFolder,
  deleteCodeFile,
  deleteCodeFolder,
  fetchCodeFileById,
  fetchCodeFilesByIds,
  fetchCodeFilesList,
  fetchCodeFolders,
  updateCodeFile,
  updateCodeFolder,
  type CreateCodeFileInput,
  type CreateCodeFolderInput,
  type UpdateCodeFileInput,
  type UpdateCodeFolderInput,
} from "./codeFilesService";
import {
  deleteCodeFileFromS3,
  downloadCodeFileFromS3,
  uploadCodeFileToS3,
} from "./s3Service";

function byteSize(text: string): number {
  if (typeof Blob !== "undefined") return new Blob([text]).size;
  return new TextEncoder().encode(text).length;
}

function shouldUseS3(content: string): boolean {
  return byteSize(content) >= S3_OFFLOAD_THRESHOLD_BYTES;
}

// ── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a code file, routing content to S3 when it exceeds the threshold.
 * The returned CodeFile always has `content` set locally (what the caller
 * provided), even when the persisted row has empty content + an s3_key.
 */
export async function create(input: CreateCodeFileInput): Promise<CodeFile> {
  const content = input.content ?? "";
  const useS3 = shouldUseS3(content);

  if (!useS3) {
    return createCodeFile({ ...input, content });
  }

  // Large file: create row with empty content, then upload to S3 and patch.
  const row = await createCodeFile({ ...input, content: "" });
  try {
    const upload = await uploadCodeFileToS3({
      fileId: row.id,
      content,
    });
    const patched = await updateCodeFile(row.id, {
      s3_key: upload.s3_key,
      s3_bucket: upload.s3_bucket,
    });
    return { ...patched, content };
  } catch (err) {
    // Best-effort: leave the row (empty) so the caller can retry upload.
    console.error("[codeFilesApi.create] S3 upload failed", err);
    throw err;
  }
}

// ── Update ──────────────────────────────────────────────────────────────────

/**
 * Update a code file. If `updates.content` is present, route it through
 * Postgres or S3 based on size, cleaning up the opposite location when the
 * storage decision flips.
 */
export async function update(
  id: string,
  updates: UpdateCodeFileInput,
  current?: CodeFile,
): Promise<CodeFile> {
  if (updates.content === undefined) {
    return updateCodeFile(id, updates);
  }

  const content = updates.content;
  const useS3 = shouldUseS3(content);
  const wasInS3 = Boolean(current?.s3_key);

  if (!useS3) {
    // Small now → store inline. Drop any previous S3 pointer/object.
    const patched = await updateCodeFile(id, {
      ...updates,
      content,
      s3_key: null,
      s3_bucket: null,
    });
    if (wasInS3 && current?.s3_key && current?.s3_bucket) {
      await deleteCodeFileFromS3({
        s3_key: current.s3_key,
        s3_bucket: current.s3_bucket,
      });
    }
    return { ...patched, content };
  }

  // Large → store in S3; blank out inline content.
  const upload = await uploadCodeFileToS3({ fileId: id, content });
  const patched = await updateCodeFile(id, {
    ...updates,
    content: "",
    s3_key: upload.s3_key,
    s3_bucket: upload.s3_bucket,
  });
  return { ...patched, content };
}

// ── Fetch ───────────────────────────────────────────────────────────────────

export async function listMetadata(): Promise<CodeFile[]> {
  return fetchCodeFilesList();
}

/**
 * Fetch a single file with its full content, transparently resolving S3 when
 * the row is S3-backed.
 */
export async function getById(id: string): Promise<CodeFile | null> {
  const row = await fetchCodeFileById(id);
  if (!row) return null;
  if (row.s3_key && row.s3_bucket) {
    const content = await downloadCodeFileFromS3({
      s3_key: row.s3_key,
      s3_bucket: row.s3_bucket,
    });
    return { ...row, content };
  }
  return row;
}

/**
 * Bulk fetch full content for many files. S3-backed files are hydrated in
 * parallel. Any individual S3 failure is logged; that file returns with empty
 * content and `_error` via the thunk layer.
 */
export async function getByIds(ids: string[]): Promise<CodeFile[]> {
  const rows = await fetchCodeFilesByIds(ids);
  const out = await Promise.all(
    rows.map(async (row) => {
      if (row.s3_key && row.s3_bucket) {
        try {
          const content = await downloadCodeFileFromS3({
            s3_key: row.s3_key,
            s3_bucket: row.s3_bucket,
          });
          return { ...row, content };
        } catch (err) {
          console.error(
            "[codeFilesApi.getByIds] S3 hydration failed for",
            row.id,
            err,
          );
          return { ...row, content: "" };
        }
      }
      return row;
    }),
  );
  return out;
}

export async function remove(id: string, current?: CodeFile): Promise<void> {
  await deleteCodeFile(id);
  if (current?.s3_key && current?.s3_bucket) {
    await deleteCodeFileFromS3({
      s3_key: current.s3_key,
      s3_bucket: current.s3_bucket,
    });
  }
}

// ── Folders ─────────────────────────────────────────────────────────────────

export async function listFolders(): Promise<CodeFolder[]> {
  return fetchCodeFolders();
}

export async function createFolder(
  input: CreateCodeFolderInput,
): Promise<CodeFolder> {
  return createCodeFolder(input);
}

export async function updateFolder(
  id: string,
  updates: UpdateCodeFolderInput,
): Promise<CodeFolder> {
  return updateCodeFolder(id, updates);
}

export async function removeFolder(id: string): Promise<void> {
  return deleteCodeFolder(id);
}

// ── Public namespace ────────────────────────────────────────────────────────

export const CodeFilesAPI = {
  create,
  update,
  listMetadata,
  getById,
  getByIds,
  remove,
  listFolders,
  createFolder,
  updateFolder,
  removeFolder,
};

export type {
  CreateCodeFileInput,
  UpdateCodeFileInput,
  CreateCodeFolderInput,
  UpdateCodeFolderInput,
};
