/**
 * ONE "waiting on you" read per page — the shared store behind `useWaitingRuns`.
 *
 * Four surfaces mount the hook on one page (the header badge, the bell's
 * source, the inbox, the org chart's seat gates). Each used to fetch on mount
 * and again on every announce-channel "open", each with its own timer, so one
 * load of /agents/org-chart sent five `GET /runs/waiting` in 50 s — and when the
 * server was slow, five 15 s timeouts and five captured errors (2026-10-22).
 *
 * Rules this store holds:
 *  - one request in flight at a time; asks made while it runs collapse into ONE
 *    trailing read;
 *  - a burst of hints (announce frames, reconnects) is debounced into one read;
 *  - after a failed read the next automatic read waits (5 s, 10 s, … 60 s);
 *  - the last good rows survive a failed read, and the error is stated beside
 *    them — never an empty "all clear".
 *
 * Pure (no React): `__tests__/waiting-runs-store.test.ts` drives it directly.
 */

import { parseWaitingRuns, type WaitingRunRow } from "./waiting";

export interface WaitingRunsSnapshot {
  rows: WaitingRunRow[];
  loading: boolean;
  /** Set when the projection could not be read — never rendered as "all clear". */
  error: string | null;
}

export type WaitingRunsFetch = () => Promise<{ data?: unknown; error?: { message?: string } | null }>;

export const WAITING_DEBOUNCE_MS = 400;
export const WAITING_BACKOFF_BASE_MS = 5_000;
export const WAITING_BACKOFF_MAX_MS = 60_000;

export interface WaitingRunsStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WaitingRunsSnapshot;
  /** Read now (or as soon as the in-flight read / backoff allows). */
  request: () => void;
  /** A hint that the list may have changed: debounced into one read. */
  schedule: () => void;
  setFetcher: (fetcher: WaitingRunsFetch) => void;
}

export function createWaitingRunsStore(initialFetcher?: WaitingRunsFetch): WaitingRunsStore {
  let fetcher = initialFetcher ?? null;
  let snapshot: WaitingRunsSnapshot = { rows: [], loading: true, error: null };
  const listeners = new Set<() => void>();
  let inFlight = false;
  let trailing = false;
  let failures = 0;
  let backoffUntil = 0;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;

  const emit = (next: WaitingRunsSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const run = async () => {
    if (!fetcher) {
      // No fetcher yet: the first hook mount sets one and asks again.
      trailing = true;
      return;
    }
    inFlight = true;
    trailing = false;
    try {
      const result = await fetcher();
      if (result.error) {
        failures += 1;
        backoffUntil = Date.now() + Math.min(WAITING_BACKOFF_MAX_MS, WAITING_BACKOFF_BASE_MS * 2 ** (failures - 1));
        emit({
          rows: snapshot.rows,
          loading: false,
          error: result.error.message || "Could not check what is waiting on you.",
        });
      } else {
        failures = 0;
        backoffUntil = 0;
        emit({ rows: parseWaitingRuns(result.data), loading: false, error: null });
      }
    } catch (thrown) {
      failures += 1;
      backoffUntil = Date.now() + Math.min(WAITING_BACKOFF_MAX_MS, WAITING_BACKOFF_BASE_MS * 2 ** (failures - 1));
      emit({
        rows: snapshot.rows,
        loading: false,
        error: thrown instanceof Error ? thrown.message : "Could not check what is waiting on you.",
      });
    } finally {
      inFlight = false;
    }
    if (trailing && listeners.size > 0) request();
  };

  function request(): void {
    if (inFlight) {
      trailing = true;
      return;
    }
    const wait = backoffUntil - Date.now();
    if (wait > 0) {
      if (backoffTimer === null) {
        backoffTimer = setTimeout(() => {
          backoffTimer = null;
          request();
        }, wait);
      }
      return;
    }
    void run();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          if (debounce !== null) clearTimeout(debounce);
          if (backoffTimer !== null) clearTimeout(backoffTimer);
          debounce = null;
          backoffTimer = null;
        }
      };
    },
    getSnapshot: () => snapshot,
    request,
    schedule() {
      if (debounce !== null) return;
      debounce = setTimeout(() => {
        debounce = null;
        request();
      }, WAITING_DEBOUNCE_MS);
    },
    setFetcher(next) {
      const first = fetcher === null;
      fetcher = next;
      if (first && trailing) request();
    },
  };
}

/** The page's one store. */
export const waitingRunsStore = createWaitingRunsStore();
