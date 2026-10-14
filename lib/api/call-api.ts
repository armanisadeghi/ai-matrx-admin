/**
 * lib/api/call-api.ts
 *
 * THE unified entry point for every Python FastAPI backend call.
 *
 * Nothing should call fetch() against the backend directly.
 * Everything goes through callApi() so auth, URL, scope, type-safety,
 * and test overrides are handled in one place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * callApi(config)  →  AppThunk  ──reads──▶  Redux state
 *                                            ├─ Auth      (userSlice)
 *                                            ├─ URL       (adminPreferencesSlice — multi-env)
 *                                            └─ Scope     (TODO: appContextSlice)
 *
 * All context comes from Redux. Components dispatch callApi() like any
 * other thunk. Hooks simply call useAppDispatch()(callApi(...)).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TYPE SAFETY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Request bodies are inferred directly from @ai-matrx/api/types.
 * If you pass the wrong body shape TypeScript will error at the call site,
 * not at runtime.
 *
 * Example:
 *   dispatch(callApi({
 *     path: '/ai/agents/{agent_id}',
 *     method: 'POST',
 *     pathParams: { agent_id: promptId },
 *     body: {                           // ← typed as AgentStartRequest
 *       user_input: 'Hello',
 *       stream: true,
 *       debug: false,
 *       client_tools: [],
 *     },
 *     onStreamEvent: (event) => ...,
 *   }));
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ADDING NEW SCOPE FIELDS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Add the field to CallScope below.
 * 2. Add a selector to extract it from Redux state in resolveScope().
 * 3. If no Redux slice exists yet, add a TODO to appContextSlice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── External dependencies ───────────────────────────────────────────────────

import {
  checkUsageBeforeAiCall,
  noteAiCallEnded,
  noticeUsageRefusal,
  USAGE_LIMIT_REACHED,
} from "@/features/entitlements/usage-gate/usageGate";
import { isPaidAiCall } from "@/features/entitlements/usage-gate/paidAiPaths";
import type { Action } from "redux";
import type { ThunkAction } from "redux-thunk";

// ─── Internal infrastructure ─────────────────────────────────────────────────

import type { RootState } from "@/lib/redux/store";
import {
  selectAccessToken,
  selectFingerprintId,
  selectAuthReady,
  selectIsAuthenticated,
  selectIsSuperAdmin,
} from "@/lib/redux/slices/userSlice";
import {
  selectResolvedBaseUrl,
  selectEndpointOverrideConfig,
} from "@/lib/redux/slices/apiConfigSlice";
import { resolveEndpointPath } from "@ai-matrx/api";
import {
  selectOrganizationId,
  selectProjectId,
  selectTaskId,
  selectConversationId,
} from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
// BACKEND_URLS no longer needed here — URL resolution is owned by apiConfigSlice
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { logApiTarget } from "@/lib/api/log-api-target";
import { cancelledByCaller } from "@/lib/diagnostics/cancelledByCaller";
import { captureApiError } from "@/lib/diagnostics/captureApiError";
import { adminLaneOrganizationId } from "@/lib/api/admin-lane";
import { wasStreamErrorCaptured } from "@/lib/diagnostics/captureStreamError";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import {
  buildMatrxRequestBody,
  buildMatrxRequestUrl,
  executeMatrxCall,
  normalizeMatrxError,
  buildSafeRequestLog,
  redactUrlForRequestLog,
  shouldReportMatrxCallError,
  type MatrxCallError,
  type MatrxCallResult,
} from "@ai-matrx/api";
import { resolveRunWait, type RunOutputKind } from "@/lib/api/run-wait";
import { getUserId } from "@/utils/auth/getUserId";
import { applyDesktopTargetToRequestBody } from "@/lib/api/desktop-target-request";
import {
  applyOrganizationContextHeader,
  assertQueryOrganizationMatchesContext,
  requireOrganizationContext,
} from "@/lib/api/organization-context";

// The request pipeline (URL, scoped body, execution, the one error classifier,
// the honest status sentence, the log + capture policy) is THE shared core in
// `@ai-matrx/api` (`call`, chat-package independence P9b). This module
// supplies only this app's facts: Redux auth / base URL / endpoint overrides /
// scope, the organization gate, the desktop target, the run-wait knob, and the
// diagnostics sinks. Grow the pipeline in the package, never here.
export { bareStatusSentence } from "@ai-matrx/api";
// Imported above for this module's own logging; re-exported from the local binding so the
// name is declared once (Turbopack refuses an import and an `export … from` of the same name).
export { buildSafeRequestLog, redactUrlForRequestLog };

export {
  applyOrganizationContextHeader,
  assertQueryOrganizationMatchesContext,
  OrganizationContextError,
  requireOrganizationContext,
} from "@/lib/api/organization-context";

// ─── Auto-generated types (source of truth for all request/response shapes) ──

import type { paths, components } from "@ai-matrx/api/types";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

// ============================================================================
// SECTION 1 — UTILITY TYPE HELPERS
// ============================================================================

/** All HTTP methods the generated schema uses */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Given a path key and method, extract the operation object from the schema.
 * e.g. PathOperation<'/ai/agents/{agent_id}', 'POST'> → operations['start_agent_...']
 */
