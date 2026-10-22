// movedFunctionNotice.ts — "this page is out of date" for a moved database function.
//
// WHY: functions move out of Postgres `public` into owner schemas and keep a
// `public` forwarder for 72 hours. A browser tab still running an old bundle
// that calls `supabase.rpc('<name>')` after that gets PostgREST PGRST202
// (function not found). The database publishes the moved names at
// `platform.public_moved_functions()` (anon + authenticated). When a PGRST202
// names a function on that list, the right message is "reload", not a
// mystery error.
//
// RULES: the error is NEVER swallowed or retried — this only ADDS a notice,
// from the one rpc door (wrapClientForCapture). The list is fetched once per
// session, lazily on the first PGRST202, and cached. Any other PGRST202 (a name
// not on the list) shows nothing extra and stays the real error.

export const MOVED_FUNCTION_NOTICE_TEXT = "This page is out of date. Reload to continue.";
const NOTICE_ID = "moved-function-out-of-date";

type MovedRow = { function_name?: unknown };
type ListFetcher = () => PromiseLike<{ data?: unknown; error?: unknown }>;

let fetcher: ListFetcher | null = null;
let cached: Promise<Set<string>> | null = null;

/** The raw (unwrapped) client's door to the list, bound once at client construction. */
export function installMovedFunctionList(fetchList: ListFetcher): void {
  fetcher = fetchList;
}

/** Test seam. */
export function resetMovedFunctionNotice(): void {
  fetcher = null;
  cached = null;
}

function loadMovedNames(): Promise<Set<string>> {
  if (cached) return cached;
  const run = fetcher;
  if (!run) return Promise.resolve(new Set());
  cached = Promise.resolve(run()).then(
    (res) => {
      const rows = Array.isArray(res?.data) ? (res.data as MovedRow[]) : [];
      if (res?.error) cached = null; // not cached on failure: ask again next time
      return new Set(
        rows.map((r) => r.function_name).filter((n): n is string => typeof n === "string"),
      );
    },
    () => {
      cached = null;
      return new Set<string>();
    },
  );
  return cached;
}

async function showReloadNotice(): Promise<void> {
  const { toast } = await import("@/lib/toast");
  toast.info(MOVED_FUNCTION_NOTICE_TEXT, {
    id: NOTICE_ID,
    duration: Infinity,
    action: { label: "Reload", onClick: () => window.location.reload() },
  });
}

/**
 * Call after an rpc resolved with an error. Adds the notice only for a
 * PGRST202 on a moved name; returns whether it did. Never throws.
 */
export async function noticeIfFunctionMoved(
  functionName: string | undefined,
  error: { code?: unknown } | null | undefined,
): Promise<boolean> {
  try {
    if (!functionName || !error || error.code !== "PGRST202") return false;
    const moved = await loadMovedNames();
    if (!moved.has(functionName)) return false;
    await showReloadNotice();
    return true;
  } catch {
    return false;
  }
}
