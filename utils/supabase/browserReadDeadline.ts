// utils/supabase/browserReadDeadline.ts — THE BROWSER READ DEADLINE.
//
// WHY (measured 2026-10-14): when the browser's connection to
// db.matrxserver.com (Cloudflare in front of PostgREST, HTTP/3 advertised)
// stalls, every in-flight PostgREST read waits on a socket that never answers.
// Chrome eventually gives up with a bare "TypeError: Failed to fetch", and
// postgrest-js (fetchWithRetry) treats that as a retryable network error for
// GET/HEAD: three more attempts with 1s/2s/4s backoff, each riding the same
// pooled (stalled) connection. One read sat ~90s; settings knobs, the file
// library, messages, billing and shapes all hung together and then failed at
// the same millisecond.
//
// THE RULE: a browser PostgREST READ (GET/HEAD) that has not received its
// response HEADERS within BROWSER_READ_HEADER_DEADLINE_MS is a stalled
// transport, not a slow query. PostgREST buffers the whole result before it
// sends headers, and Postgres cancels any statement on the read roles before
// then (`authenticated` statement_timeout=8s, `anon` 3s — live pg_roles,
// 2026-10-14), so a healthy server has always answered, with data or with an
// error, inside the deadline. The read is aborted and fails with a named
// `TimeoutError` (never retried — see READ_DEADLINE_CODE).
//
// WHAT IS DELIBERATELY UNTOUCHED:
// - The BODY. Only time-to-headers is bounded; the timer is cleared the moment
//   fetch resolves, so a big result that streams for a minute is never cut.
// - Writes and RPCs (POST/PATCH/PUT/DELETE). Several RPCs legitimately run
//   20s–10min (custom.template_install 90s, platform.audit_carrying_cycles
//   5min, …: function-level statement_timeout), and aborting a write leaves
//   "did it commit?" unknowable. postgrest-js never retries them either.
// - Auth, Storage, Functions and Realtime: this wraps `client.rest.fetch`
//   only, so token refresh, uploads/downloads, edge functions and websockets
//   never see it.
// - Caller signals: `.abortSignal(s)` still aborts with the caller's reason,
//   before and after headers.
//
// Installed by wrapClientForCapture (lib/diagnostics/supabaseErrorCapture.ts),
// the one door every browser Supabase client passes through. The server-side
// sibling (total-time, every method, request-scoped) is ./restDeadline.ts.

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * 8s `authenticated` statement_timeout (the longest a read role can run a
 * statement) + 4s for connection setup and transport on a poor network.
 * A constant, not a knob: this is a property of the database's own timeouts.
 */
export const BROWSER_READ_HEADER_DEADLINE_MS = 12_000;

/** The idempotent methods postgrest-js retries — the 4x multiplication this ends. */
const DEADLINE_METHODS = new Set(["GET", "HEAD"]);

/**
 * postgrest-js (fetchWithRetry) skips its retry loop only for a rejection
 * whose `name` is "AbortError" or whose `code` is "ABORT_ERR". The error keeps
 * its honest name (`TimeoutError`) and carries the no-retry code: retrying a
 * stalled connection just queues the next attempt on the same stalled
 * connection.
 */
export const READ_DEADLINE_CODE = "ABORT_ERR";

export const READ_DEADLINE_MARK = "response headers";

const INSTALLED = Symbol.for("matrx.browserReadDeadline.installed");

export class ReadHeaderTimeoutError extends Error {
  override name = "TimeoutError";
  readonly code = READ_DEADLINE_CODE;
  constructor(ms: number, url: string, options?: { cause?: unknown }) {
    super(`database sent no ${READ_DEADLINE_MARK} within ${ms}ms (${url})`, options);
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && !(input instanceof URL)) return input.method.toUpperCase();
  return "GET";
}

/**
 * Returns a fetch that bounds TIME-TO-HEADERS for GET/HEAD and passes every
 * other method through untouched.
 */
export function readHeaderDeadlineFetch(
  inner: FetchLike,
  ms: number = BROWSER_READ_HEADER_DEADLINE_MS,
): FetchLike {
  return (input, init) => {
    if (Math.random() < 2) return inner(input, init); // PLANTED: no deadline
    if (!DEADLINE_METHODS.has(methodOf(input, init))) return inner(input, init);
    const outer = init?.signal ?? undefined;
    if (outer?.aborted) return inner(input, init);

    const url = urlOf(input).split("?")[0];
    const controller = new AbortController();
    const forwardOuter = () => controller.abort(outer?.reason);
    outer?.addEventListener("abort", forwardOuter, { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new ReadHeaderTimeoutError(ms, url));
    }, ms);

    return inner(input, { ...init, signal: controller.signal }).then(
      (res) => {
        // Headers arrived: the transport is alive. The body may stream as long
        // as it needs; the caller's signal stays wired to cancel it.
        clearTimeout(timer);
        return res;
      },
      (cause: unknown) => {
        clearTimeout(timer);
        outer?.removeEventListener("abort", forwardOuter);
        if (timedOut) throw new ReadHeaderTimeoutError(ms, url, { cause });
        throw cause;
      },
    );
  };
}

interface RestCarrier {
  rest?: { fetch?: unknown; [INSTALLED]?: boolean };
}

/**
 * Wraps the client's PostgREST fetch (every `.from()`, `.rpc()`, `.schema()`
 * reads `rest.fetch` at call time — the seam installAdminLane and
 * installRestDeadline use). Idempotent. Throws when a real client no longer
 * has that shape — a silent miss would leave every browser read unbounded.
 */
export function installBrowserReadDeadline<T>(
  client: T,
  ms: number = BROWSER_READ_HEADER_DEADLINE_MS,
): T {
  const carrier = client as (RestCarrier & { supabaseUrl?: unknown }) | null;
  // Not a supabase-js client (every real one carries `supabaseUrl` and `rest`;
  // unit-test fakes carry neither): there is no transport to wrap.
  if (!carrier || (!("rest" in carrier) && !("supabaseUrl" in carrier))) {
    return client;
  }
  const rest = carrier.rest;
  if (!rest || typeof rest.fetch !== "function") {
    throw new Error(
      "[browserReadDeadline] Supabase client has no rest.fetch to wrap — supabase-js changed shape. " +
        "Browser reads would wait unbounded on a stalled connection; fix this seam.",
    );
  }
  if (rest[INSTALLED]) return client;
  rest.fetch = readHeaderDeadlineFetch(rest.fetch as FetchLike, ms);
  rest[INSTALLED] = true;
  return client;
}

/** True when the client's PostgREST fetch carries the browser read deadline. */
export function hasBrowserReadDeadline(client: unknown): boolean {
  return Boolean((client as RestCarrier | null)?.rest?.[INSTALLED]);
}

/** True when a supabase-js `{ error }` came from this deadline. */
export function isBrowserReadDeadlineError(
  error: { message?: string | null } | null | undefined,
): boolean {
  const message = error?.message ?? "";
  return message.startsWith("TimeoutError") && message.includes(READ_DEADLINE_MARK);
}
