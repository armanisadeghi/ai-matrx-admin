/**
 * lib/api/server-api.ts
 *
 * THE website's one `@ai-matrx/api` client. Every generated operation
 * (`@ai-matrx/api/<domain>`) is called as `operation(serverApi, { path, query, body }, options)`
 * and resolves the parsed body directly.
 *
 * This module injects ONLY app identity into `createApi`; the package owns the
 * wire (timeouts, retry of reads, 401 refresh-and-retry, request ids, the
 * organization rule of each operation). What the website's request system
 * carried before (lib/python-client.ts) and where it lives now:
 *
 *   - credentials      : `credentialsFromState` (Redux access token, else the guest
 *                        fingerprint), with the session-ready wait (`ready()`).
 *   - 401 refresh      : `refreshCredentials` -> the Supabase session refresh.
 *   - base URL         : `resolveBaseUrl(deployment)` -> the admin server toggle
 *                        (apiConfigSlice) per deployment (aidream / files / scraper / seo).
 *   - organization     : the bound getter (admin seat ?? active organization, JWT lane
 *                        only) + the post-hydration admission wait before a call leaves.
 *   - per-call headers : `X-Guest-Fingerprint`, the admin-lane header, AI test mode.
 *   - errors           : every failure surfaces as the website's `BackendApiError`
 *                        (same parser as python-client), so catch blocks and toasts
 *                        are unchanged; usage / not-a-member refusals are noticed.
 *   - diagnostics      : Error Inspector capture, except a caller's own cancel.
 */

import {
  BackendApiError,
  MatrxApiError,
  NetError,
  createApi,
  parseHttpError,
  type Api,
  type CallOptions,
  type OperationArgs,
  type OperationDescriptor,
} from "@ai-matrx/api";
import type { CredentialsPort, MatrxCredential } from "@ai-matrx/api/credentials";

import { adminLaneHeadersFor, adminLaneOrganizationId } from "@/lib/api/admin-lane";
import { aiTestModeHeaders } from "@/lib/api/ai-test-mode";
import { logApiTarget } from "@/lib/api/log-api-target";
import {
  peekSelectedOrganizationId,
  waitForOrganizationAdmission,
} from "@/lib/api/organization-admission";
import { resolveServiceBaseUrl } from "@/lib/api/resolve-service-url";
import { cancelledByCaller } from "@/lib/diagnostics/cancelledByCaller";
import {
  capturePythonClientError,
  relationPathFromUrl,
} from "@/lib/diagnostics/capturePythonClientError";
import { noticeUsageRefusal } from "@/features/entitlements/usage-gate/usageGate";
import { noticeNotAMemberRefusal } from "@/lib/organizations/organizationRefusal";
import { resolveBaseUrl, resolveFilesBaseUrl, type RequestOptions } from "@/lib/python-client";
import { getStore } from "@/lib/redux/store-singleton";
import { selectAccessToken, selectFingerprintId } from "@/lib/redux/slices/userSlice";
import { getCachedFingerprint } from "@/lib/services/fingerprint-service";
import { beforeGuestWrite, retriesAfterGuestRefusal } from "@/lib/guest/guest-rule";
import { supabase } from "@/utils/supabase/client";
import { startSessionTokenSync } from "@/lib/api/session-token-sync";
import type { RootState } from "@/lib/redux/store";

/** Bounded wait for the browser's auth hydration before a credential is read. */
export const SERVER_API_AUTH_READY_MS = 8000;
/** Header the website has always sent for the guest fingerprint. */
export const GUEST_FINGERPRINT_HEADER = "X-Guest-Fingerprint";
/**
 * A call that owns its own recovery path says so with this header; the client strips it before
 * the wire and skips the Error Inspector capture (the old `captureErrors: false`).
 */
export const NO_ERROR_CAPTURE_HEADER = "x-matrx-client-capture";

function currentState(): RootState | null {
  const store = getStore();
  return store ? (store.getState() as RootState) : null;
}