type PathOperation<P extends keyof paths, M extends HttpMethod> =
  Lowercase<M> extends keyof paths[P] ? paths[P][Lowercase<M>] : never;

/**
 * Given an operation, extract the JSON request body type.
 * Returns `never` if the operation has no request body.
 */
type OperationRequestBody<Op> = Op extends { requestBody?: infer Body }
  ? NonNullable<Body> extends {
      content: { "application/json": infer T };
    }
    ? T
    : never
  : never;

/**
 * Given an operation, extract the 200-response JSON type.
 * Returns `unknown` if not inferrable.
 */
type OperationResponse<Op> = Op extends {
  responses: { 200: { content: { "application/json": infer T } } };
}
  ? T
  : unknown;

/**
 * Extract path parameter names from a URL template string.
 * e.g. '/ai/agents/{agent_id}' → { agent_id: string }
 *      '/ai/conversations/{conversation_id}/tool_results' → { conversation_id: string }
 */
type ExtractPathParams<P extends string> = string extends P
  ? Record<string, string>
  : P extends `${infer _}${"{"}${infer Param}${"}"}${infer Rest}`
    ? { [K in Param | keyof ExtractPathParams<Rest>]: string }
    : Record<never, never>;

/** Whether a path has any path parameters */
type HasPathParams<P extends string> = keyof ExtractPathParams<P> extends never
  ? false
  : true;

// ============================================================================
// SECTION 2 — AUTH
// ============================================================================

/** The resolved auth mode for a given call */
export type AuthMode = "authenticated" | "admin" | "guest";

/** The resolved auth state — ready to inject into request headers */
export interface ResolvedAuth {
  mode: AuthMode;
  headers: Record<string, string>;
}

// ============================================================================
// SECTION 3 — CONTEXT SCOPE
// ============================================================================

/**
 * All context dimensions that may be injected into API requests.
 *
 * Fields are optional — only present ones are sent.
 * Auto-resolved from Redux; the caller only needs to supply overrides.
 *
 * TODO: Create a `appContextSlice` (single slice for the full hierarchy) to hold:
 *   - organization_id  (org context) ← DONE: appContextSlice
 *   - project_id       (project context) ← DONE: appContextSlice
 *   - task_id          (task context) ← DONE: appContextSlice
 *   - conversation_id  (active conversation — also in cx-conversation) ← DONE: appContextSlice
 *
 * Use a SINGLE slice (not multiple) because the full hierarchy is one unified
 * "where are you working" state and is always read together.
 */
export interface CallScope {
  /** Resolved automatically from Redux userSlice */
  user_id?: string;

  /** Resolved from appContextSlice. Injected automatically into every request body. */
  organization_id?: string;

  /** Resolved from appContextSlice. Injected automatically into every request body. */
  project_id?: string;

  /** Resolved from appContextSlice. Injected automatically into every request body. */
  task_id?: string;

  /**
   * Conversation ID — NOT auto-injected into the body.
   * Used as a path parameter or passed explicitly in the body by the caller.
   */
  conversation_id?: string;
}

export interface ResolvedCallScope extends CallScope {
  organization_id: string;
}

/**
 * The GUEST lane's resolved scope: the fingerprint lane is admitted org-less
 * by the server's AuthMiddleware (a guest has no membership to verify —
 * matrx-connect 241750bf6), so `organization_id` is present only when the
 * caller explicitly resolved one. JWT requests always resolve the required
 * `ResolvedCallScope` — never this shape.
 */
export interface GuestResolvedCallScope extends CallScope {
  organization_id?: string;
}

// ============================================================================
// SECTION 4 — TEST / DEMO OVERRIDES (Placeholder)
// ============================================================================

/**
 * Per-call test and demo overrides.
 *
 * TODO: Expand this when the demo/test override system is formalized.
 * The demo pages (app/(public)/demos/) currently wire their own server
 * selectors — when we migrate those, the full shape will be defined here.
 *
 * These are intentionally typed loosely for now to avoid premature API lock-in.
 */
export interface TestOverrides {
  /** Force a specific base URL regardless of Redux state */
  forceBaseUrl?: string;

