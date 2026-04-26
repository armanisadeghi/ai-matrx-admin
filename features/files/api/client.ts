/**
 * features/files/api/client.ts
 *
 * Typed REST client for the Python FastAPI cloud-files backend.
 *
 * Key responsibilities:
 *   - Attach Supabase JWT as `Authorization: Bearer ...` on every call.
 *   - Generate a `X-Request-Id` per mutation for realtime-echo dedup.
 *   - Normalize errors to BackendApiError via the existing parseHttpError.
 *   - Support JSON, multipart upload, download-as-blob, DELETE, PATCH.
 *
 * Why a purpose-built client here (vs reusing lib/api/backend-client.ts):
 *   - We need DELETE/PATCH — the shared BackendClient only has POST/GET/upload.
 *   - Request-ID on EVERY mutation is mandatory for our realtime dedup model.
 *   - Cloud-files is the only feature that talks to /files/* REST endpoints.
 *
 * If BackendClient gains DELETE/PATCH/request-id support in the future, we can
 * collapse this back into it.
 */

import { parseHttpError, BackendApiError } from "@/lib/api/errors";
import { BACKEND_URLS } from "@/lib/api/endpoints";
import { supabase } from "@/utils/supabase/client";
import { getStore } from "@/lib/redux/store-singleton";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { extractErrorMessage } from "@/utils/errors";

// ---------------------------------------------------------------------------
// Request ID helper
// ---------------------------------------------------------------------------

/**
 * Generates a stable UUID for a request. Exposed so thunks can pass it to the
 * request ledger BEFORE dispatching the API call.
 */
export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes (SSR in Node without crypto.randomUUID).
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * Resolves the active backend URL the browser should hit.
 *
 * Priority:
 *   1. Explicit `override` (tests, edge cases).
 *   2. Redux `apiConfigSlice.activeServer` (set by the admin server-toggle UI
 *      — `production` / `development` / `staging` / `localhost` / `gpu` /
 *      `custom`). This is the SAME selector `useBackendApi` reads, so the
 *      cloud-files client follows whichever server the user picked instead
 *      of hard-locking to production.
 *   3. Env-var fallback for runtimes without a store yet (rare — e.g. a
 *      module-level call before the StoreProvider mounts).
 *
 * **Bug fix 2026-04-24:** before this change, the cloud-files client read
 * `BACKEND_URLS.production` directly and ignored the localhost toggle, so
 * dev traffic never hit a local Python server. See
 * [features/files/migration/INVENTORY.md] under Phase 12.
 */
export function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, "");

  // 1. Honor the active server from Redux (the same selector useBackendApi reads).
  const store = getStore();
  if (store) {
    try {
      const fromStore = selectResolvedBaseUrl(
        store.getState() as Parameters<typeof selectResolvedBaseUrl>[0],
      );
      if (fromStore) return fromStore.replace(/\/$/, "");
    } catch {
      // Selector failed (slice not registered yet, etc.) — fall through.
    }
  }

  // 2. Env-var fallback for early/SSR contexts.
  const configured =
    (BACKEND_URLS.production as string | undefined) ||
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined);
  if (!configured) {
    throw new BackendApiError({
      code: "cloud_sync_unavailable",
      detail: "NEXT_PUBLIC_BACKEND_URL is not configured",
      userMessage: "Cloud sync is unavailable. Contact support.",
      status: 503,
    });
  }
  return configured.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new BackendApiError({
      code: "auth_required",
      detail: error?.message ?? "No active session",
      userMessage: "Please sign in to continue.",
      status: 401,
    });
  }
  return data.session.access_token;
}

// ---------------------------------------------------------------------------
// Common request options
// ---------------------------------------------------------------------------

export interface RequestOptions {
  /**
   * Client-generated idempotency/dedup ID. Attached as `X-Request-Id`. If
   * omitted on a mutation, one is generated and returned on the ResponseMeta.
   */
  requestId?: string;
  signal?: AbortSignal;
  /** Override base URL (tests, staging, etc.). */
  baseUrlOverride?: string;
}

export interface ResponseMeta {
  /** Echo of `X-Request-Id`. Same as the one sent, or the one auto-generated. */
  requestId: string;
  status: number;
  /** Server-side request id if the backend generates a different one. */
  serverRequestId: string | null;
}

async function buildHeaders(
  opts: RequestOptions,
  includeContentType: boolean,
): Promise<{ headers: Record<string, string>; requestId: string }> {
  const token = await getAccessToken();
  const requestId = opts.requestId ?? newRequestId();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Request-Id": requestId,
    Accept: "application/json",
  };
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  return { headers, requestId };
}

function meta(response: Response, requestId: string): ResponseMeta {
  return {
    requestId,
    status: response.status,
    serverRequestId: response.headers.get("x-request-id"),
  };
}

// ---------------------------------------------------------------------------
// Core methods
// ---------------------------------------------------------------------------

/** GET JSON. */
export async function getJson<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const { headers, requestId } = await buildHeaders(opts, false);
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "GET", headers, signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  const data = (await response.json()) as T;
  return { data, meta: meta(response, requestId) };
}

