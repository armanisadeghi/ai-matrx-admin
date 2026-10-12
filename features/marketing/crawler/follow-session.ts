/**
 * Follow a crawler run from its durable record after its live stream dropped.
 *
 * WHY THIS EXISTS (2026-10-12, crawl 8beb27cd on goliveinspain.com). The
 * scraper streams every site command over one long NDJSON response and runs
 * it `detach_on_disconnect`: when the socket breaks, the server keeps working
 * and keeps writing `web.crawl_event` rows and the `web.crawl_session` status.
 * The browser side had no way back in — a dropped socket threw out of
 * `streamCommand` and every surface reported the run as FAILED while it was
 * still running (the crawl above kept emitting progress for hours after the
 * "Crawl failed" toast). Chat never showed this because its streams reattach
 * through `/runtime/operations`; the scraper keeps no operation journal, so
 * its reattach is the session row plus its event rows, read directly from
 * Supabase like every other stored crawl fact.
 *
 * The follower polls the session's new events (delivered in sequence order,
 * so the caller's feed keeps moving) and its status, and returns once the
 * session is terminal. A read that fails is retried with backoff and recorded
 * once; it never ends the follow on its own, because the run's truth is the
 * row, and the row outlives any network blip.
 *
 * IT ALWAYS ENDS. Three exits besides a terminal row: the caller's signal
 * (unmount, cancel, re-run), and STALL — no movement for
 * `CRAWL_FOLLOW_STALL_MS`. Movement is a new event whose content differs from
 * the last one of its type once the always-changing fields (timestamp,
 * sequence, elapsed time) are set aside. A server that only repeats the same
 * progress counters is not moving: crawl 8beb27cd sat at `queue_depth 0,
 * in_flight 0` for 13+ hours, writing ~700 identical progress rows an hour,
 * and a follower without this rule would have polled it forever.
 */

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import {
  getCrawl,
  listCrawlEventsAfterSequence,
} from "@/features/marketing/data/service";
import type { CrawlEvent } from "@/features/marketing/types";

/** First poll gap, and the gap while reads succeed. */
export const CRAWL_FOLLOW_POLL_MS = 4_000;
/** Ceiling for the backoff while reads keep failing. */
export const CRAWL_FOLLOW_MAX_BACKOFF_MS = 30_000;
/**
 * No movement for this long ends the follow as `stalled`. Ten minutes: a
 * single page — even a rendered one with screenshots — reports counter
 * movement well inside that, while the stuck runs we have seen sat
 * motionless for hours.
 */
export const CRAWL_FOLLOW_STALL_MS = 10 * 60_000;
/** One page of recovered events; a full page means read again. */
export const CRAWL_FOLLOW_EVENT_PAGE_SIZE = 500;

