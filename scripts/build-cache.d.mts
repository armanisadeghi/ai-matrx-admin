// Types for scripts/build-cache.mjs — the S3 helpers other build steps reuse.
export interface BucketObject {
  bucket: string;
  region: string;
  key: string;
  accessKey: string;
  secretKey: string;
}
/** Credentials for one object in the build-cache bucket; null when this build has none. */
export function bucketObject(key: string, env?: NodeJS.ProcessEnv): BucketObject | null;
/** One signed S3 request (UNSIGNED-PAYLOAD). */
export function s3(
  s: BucketObject,
  method: "GET" | "HEAD" | "PUT" | "POST" | "DELETE",
  opts?: { query?: Record<string, string>; headers?: Record<string, string | number>; body?: BodyInit },
): Promise<Response>;