  /** Inject additional request headers (e.g., test tokens) */
  additionalHeaders?: Record<string, string>;

  /** Short-circuit the actual fetch and return this mock response */
  mockResponse?: unknown;

  /**
   * When true, adds verbose logging of the full request before sending.
   * Useful for the demo clients that display the raw request.
   */
  logRequest?: boolean;
}

// ============================================================================
// SECTION 5 — CALL CONFIGURATION
// ============================================================================

/**
 * Full configuration for a single API call.
 *
 * The `body` field is automatically typed from the generated OpenAPI schema —
 * TypeScript will error at the call site if you pass the wrong shape.
 *
 * The `pathParams` field is also typed from the URL template — only required
 * when the path contains `{param}` segments.
 */
export interface ApiCallConfig<
  P extends keyof paths = keyof paths,
  M extends HttpMethod = HttpMethod,
  Op = PathOperation<P, M>,
> {
  // ── Endpoint ─────────────────────────────────────────────────────────────

  /** The FastAPI route path (must be a key of the generated `paths` interface) */
  path: P;

  /** HTTP method */
  method: M;

  /**
   * Path parameter values.
   * Only required (and typed) when the path contains `{param}` segments.
   * e.g. path: '/ai/agents/{agent_id}' → pathParams: { agent_id: 'abc-123' }
   */
  pathParams?: ExtractPathParams<P & string>;

  /** Query string parameters */
  queryParams?: Record<string, string | number | boolean>;

  /**
   * HTTP failures this call site fully handles as expected domain outcomes.
   * They remain in the returned result but do not create a system_error row.
   */
  expectedErrorStatuses?: readonly number[];

  // ── Request body (inferred from generated schema) ────────────────────────

  /**
   * Request body — typed directly from the generated OpenAPI schema.
   * Passing the wrong shape is a compile-time TypeScript error.
   */
  body?: OperationRequestBody<Op>;

  // ── Streaming ────────────────────────────────────────────────────────────

  /**
   * Set to true for NDJSON streaming endpoints (most AI routes).
   * When true, responses are parsed via parseNdjsonStream and delivered
   * to the callbacks below.
   */
  stream?: boolean;

  /**
   * Called immediately when response headers arrive — BEFORE any stream events.
   * Use this to capture conversationId for URL updates, bookmarking, etc.
   * Guaranteed to fire before onStreamEvent.
   */
  onStreamStart?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;

  /** Called for each NDJSON event during streaming */
  onStreamEvent?: (event: TypedStreamEvent) => void;

  /**
   * Take ownership of the NDJSON body instead of letting callApi drain it.
   *
   * WHY THIS EXISTS: a response body can only be consumed once. A caller that
   * needs the RAW `Response` — the canonical one being the agent execution
   * system's `processStream`, which turns a stream into `activeRequests` state
   * so content-IR blocks render through the ONE canonical pipeline — cannot
   * get it from the `onStreamEvent` callback. Passing a consumer here inverts
   * that: callApi still owns auth, URL resolution, scope injection, the v2
   * fallback and HTTP error handling; the caller owns the body.
   *
   * Layering: `lib/api` knows nothing about who consumes the stream. The
   * consumer is supplied by the caller (see
   * `features/agents/redux/execution-system/thunks/adopt-foreign-stream.ts`).
   *
   * When set, `onStreamEvent` is NOT called by callApi — the consumer sees
   * every event and is responsible for forwarding what it needs.
   * `onStreamStart` / `onStreamComplete` / `onStreamError` still fire.
   */
  consumeStream?: (
    response: Response,
    ids: { requestId: string | null; conversationId: string | null },
  ) => Promise<void>;

  /** Called when the stream ends cleanly */
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;

  /** Called if the stream errors */
  onStreamError?: (error: ApiCallError) => void;

  /** AbortController signal — pass to cancel mid-stream */
  signal?: AbortSignal;

  // ── Timeouts ─────────────────────────────────────────────────────────────

  /**
   * Time allowed for response HEADERS to arrive, in ms (default 15_000).
   * A non-streaming FastAPI handler sends nothing until it returns, so for
   * JSON calls this is effectively time-to-full-response. Long synchronous
   * compute endpoints (e.g. /seo/keywords/research, designed to run tens of
   * seconds) MUST raise this or every run over 15s dies as a network_error.
   * Ceiling: Cloudflare cuts the connection at 100s (524).
   */
  connectTimeoutMs?: number;

  /**
   * Hard cap on the whole request, in ms (default 30_000 for JSON calls;
   * streaming calls are uncapped). `null` disables the cap.
   */
  totalTimeoutMs?: number | null;

  /**
   * What a STREAMING call produces. A stream's headers only go out after the
   * server finishes preparing the request, so for streams the header wait is
   * the organization's `agents.run_wait.<kind>_seconds` knob (lib/api/run-wait.ts)
   * — generous for image / video / audio jobs — unless `connectTimeoutMs` is set
   * explicitly. Defaults to "text". Ignored for JSON calls.
   */
  outputKind?: RunOutputKind;

  // ── Context scope overrides ───────────────────────────────────────────────

  /**
   * Override or supplement the auto-resolved scope.
   * Auto-resolved fields (user_id, org, project, task) are filled from Redux —
   * only pass fields you want to explicitly set or override.
   */
  scopeOverrides?: Partial<CallScope>;

  /**
   * This POST is a READ on a route the server declares organization-free
   * (aidream `Depends(organization_free)`) — e.g. the admin grade reads
   * `POST /mandates/impact` and `/mandates/impact/workflows`, which carry an
   * id list too long for a query string. It is treated exactly like a GET:
   * never refused for a missing organization (a read never waits on one); a
   * selected organization still rides along. Never set this on a write or a
   * run — the server refuses those without an organization anyway.
   */
  organizationFreeRead?: true;


  // ── Test / Demo overrides (placeholder) ──────────────────────────────────

  /**
   * Per-call test and demo overrides.
   * Prefixed with `_` to signal non-production use.
   */
  _testOverrides?: TestOverrides;
}