/** Redux-backed credentials, read fresh on every call. */
export const serverApiCredentials: CredentialsPort = {
  ready: async (): Promise<void> => {
    const { waitForAuthReady } = await import("@/lib/api/call-api");
    await waitForAuthReady(() => (getStore()?.getState() ?? {}) as RootState, SERVER_API_AUTH_READY_MS);
  },
  get: async (): Promise<MatrxCredential | null> => {
    // The token below follows an in-tab sign-in ("Confirm it's you") and refreshes, not only the page load.
    startSessionTokenSync({ auth: supabase.auth, getStore });
    const state = currentState();
    if (!state) return null;
    const accessToken = selectAccessToken(state);
    if (accessToken) return { kind: "user", accessToken };
    const fingerprintId = selectFingerprintId(state);
    if (fingerprintId) return { kind: "guest", fingerprintId };
    return null;
  },
};

function hasSessionToken(): boolean {
  const state = currentState();
  return !!state && !!selectAccessToken(state);
}

/** The organization a JWT-lane call binds: the admin seat, else the active organization. Guests bind none. */
export function boundOrganizationId(): string | null {
  if (!hasSessionToken()) return null;
  return adminLaneOrganizationId() ?? peekSelectedOrganizationId();
}

/** Where each deployment lives right now (the admin server toggle). Undefined = the package default. */
export function resolveDeploymentBaseUrl(
  deployment: string,
): string | undefined {
  switch (deployment) {
    case "aidream":
      return resolveBaseUrl();
    case "files":
      return resolveFilesBaseUrl();
    case "scraper":
    case "seo":
      try {
        return resolveServiceBaseUrl(deployment);
      } catch {
        return undefined;
      }
    default:
      return undefined;
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data.session?.access_token;
  } catch {
    return false;
  }
}

const inner: Api = createApi({
  credentials: serverApiCredentials,
  organizationId: boundOrganizationId,
  resolveBaseUrl: (deployment) => resolveDeploymentBaseUrl(deployment),
  refreshCredentials: refreshSession,
  readyTimeoutMs: SERVER_API_AUTH_READY_MS,
  // python-client's JSON reads were capped at 30s to first byte.
  connectTimeoutMs: 30_000,
  onRequest: (info) => {
    logApiTarget(info.url, { source: `server-api.${info.operation}`, method: info.method, channel: "global" });
  },
});

// ---------------------------------------------------------------------------
// Errors: the website's BackendApiError, refusals noticed, Error Inspector capture
// ---------------------------------------------------------------------------

/** The website's error for a failed server call (same parser python-client used). */
export async function toBackendApiError(err: unknown): Promise<unknown> {
  if (err instanceof BackendApiError) return err;
  if (err instanceof MatrxApiError) {
    const body =
      typeof err.serverDetail === "string"
        ? err.serverDetail
        : err.serverDetail === undefined
          ? ""
          : JSON.stringify(err.serverDetail);
    const error = await parseHttpError(new Response(body, { status: err.status }));
    // A structured refusal hoists extra keys (`occupants`, `ceiling`) to the ROOT of the
    // body; the parser reads `details` only from the envelope's own key. Keep the whole body.
    const root = err.serverDetail;
    if (error.details == null && typeof root === "object" && root !== null && !Array.isArray(root)) {
      return new BackendApiError({
        code: error.code,
        detail: error.detail,
        userMessage: error.userMessage,
        details: root,
        requestId: error.requestId || undefined,
        status: error.status ?? undefined,
      });
    }
    return error;
  }
  if (err instanceof NetError && err.code !== "aborted") {
    const timedOut = err.code === "connect-timeout" || err.code === "total-timeout";
    return new BackendApiError({
      code: timedOut ? "request_timeout" : "network_error",
      detail: err.message,
      userMessage: timedOut ? "The server took too long to answer. Please retry." : "Couldn’t reach the server. Check your connection and retry.",
      status: timedOut ? 504 : null,
    });
  }
  return err;
}

function noticeRefusals(err: MatrxApiError): void {
  const store = getStore();
  if (!store) return;
  if (err.status === 402 && err.serverDetail) {
    try {
      noticeUsageRefusal(null, err.serverDetail, store.dispatch, store.getState);
    } catch {
      // Showing the dialog must never replace the request's own error.
    }
  }
  if (err.status === 403) {
    noticeNotAMemberRefusal(err.serverDetail, () => {
      void import("@/lib/redux/thunks/activeOrgBootstrap").then(
        ({ recheckActiveOrganizationAfterRefusal }) =>
          store.dispatch(recheckActiveOrganizationAfterRefusal() as never),
      );
    });
  }
}