/** `web.crawl_session.status` values that end a run (DB check constraint). */
const TERMINAL_STATUSES = ["complete", "partial", "failed"] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function isTerminal(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Fields that change on every event and so never count as movement. */
const VOLATILE_EVENT_FIELDS = new Set([
  "ts",
  "sequence",
  "elapsed_ms",
  "run_id",
  "session_id",
  "site_id",
  "event_type",
]);

function movementSignature(row: CrawlEvent): string {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  const stable = Object.keys(payload)
    .filter((key) => !VOLATILE_EVENT_FIELDS.has(key))
    .sort()
    .map((key) => [key, payload[key]]);
  return JSON.stringify([row.message, stable]);
}

export interface FollowedSessionRow {
  status: string;
  error: string | null;
}

export interface FollowCrawlSessionDeps {
  readSession: (
    siteId: string,
    sessionId: string,
    signal?: AbortSignal,
  ) => Promise<FollowedSessionRow>;
  readEventsAfter: (
    siteId: string,
    sessionId: string,
    afterSequence: number,
    limit: number,
    signal?: AbortSignal,
  ) => Promise<CrawlEvent[]>;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  now: () => number;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const defaultDeps: FollowCrawlSessionDeps = {
  readSession: async (siteId, sessionId, signal) => {
    const row = await getCrawl(siteId, sessionId, signal);
    return { status: row.status, error: row.error };
  },
  // The query pages at 500 rows — `CRAWL_FOLLOW_EVENT_PAGE_SIZE` — so the
  // drain loop's "full page means read again" holds.
  readEventsAfter: (siteId, sessionId, afterSequence, _limit, signal) =>
    listCrawlEventsAfterSequence(siteId, sessionId, afterSequence, signal),
  sleep: abortableSleep,
  now: () => Date.now(),
};

export interface FollowCrawlSessionInput {
  siteId: string;
  sessionId: string;
  /** Highest sequence the caller already received live. */
  afterSequence: number;
  signal?: AbortSignal;
  /** Each recovered event row, oldest first, never one the caller already has. */
  onEvent: (row: CrawlEvent) => void;
  /** Override for `CRAWL_FOLLOW_STALL_MS`. */
  stallAfterMs?: number;
}

export interface FollowCrawlSessionOutcome {
  /**
   * The session's terminal status; `aborted` when the caller's signal ended
   * the follow; `stalled` when nothing moved for the stall window.
   */
  status: TerminalStatus | "aborted" | "stalled";
  lastSequence: number;
  /** The session's own error text when it ended `failed`. */
  error: string | null;
}

export async function followCrawlSession(
  input: FollowCrawlSessionInput,
  deps: FollowCrawlSessionDeps = defaultDeps,
): Promise<FollowCrawlSessionOutcome> {
  const stallAfterMs = input.stallAfterMs ?? CRAWL_FOLLOW_STALL_MS;
  let lastSequence = input.afterSequence;
  let delay = CRAWL_FOLLOW_POLL_MS;
  let readFailureRecorded = false;
  let lastMovementAt = deps.now();
  const lastSignatureByType = new Map<string, string>();

  /** Read until a short page: a backlog never loses its tail. */
  const drainEvents = async () => {
    for (;;) {
      const rows = await deps.readEventsAfter(
        input.siteId,
        input.sessionId,
        lastSequence,
        CRAWL_FOLLOW_EVENT_PAGE_SIZE,
        input.signal,
      );
      let advanced = false;
      for (const row of rows) {
        if (row.sequence <= lastSequence) continue;
        lastSequence = row.sequence;
        advanced = true;
        const signature = movementSignature(row);
        if (lastSignatureByType.get(row.event_type) !== signature) {
          lastSignatureByType.set(row.event_type, signature);
          lastMovementAt = deps.now();
        }
        input.onEvent(row);
      }
      if (rows.length < CRAWL_FOLLOW_EVENT_PAGE_SIZE || !advanced) return;
      if (input.signal?.aborted) return;
    }
  };

  while (!input.signal?.aborted) {
    try {
      await drainEvents();
      const session = await deps.readSession(
        input.siteId,
        input.sessionId,
        input.signal,
      );
      if (isTerminal(session.status)) {
        // Rows committed between the event read and the status read (the
        // final `crawl_completed`, most often) still reach the caller.
        await drainEvents();
        return {
          status: session.status,
          lastSequence,
          error: session.error,
        };
      }
      delay = CRAWL_FOLLOW_POLL_MS;
    } catch (error) {
      if (input.signal?.aborted) break;
      if (!readFailureRecorded) {
        readFailureRecorded = true;
        captureError({
          source: "marketing-crawler",
          relation: "scraper:follow-session",
          message:
            error instanceof Error
              ? error.message
              : "Could not read the crawl session while following it.",
          userMessage:
            "Still following the crawl — its record could not be read just now.",
          raw: { siteId: input.siteId, sessionId: input.sessionId, error },
        });
      }
      delay = Math.min(delay * 2, CRAWL_FOLLOW_MAX_BACKOFF_MS);
    }
    if (deps.now() - lastMovementAt >= stallAfterMs) {
      return { status: "stalled", lastSequence, error: null };
    }
    await deps.sleep(delay, input.signal);
  }
  return { status: "aborted", lastSequence, error: null };
}