// ============================================================================
// SECTION 6 — CALL RESULT + ERRORS
// ============================================================================

/** The ONE classified call error — `MatrxCallError` from the shared core. */
export type ApiCallError = MatrxCallError;

/** The call result — `MatrxCallResult` from the shared core. */
export type ApiCallResult<T = unknown> = MatrxCallResult<T>;

// ============================================================================
// SECTION 7 — AUTH RESOLUTION
// ============================================================================

/**
 * Resolve the auth mode and build request headers from Redux state.
 *
 * Priority:
 *   1. Authenticated user with JWT token → Bearer token header
 *   2. Admin user (subset of authenticated) → same Bearer token header, mode is 'admin'
 *   3. Guest user with fingerprint → X-Fingerprint-ID header
 *
 * NOTE: This runs synchronously from Redux state snapshot.
 * For the async "wait for auth to be ready" case, see waitForAuthReady().
 */
export function resolveAuth(state: RootState): ResolvedAuth {
  const accessToken = selectAccessToken(state);
  const fingerprintId = selectFingerprintId(state);
  const isAdmin = selectIsSuperAdmin(state);
  const isAuthenticated = selectIsAuthenticated(state);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    return {
      mode: isAdmin ? "admin" : "authenticated",
      headers,
    };
  }

  if (fingerprintId) {
    headers["X-Fingerprint-ID"] = fingerprintId;
    return { mode: "guest", headers };
  }

  // No credentials available yet — return guest headers without fingerprint.
  // The caller should have called waitForAuthReady() before dispatching.
  return { mode: "guest", headers };
}

/**
 * Wait for the Redux auth state to be ready before reading it.
 *
 * Polls getState() directly so there is no Hook dependency.
 * Safe to call from any async thunk.
 *
 * TODO: Consider exposing the fingerprint-fetch fallback (currently only in
 * useApiAuth hook). For thunks, a separate fingerprint-thunk should exist.
 */
export async function waitForAuthReady(
  getState: () => RootState,
  timeoutMs = 1000,
): Promise<boolean> {
  const pollMs = 50;
  let elapsed = 0;

  while (elapsed < timeoutMs) {
    const state = getState();
    const isReady = selectAuthReady(state);
    const hasToken = !!selectAccessToken(state);
    const hasFingerprint = !!selectFingerprintId(state);

    if (isReady || hasToken || hasFingerprint) {
      return true;
    }

    await new Promise<void>((r) => setTimeout(r, pollMs));
    elapsed += pollMs;
  }

  // TODO: Trigger fingerprint-fetch thunk as fallback (same pattern as useApiAuth).
  // For now, warn and proceed — the request will be sent without an auth credential.
  console.warn(
    "[callApi] Auth not ready after timeout — proceeding without credentials.",
  );
  return false;
}

// ============================================================================
// SECTION 8 — URL RESOLUTION
// ============================================================================

/**
 * Resolve the base backend URL from Redux state.
 *
 * Logic:
 *   1. testOverrides.forceBaseUrl always wins (testing/demo bypass)
 *   2. Read selectResolvedBaseUrl from apiConfigSlice — single source of truth
 *      for all users. The active server is whatever Redux says it is.
 *
 * If the resolved URL is undefined (env var not set for the selected environment),
 * an error is thrown so the misconfiguration is immediately obvious.
 */