/** POST JSON. */
export async function postJson<T, B = unknown>(
  path: string,
  body: B,
  opts: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const { headers, requestId } = await buildHeaders(opts, true);
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    },
  );
  if (!response.ok) throw await parseHttpError(response);
  const data = (await response.json()) as T;
  return { data, meta: meta(response, requestId) };
}

/** PATCH JSON. */
export async function patchJson<T, B = unknown>(
  path: string,
  body: B,
  opts: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const { headers, requestId } = await buildHeaders(opts, true);
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    },
  );
  if (!response.ok) throw await parseHttpError(response);
  const data = (await response.json()) as T;
  return { data, meta: meta(response, requestId) };
}

/** DELETE. Returns parsed JSON if the server sends one; null otherwise. */
export async function del<T = null>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T | null; meta: ResponseMeta }> {
  const { headers, requestId } = await buildHeaders(opts, false);
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "DELETE", headers, signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : null;
  return { data, meta: meta(response, requestId) };
}

/**
 * Multipart upload WITHOUT progress. Use `uploadWithProgress` for UI.
 */
export async function postMultipart<T>(
  path: string,
  form: FormData,
  opts: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const { headers, requestId } = await buildHeaders(opts, false);
  // Never set Content-Type for FormData — the browser adds the boundary.
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "POST", headers, body: form, signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  const data = (await response.json()) as T;
  return { data, meta: meta(response, requestId) };
}

/**
 * Multipart upload WITH progress via XMLHttpRequest.
 * `fetch` doesn't expose upload progress — XHR is still the only path.
 */
export interface UploadProgressEvent {
  loaded: number;
  total: number;
}

export async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (event: UploadProgressEvent) => void,
  opts: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const token = await getAccessToken();
  const requestId = opts.requestId ?? newRequestId();
  const url = `${resolveBaseUrl(opts.baseUrlOverride)}${path}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Request-Id", requestId);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        onProgress({ loaded: ev.loaded, total: ev.total });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as T;
          resolve({
            data,
            meta: {
              requestId,
              status: xhr.status,
              serverRequestId:
                xhr.getResponseHeader("x-request-id") ?? null,
            },
          });
        } catch (err) {
          reject(
            new BackendApiError({
              code: "internal",
              detail: `Failed to parse upload response: ${extractErrorMessage(err)}`,
              userMessage: "Upload succeeded but response was malformed.",
              status: xhr.status,
              requestId,
            }),
          );
        }
        return;
      }

      // Error path — try to parse structured error
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        body = null;
      }
      reject(
        new BackendApiError({
          code:
            (body?.error as string) ??
            statusToCloudFilesCode(xhr.status),
          detail: (body?.message as string) ?? `HTTP ${xhr.status}`,
          userMessage:
            (body?.user_message as string) ??
            (body?.message as string) ??
            `Upload failed (${xhr.status})`,
          details: body?.details ?? null,
          requestId: (body?.request_id as string) ?? requestId,
          status: xhr.status,
        }),
      );
    });

    xhr.addEventListener("error", () => {
      reject(
        new BackendApiError({
          code: "internal",
          detail: "Network error during upload",
          userMessage: "Upload failed — check your connection.",
          requestId,
        }),
      );
    });

    xhr.addEventListener("abort", () => {
      reject(
        new BackendApiError({
          code: "invalid_request",
          detail: "Upload aborted",
          userMessage: "Upload cancelled.",
          requestId,
        }),
      );
    });

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
      } else {
        opts.signal.addEventListener("abort", () => xhr.abort(), {
          once: true,
        });
      }
    }

    xhr.send(form);
  });
}

/** Download a byte stream as a Blob. */
export async function downloadBlob(
  path: string,
  opts: RequestOptions = {},
): Promise<{ blob: Blob; meta: ResponseMeta; filename: string | null }> {
  const { headers, requestId } = await buildHeaders(opts, false);
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "GET", headers, signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition");
  const filename = parseFilename(contentDisposition);
  return { blob, meta: meta(response, requestId), filename };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  // Prefer RFC 5987 UTF-8 form: filename*=UTF-8''encoded
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(contentDisposition);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1].trim() : null;
}

function statusToCloudFilesCode(status: number): string {
  switch (status) {
    case 400:
      return "invalid_request";
    case 401:
      return "auth_required";
    case 403:
      return "permission_denied";
    case 404:
      return "not_found";
    case 413:
      return "file_too_large";
    case 503:
      return "cloud_sync_unavailable";
    default:
      return status >= 500 ? "internal" : "invalid_request";
  }
}

// ---------------------------------------------------------------------------
// Public endpoints (no auth required) — used by /share/:token public route
// ---------------------------------------------------------------------------

/** Public GET — does NOT attach Authorization. */
export async function publicGetJson<T>(
  path: string,
  opts: { signal?: AbortSignal; baseUrlOverride?: string } = {},
): Promise<T> {
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "GET", headers: { Accept: "application/json" }, signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  return (await response.json()) as T;
}

/** Public blob download — no auth. */
export async function publicDownloadBlob(
  path: string,
  opts: { signal?: AbortSignal; baseUrlOverride?: string } = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await fetch(
    `${resolveBaseUrl(opts.baseUrlOverride)}${path}`,
    { method: "GET", signal: opts.signal },
  );
  if (!response.ok) throw await parseHttpError(response);
  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"));
  return { blob, filename };
}
