// features/code-files/service/s3Service.ts
//
// Client-side facade for S3-backed code file content. All credentialed
// operations are proxied through server API routes under
// /api/code-files/[upload|download]. This module never talks to AWS directly.
//
// Content flow:
//   - Small files   (< S3_OFFLOAD_THRESHOLD_BYTES): live in code_files.content
//   - Large files (≥ S3_OFFLOAD_THRESHOLD_BYTES):   live in S3 (s3_key set)
//
// When a file flips from small→large or large→small, the thunk layer clears
// the opposite storage location before writing the new one.

export interface S3UploadResult {
  s3_key: string;
  s3_bucket: string;
  size: number;
}

export interface S3UploadArgs {
  /** Intended code_files.id — pre-generated client-side if needed. */
  fileId: string;
  content: string;
  /** Optional content-type override (defaults to text/plain; charset=utf-8). */
  contentType?: string;
}

/** Upload file content to S3 via the server-side route. */
export async function uploadCodeFileToS3(
  args: S3UploadArgs,
): Promise<S3UploadResult> {
  const res = await fetch("/api/code-files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId: args.fileId,
      content: args.content,
      contentType: args.contentType ?? "text/plain; charset=utf-8",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`S3 upload failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as S3UploadResult;
  return json;
}

export interface S3DownloadArgs {
  s3_key: string;
  s3_bucket: string;
}

/** Fetch file content from S3 via the server-side route. */
export async function downloadCodeFileFromS3(
  args: S3DownloadArgs,
): Promise<string> {
  const url = new URL("/api/code-files/download", window.location.origin);
  url.searchParams.set("key", args.s3_key);
  url.searchParams.set("bucket", args.s3_bucket);
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`S3 download failed (${res.status}): ${body}`);
  }
  return await res.text();
}

export interface S3DeleteArgs {
  s3_key: string;
  s3_bucket: string;
}

/** Best-effort delete of an orphaned S3 object. */
export async function deleteCodeFileFromS3(args: S3DeleteArgs): Promise<void> {
  await fetch("/api/code-files/download", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  }).catch((err) => {
    console.warn("[s3Service] delete failed (non-fatal)", err);
  });
}