export function resolveBaseUrl(
  state: RootState,
  testOverrides?: TestOverrides,
): string {
  if (testOverrides?.forceBaseUrl) {
    return testOverrides.forceBaseUrl;
  }

  const url = selectResolvedBaseUrl(state);
  if (!url) {
    const env = state.apiConfig?.activeServer ?? "production";
    throw new Error(
      `[callApi] No URL configured for server environment "${env}". ` +
        `Set the corresponding NEXT_PUBLIC_BACKEND_URL_* env variable, ` +
        `or enter a custom URL via the admin indicator.`,
    );
  }
  return url;
}

// ============================================================================
// SECTION 9 — SCOPE RESOLUTION
// ============================================================================

/**
 * Resolve the context scope from Redux state, merged with any per-call overrides.
 *
 * Fields that are undefined are omitted from the final scope object.
 *
 * Resolve the context scope from Redux state, merged with any per-call overrides.
 *
 * Fields that are null/undefined are omitted from the final scope object.
 */
/**
 * Resolve the organization for THIS call — NEVER by asking the person.
 *
 * 🚨 `callApi` cannot tell a deliberate action from a background one, and most
 * of its traffic is background: fetch-on-mount, react-query refetch (which
 * fires on window REFOCUS), rejoin-on-page-reload, retry/backoff loops, inbox
 * hydration on every conversation open. A census found ~30 such call sites.
 * Prompting here meant alt-tabbing back into the app could raise "Which
 * workspace is this for?" with nothing behind it to explain why.
 *
 * The question belongs where a person actually did something — the upload path
 * (`bindUploadOrganization`) and the AI execution path
 * (`ensureExecutionOrganization`), both of which ask explicitly. Here the
 * behaviour is exactly what it always was: fail closed. This call exists only
 * so a request whose organization one of those seams JUST resolved uses it.
 */
/** GET and HEAD are reads by HTTP contract; every other method is a write. */
export function isReadMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

/**
 * True when, after the platform's bounded wait for a restore in flight, no
 * organization is selected. Never picks one; only answers the question.
 */
export async function readHasNoOrganization(getState: () => RootState): Promise<boolean> {
  // THE ADMIN SEAT binds the platform tenant (lib/api/admin-lane.ts).
  if (adminLaneOrganizationId()) return false;
  if (selectOrganizationId(getState())) return false;
  const { waitForOrganizationAdmission } = await import(
    "@/lib/api/organization-admission"
  );
  const admission = await waitForOrganizationAdmission();
  return admission !== "ready" && !selectOrganizationId(getState());
}

/**
 * THE ONE org resolution for a call (callApi and the global MatrxTransport):
 * the call's own org wins, then the admin seat. Otherwise a WRITE acts in the
 * ACTIVE organization, and `ensureOrgId` holds it until the load ladder has
 * answered from the account: a browser cache may paint an organization first,
 * but no write leaves on it. A read keeps its exemption (it may carry the
 * painted selection). Nothing here ever prompts or picks.
 */
export async function ensureOrganizationContextForCall(
  selectedOrganizationId: string | null | undefined,
  overrideOrganizationId: string | undefined,
  method: string,
): Promise<string> {
  const explicit = overrideOrganizationId ?? adminLaneOrganizationId();
  if (explicit) return requireOrganizationContext(null, explicit);
  if (/^(GET|HEAD|OPTIONS)$/i.test(method)) {
    return requireOrganizationContext(selectedOrganizationId, undefined);
  }
  const { ensureOrgId } = await import("@/lib/organizations/ensureOrgId");
  return ensureOrgId(null);
}

export function resolveScope(
  state: RootState,
  overrides?: Partial<CallScope>,
): ResolvedCallScope;
export function resolveScope(
  state: RootState,
  overrides: Partial<CallScope> | undefined,
  opts: { guestWithoutOrganization: boolean },
): GuestResolvedCallScope;
export function resolveScope(
  state: RootState,
  overrides?: Partial<CallScope>,
  opts?: { guestWithoutOrganization: boolean },
): GuestResolvedCallScope {
  // user_id: userAuth is the auth-domain slice (Phase 4 split — see
  // lib/redux/slices/userAuthSlice.ts); selectUserId is its canonical selector.
  const userId: string | undefined = selectUserId(state) ?? undefined;

  // appContext may be absent in incomplete test/demo stores. That is not a
  // valid request context: the required-org guard below refuses the request.
  const hasAppContext = !!(state as Partial<RootState>)?.appContext;

  const selectedOrganizationId =
    adminLaneOrganizationId() ??
    (hasAppContext ? selectOrganizationId(state) : undefined);
  // The JWT lane is fail-closed (an authenticated request MUST name a
  // verified organization); the guest lane is admitted org-less by the
  // server and never refused here — see GuestResolvedCallScope.
  const organizationId = opts?.guestWithoutOrganization
    ? undefined
    : requireOrganizationContext(
        selectedOrganizationId,
        overrides?.organization_id,
      );

  const resolved: GuestResolvedCallScope = {
    user_id: userId,
    organization_id: organizationId,
    project_id: hasAppContext
      ? (selectProjectId(state) ?? undefined)
      : undefined,
    task_id: hasAppContext ? (selectTaskId(state) ?? undefined) : undefined,
    conversation_id: hasAppContext
      ? (selectConversationId(state) ?? undefined)
      : undefined,
  };

  // Merge caller-supplied non-org overrides. The org was normalized and made
  // non-null above; spreading an explicit `organization_id: undefined` here
  // would silently undo the invariant.
  const { organization_id: _organizationOverride, ...otherOverrides } =
    overrides ?? {};
  return { ...resolved, ...otherOverrides };
}