function capturesErrors(options: CallOptions | undefined): boolean {
  return !Object.keys(options?.headers ?? {}).some((h) => h.toLowerCase() === NO_ERROR_CAPTURE_HEADER);
}

async function surfaceError(
  err: unknown,
  op: OperationDescriptor,
  args: OperationArgs | undefined,
  options: CallOptions | undefined,
): Promise<never> {
  if (err instanceof MatrxApiError) noticeRefusals(err);
  const mapped = await toBackendApiError(err);
  if (!cancelledByCaller(options?.signal) && capturesErrors(options)) {
    let url = op.p;
    try {
      url = inner.url(op, args);
    } catch {
      // The URL could not be built (missing path param): capture the template.
    }
    capturePythonClientError(mapped, {
      url,
      method: op.m,
      path: relationPathFromUrl(op.p),
    });
  }
  throw mapped;
}

// ---------------------------------------------------------------------------
// Per-call identity
// ---------------------------------------------------------------------------

/** The headers the website adds to a call: fingerprint, admin lane, AI test mode. */
export function serverCallHeaders(
  op: OperationDescriptor,
  options?: CallOptions,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const fingerprint = getCachedFingerprint();
  if (fingerprint) headers[GUEST_FINGERPRINT_HEADER] = fingerprint;
  if (op.o !== "exempt") {
    Object.assign(headers, adminLaneHeadersFor(options?.organizationId ?? boundOrganizationId()));
  }
  Object.assign(headers, aiTestModeHeaders());
  return headers;
}

async function prepare(op: OperationDescriptor, options?: CallOptions): Promise<CallOptions> {
  // Fetch-on-mount traffic races the active-organization bootstrap: wait for the answer, never guess.
  if (!options?.organizationId && hasSessionToken()) await waitForOrganizationAdmission();
  // A signed-out write may mint a visitor: make sure the visitor exists first (one human check per tab).
  await beforeGuestWrite(hasSessionToken(), op.m);
  const callerHeaders = Object.fromEntries(
    Object.entries(options?.headers ?? {}).filter(([h]) => h.toLowerCase() !== NO_ERROR_CAPTURE_HEADER),
  );
  return { ...options, headers: { ...serverCallHeaders(op, options), ...callerHeaders } };
}

/**
 * The old `RequestOptions` of the website's request helpers, as the package's `CallOptions`.
 * For wrapper modules whose own signature still takes `RequestOptions`.
 */
export function callOptionsFrom(opts: RequestOptions = {}): CallOptions {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers["X-Idempotency-Key"] = opts.idempotencyKey;
  if (opts.cloudFilesBypass) headers["X-Cloud-Files-Bypass"] = opts.cloudFilesBypass;
  if (opts.guestFingerprint) headers[GUEST_FINGERPRINT_HEADER] = opts.guestFingerprint;
  if (opts.captureErrors === false) headers[NO_ERROR_CAPTURE_HEADER] = "off";
  return {
    ...(opts.signal ? { signal: opts.signal } : {}),
    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
    ...(opts.onUploadProgress ? { onUploadProgress: opts.onUploadProgress } : {}),
    ...(opts.timeoutMs ? { totalTimeoutMs: opts.timeoutMs } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}

/**
 * A NEW visitor refused for want of a passing human check (403 guest_challenge_failed): run the
 * check fresh and send the request once more. Signed-in calls never see this refusal.
 */
async function withGuestRetry<R>(op: OperationDescriptor, options: CallOptions | undefined, run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (err) {
    if (
      err instanceof MatrxApiError &&
      !cancelledByCaller(options?.signal) &&
      (await retriesAfterGuestRefusal(hasSessionToken(), err.status, () => err.serverDetail))
    ) {
      return run();
    }
    throw err;
  }
}

/** The website's client: `createApi` plus the identity and error policy above. */
export const serverApi: Api = {
  url: (op, args) => inner.url(op, args),
  async call<T>(op: OperationDescriptor, args?: OperationArgs, options?: CallOptions): Promise<T> {
    try {
      return await withGuestRetry(op, options, async () => inner.call<T>(op, args, await prepare(op, options)));
    } catch (err) {
      return surfaceError(err, op, args, options);
    }
  },
  async send(op, args, options) {
    try {
      return await withGuestRetry(op, options, async () => inner.send(op, args, await prepare(op, options)));
    } catch (err) {
      return surfaceError(err, op, args, options);
    }
  },
};
