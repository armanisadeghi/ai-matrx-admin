// lib/code-files/objectStore.ts
//
// Server-side object-store adapter for code file content. Keeps the S3-style
// {key, bucket} abstraction at the DB/API boundary but backs it with Supabase
// Storage today so the feature works without AWS credentials. Swapping in
// @aws-sdk/client-s3 later means editing only this file.
//
// Bucket contract: the "code-editor" bucket is already registered in
// availableBuckets (see rootReducer.ts). Keys are of the form
// `code-files/<userId>/<fileId>.txt`.

import { createClient as createServerSupabase } from "@/utils/supabase/server";

export const CODE_FILE_BUCKET = "code-editor";

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

export async function uploadCodeFileObject(
  args: UploadObjectArgs,
): Promise<UploadObjectResult> {
  const supabase = await createServerSupabase();
  const key = buildCodeFileKey(args.userId, args.fileId);
  const encoder = new TextEncoder();
  const body = encoder.encode(args.content);

  const { error } = await supabase.storage
    .from(CODE_FILE_BUCKET)
    .upload(key, body, {
      contentType: args.contentType,
      upsert: true,
    });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return { key, bucket: CODE_FILE_BUCKET, size: body.byteLength };
}

export interface DownloadObjectArgs {
  key: string;
  bucket: string;
}

export async function downloadCodeFileObject(
  args: DownloadObjectArgs,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .download(args.key);
  if (error || !data) {
    throw new Error(`Download failed: ${error?.message ?? "unknown error"}`);
  }
  return await data.text();
}

export async function deleteCodeFileObject(
  args: DownloadObjectArgs,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(args.bucket).remove([args.key]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Check whether the current caller owns the given key. Keys are structured
 * as `code-files/<userId>/...`, so authorization is "your userId must be the
 * owner segment".
 */
export function isAuthorizedForKey(key: string, userId: string): boolean {
  if (!key.startsWith("code-files/")) return false;
  const segments = key.split("/");
  if (segments.length < 3) return false;
  return segments[1] === userId;
}