// ============================================================================
// SECTION 10 — REQUEST BODY ASSEMBLY
// ============================================================================

/**
 * The final request body for `scope` — the shared core's
 * `buildMatrxRequestBody` (UI-only strip, scope injection, the fail-closed
 * body-vs-context organization check).
 */
export function buildRequestBody(
  body: unknown,
  scope: GuestResolvedCallScope,
): unknown {
  return buildMatrxRequestBody(body, scope);
}

// ============================================================================
// SECTION 11 — TEST OVERRIDES APPLICATION
// ============================================================================

/** Apply test-mode header overrides */
function applyTestHeaders(
  headers: Record<string, string>,
  testOverrides?: TestOverrides,
): Record<string, string> {
  if (!testOverrides?.additionalHeaders) return headers;
  return { ...headers, ...testOverrides.additionalHeaders };
}

/** Log redacted request metadata when test overrides request it. */
function maybeLogRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  testOverrides?: TestOverrides,
): void {
  if (!testOverrides?.logRequest) return;
  const safe = buildSafeRequestLog(headers, body);
  console.group(
    `[callApi] ${method.toUpperCase()} ${redactUrlForRequestLog(url)}`,
  );
  console.log("Headers:", safe.headers);
  console.log("Body metadata:", safe.body);
  console.groupEnd();
}

// ============================================================================
// SECTION 12 — ERROR NORMALIZATION
// ============================================================================

// ============================================================================
// SECTION 14 — THE MAIN THUNK CREATOR
// ============================================================================

/**
 * callApi — the single entry point for all Python FastAPI backend calls.
 *
 * Returns an AppThunk that:
 *   1. Waits for auth to be ready
 *   2. Resolves auth headers from Redux
 *   3. Resolves the backend URL from Redux (respecting admin localhost override)
 *   4. Resolves the context scope from Redux (user, org, project, task)
 *   5. Applies test overrides (if any)
 *   6. Executes the request — JSON or NDJSON streaming
 *
 * TypeScript enforces the correct body shape for every path/method combination
 * using the auto-generated @ai-matrx/api/types.
 *
 * Usage — from a component:
 * ```typescript
 * const dispatch = useAppDispatch();
 *
 * await dispatch(callApi({
 *   path: '/ai/agents/{agent_id}',
 *   method: 'POST',
 *   pathParams: { agent_id: promptId },
 *   body: { user_input: message, stream: true, debug: false, client_tools: [] },
 *   stream: true,
 *   onStreamEvent: (event) => handleEvent(event),
 *   onStreamComplete: (_, conversationId) => setConvId(conversationId),
 * }));
 * ```
 *
 * Usage — from another thunk:
 * ```typescript
 * return async (dispatch, getState) => {
 *   const result = await dispatch(callApi({ ... }));
 *   if (result.error) { ... }
 * };
 * ```
 */
export function callApi<
  P extends keyof paths,
  M extends HttpMethod = HttpMethod,
