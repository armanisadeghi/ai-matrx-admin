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

/**
 * The phrase every deadline error message carries, wherever it is re-wrapped
 * (postgrest-js prefixes `${name}: `; other layers may not). Detection keys on
 * this phrase alone — never on a prefix format we do not own.
 */
export const READ_DEADLINE_MARK = "sent no response headers within";

/**
 * Functions whose OWN `statement_timeout` (pg_proc.proconfig) exceeds the
 * deadline — live 2026-10-14. All are called with POST today, which the
 * deadline never touches; an rpc call to one with the `get` or `head` option
 * (a GET/HEAD) would be cut at 12s while still working. The guard in
 * browserReadDeadline.test.ts fails on any such call in this repo or in
 * aidream/apps/shared. Refresh with:
 *   select n.nspname||'.'||p.proname, c from pg_proc p join pg_namespace n
 *   on n.oid=p.pronamespace, unnest(p.proconfig) c
 *   where c like 'statement_timeout%';
 */
export const LONG_RUNNING_FUNCTIONS: readonly string[] = [
  "custom.query_visibility_parity", // 20s
  "custom.template_install", // 90s
  "custom.template_restore", // 90s
  "custom.template_uninstall", // 90s
  "custom.template_upgrade", // 90s
  "platform.audit_carrying_cycles", // 5min
  "platform.heal_reachability_drift", // 10min
  "public.reachability_guard_report", // 10min
];

const INSTALLED = Symbol.for("matrx.browserReadDeadline.installed");

export class ReadHeaderTimeoutError extends Error {
  override name = "TimeoutError";
  readonly code = READ_DEADLINE_CODE;
  constructor(ms: number, url: string, options?: { cause?: unknown }) {
    super(`database ${READ_DEADLINE_MARK} ${ms}ms (${url})`, options);
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
 *
 * THE CLOCK COVERS ONLY THE WIRE. supabase-js's own fetch (fetchWithAuth)
 * first awaits the access token — auth init, a lock, maybe a refresh — and
 * only then spreads `init` into the real `fetch(...)`. So `signal` is handed
 * over as a getter and the timer starts the first time it is READ: the moment
 * the request goes to the socket. A slow auth init is never blamed on the
 * database. (Install this INSIDE every other rest.fetch wrapper — one that
 * spreads `init` before awaiting would read the getter early.)
 *
 * The caller's signal is joined with `AbortSignal.any`, which holds no
 * listener on the caller's signal once the request is done, so a long-lived
 * shared signal does not collect one listener per read.
 */
export function readHeaderDeadlineFetch(
  inner: FetchLike,
  ms: number = BROWSER_READ_HEADER_DEADLINE_MS,
): FetchLike {
  return (input, init) => {
    if (!DEADLINE_METHODS.has(methodOf(input, init))) return inner(input, init);
    const outer = init?.signal ?? undefined;
    if (outer?.aborted) return inner(input, init);

    const url = urlOf(input).split("?")[0];
    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let signal: AbortSignal | undefined;
    const wireSignal = (): AbortSignal => {
      if (!signal) {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort(new ReadHeaderTimeoutError(ms, url));
        }, ms);
        signal = outer ? AbortSignal.any([outer, controller.signal]) : controller.signal;
      }
      return signal;
    };

    const next: RequestInit = { ...init };
    Object.defineProperty(next, "signal", {
      get: wireSignal,
      enumerable: true,
      configurable: true,
    });

    return inner(input, next).then(
      (res) => {
        // Headers arrived: the transport is alive. The body may stream as long
        // as it needs; the caller's signal still cancels it.
        clearTimeout(timer);
        return res;
      },
      (cause: unknown) => {
        clearTimeout(timer);
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
 * installRestDeadline use). Install it FIRST, before any other rest.fetch
 * wrapper, so it sits innermost (see readHeaderDeadlineFetch). Idempotent. Throws when a real client no longer
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
  return (error?.message ?? "").includes(READ_DEADLINE_MARK);
}