>(
  config: ApiCallConfig<P, M>,
): ThunkAction<Promise<ApiCallResult>, RootState, unknown, Action> {
  return async (_dispatch, getState) => {
    // ── Step 1: Wait for auth ─────────────────────────────────────────────
    await waitForAuthReady(getState);

    const state = getState();

    // ── Step 2: Resolve auth ──────────────────────────────────────────────
    const auth = resolveAuth(state);

    // ── Step 3: Resolve URL ───────────────────────────────────────────────
    const baseUrl = resolveBaseUrl(state, config._testOverrides);
    // Apply the global endpoint-override registry (API version + per-path
    // overrides) to the canonical path BEFORE param substitution. Base URL /
    // server selection (incl. localhost) is untouched — only the path moves.
    const resolvedPath = resolveEndpointPath(
      config.path as string,
      selectEndpointOverrideConfig(state),
    );
    const url = buildMatrxRequestUrl(
      baseUrl,
      resolvedPath,
      config.pathParams as Record<string, string> | undefined,
      config.queryParams,
    );

    // Final resolved target — the base URL cannot change past this point.
    logApiTarget(url, {
      source: "callApi",
      method: config.method,
      channel: config._testOverrides?.forceBaseUrl ? "force" : "global",
      activeServer: state.apiConfig?.activeServer,
      stream: !!config.stream,
    });

    try {
      // ── Step 3b: Resolve the organization, ASKING if we must ────────────
      //
      // `resolveScope` below is fail-closed and synchronous — it throws
      // `organization_context_required` when nothing is selected. Correct, and
      // a dead end on its own: the person is told to go select an organization
      // somewhere else and start over.
      //
      // This turns that dead end into a question. If no organization is
      // selected, the gate opens one dialog, the person picks, the choice
      // becomes their active workspace, and this very request continues with
      // it. Cancelling throws `OrganizationSelectionCancelled`, which callers
      // treat as "nothing happened".
      //
      // It resolves the value BEFORE the assert rather than softening it, so
      // the invariant below is unchanged and `resolveScope` still refuses a
      // request that has no organization. Non-interactive contexts (SSR, no
      // picker mounted) re-throw the original error exactly as before — this is
      // never a fallback, and it never picks an organization for anybody.
      // GUEST LANE (fingerprint / no credential): the server's AuthMiddleware
      // admits this lane org-less (a guest has no membership to verify —
      // matrx-connect 241750bf6), so a guest is NEVER refused for a missing
      // organization and never shown the workspace picker. An explicitly
      // resolved override still binds. The JWT lane below stays fail-closed.
      // Only the FINGERPRINT guest lane is admitted org-less; a request with
      // no credential at all cannot be admitted either way and keeps the
      // fail-closed refusal below.
      const isGuestLane =
        auth.mode === "guest" && !!auth.headers["X-Fingerprint-ID"];
      const guestOverrideOrganizationId =
        config.scopeOverrides?.organization_id;
      const isOrganizationlessGuest =
        isGuestLane && !guestOverrideOrganizationId;
      // 🚨 A READ IS NEVER REFUSED FOR A MISSING ORGANIZATION (Arman,
      // 2026-09-23: "The permission is to the person, not the org"). Whether
      // ONE item opens is the person's access, never the selection, and "no
      // organization selected" is never an error for a read. A signed-in GET
      // with nothing selected — after the bounded wait for a restore in flight,
      // so a real selection still rides along — is SENT without an
      // organization instead of refused; the server's read doors decide, and a
      // route that still needs one answers with its own sentence. Writes and
      // actions keep the fail-closed path below unchanged.
      const isOrganizationlessRead =
        !isGuestLane &&
        !config.scopeOverrides?.organization_id &&
        (isReadMethod(config.method) || config.organizationFreeRead === true) &&
        (await readHasNoOrganization(getState));

      const resolvedOrganizationId = isOrganizationlessGuest || isOrganizationlessRead
        ? undefined
        : isGuestLane
          ? requireOrganizationContext(null, guestOverrideOrganizationId)
          : await ensureOrganizationContextForCall(
              // Fresh, not the `state` captured before the bounded wait: a restore that lands
              // DURING it selects the organization this read must carry (a stale null refused it).
              getState().appContext?.organization_id,
              config.scopeOverrides?.organization_id,
              config.method,
            );

      // ── Step 4: Resolve and validate the complete request context ───────
      const scope = resolveScope(
        getState(),
        {
          ...config.scopeOverrides,
          organization_id: resolvedOrganizationId,
        },
        { guestWithoutOrganization: isOrganizationlessGuest || isOrganizationlessRead },
      );
      if (scope.organization_id !== undefined) {
        assertQueryOrganizationMatchesContext(
          config.queryParams,
          scope.organization_id,
        );
      }

      // ── Step 5: Assemble request body ───────────────────────────────────
      const body = buildRequestBody(config.body, scope);
      const desktopTargetInstanceId =
        state.adminPreferences?.desktopTargetInstanceId ?? null;
      if (
        desktopTargetInstanceId &&
        body &&
        typeof body === "object" &&
        isAiTurnPath(config.path as string)
      ) {
        applyDesktopTargetToRequestBody(body, desktopTargetInstanceId);
      }

      // ── Step 6: Apply test overrides and bind the same org to middleware ─
      // The org-less guest lane sends no X-Organization-Id (server-admitted);
      // every other request binds the SAME organization the scope resolved.
      const headers =
        scope.organization_id === undefined
          ? applyTestHeaders(auth.headers, config._testOverrides)
          : applyOrganizationContextHeader(
              applyTestHeaders(auth.headers, config._testOverrides),
              scope.organization_id,
            );
      maybeLogRequest(url, config.method, headers, body, config._testOverrides);

      // Short-circuit for mock responses (testing only). Context validation
      // intentionally happens first so tests cannot normalize invalid callers.
      if (config._testOverrides?.mockResponse !== undefined) {
        return { data: config._testOverrides.mockResponse };
      }

      // ── Step 6b: THE USAGE GATE (USAGE-GATE.md rules 10-12) ─────────────
      // Every call that starts paid AI work (the census in paidAiPaths.ts).
      // Zero work while the held answer is ok/unknown; while near/over, ONE
      // fresh read, and only a fresh `over` stops the call.
      const isPaidAi = isPaidAiCall(config.method, config.path as string);
      if (isPaidAi) {
        const verdict = await checkUsageBeforeAiCall(_dispatch, getState);
        if (!verdict.allowed) {
          return {
            error: {
              type: "http_error",
              message: verdict.message,
              code: USAGE_LIMIT_REACHED,
            },
          };
        }
      }

      // ── Step 7: Execute ─────────────────────────────────────────────────
      // A stream's header wait is the organization's run-wait knob for what
      // it produces, never the 15 s JSON default: prepared-streaming routes
      // send headers only after server-side preparation (2026-09-22).
      const streamConfig =
        config.stream && config.connectTimeoutMs === undefined
          ? {
              ...config,
              connectTimeoutMs: (
                await resolveRunWait(
                  scope.organization_id,
                  getUserId() ?? null,
                  config.outputKind ?? "text",
                )
              ).firstResponseMs,
            }
          : config;
      const result = await executeMatrxCall<unknown, TypedStreamEvent>(
        {
          url,
          method: config.method,
          headers,
          body,
          stream: !!config.stream,
          signal: streamConfig.signal,
          connectTimeoutMs: streamConfig.connectTimeoutMs,
          totalTimeoutMs: config.totalTimeoutMs,
          onStreamStart: config.onStreamStart,
          onStreamEvent: config.onStreamEvent,
          consumeStream: config.consumeStream,
          onStreamComplete: config.onStreamComplete,
          onStreamError: config.onStreamError,
        },
        { parseStream: parseNdjsonStream },
      );
      if (isPaidAi) {
        // The server's usage refusal → a person gets `over` + the limit
        // dialog; a guest gets the sign-up reminder only, never both.
        if (result.error?.status !== undefined) {
          noticeUsageRefusal(
            result.error.status,
            result.error.serverDetail,
            _dispatch,
            getState,
            result.error.message,
          );
        }
        // Call ended — stale + background refresh, never awaited (rule 8).
        noteAiCallEnded(_dispatch, getState);
      }
      // Single capture chokepoint for backend failures that resolve with an
      // `{ error }` body (non-2xx). Feeds the systemwide Error Inspector.
      if (
        result.error &&
        !cancelledByCaller(config.signal) &&
        shouldCaptureApiError(result.error.status, config.expectedErrorStatuses)
      ) {
        captureApiError(result.error, {
          url,
          method: config.method,
          path: config.path,
          requestId: result.requestId,
        });
      }
      return result;
    } catch (err) {
      const error = normalizeMatrxError(err);
      // Network-layer / thrown failures (timeout, DNS, abort) capture here —
      // UNLESS the stream layer already recorded this exact throw. A dropped
      // NDJSON socket surfaces in `parseNdjsonStream`, which captures it as
      // `agent-stream-transport` (with requestId + conversationId) and
      // re-throws; capturing it again here produced a second, poorer red row
      // for one failure.
      if (!wasStreamErrorCaptured(err) && !cancelledByCaller(config.signal)) {
        captureApiError(error, {
          url,
          method: config.method,
          path: config.path,
        });
      }
      if (config.onStreamError) config.onStreamError(error);
      return { error };
    }
  };
}

export function shouldCaptureApiError(
  status: number | null | undefined,
  expectedErrorStatuses: readonly number[] | undefined,
): boolean {
  return shouldReportMatrxCallError(status, expectedErrorStatuses);
}

/** The four agent-turn endpoints (desktop-target delegation applies to these). */
function isAiTurnPath(path: string): boolean {
  return (
    path === "/ai/agents/{agent_id}" ||
    path === "/ai/agents-blocks/{agent_id}" ||
    path === "/ai/conversations/{conversation_id}" ||
    path === "/ai/manual"
  );
}

