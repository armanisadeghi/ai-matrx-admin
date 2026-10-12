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

/** `web.crawl_session.status` values that end a run (DB check constraint). */
const TERMINAL_STATUSES = ["complete", "partial", "failed"] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function isTerminal(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
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
    signal?: AbortSignal,
  ) => Promise<CrawlEvent[]>;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
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
  readEventsAfter: listCrawlEventsAfterSequence,
  sleep: abortableSleep,
};

export interface FollowCrawlSessionInput {
  siteId: string;
  sessionId: string;
  /** Highest sequence the caller already received live. */
  afterSequence: number;
  signal?: AbortSignal;
  /** Each recovered event row, oldest first, never one the caller already has. */
  onEvent: (row: CrawlEvent) => void;
}

export interface FollowCrawlSessionOutcome {
  /** The session's terminal status, or `aborted` when the caller cancelled. */
  status: TerminalStatus | "aborted";
  lastSequence: number;
  /** The session's own error text when it ended `failed`. */
  error: string | null;
}

export async function followCrawlSession(
  input: FollowCrawlSessionInput,
  deps: FollowCrawlSessionDeps = defaultDeps,
): Promise<FollowCrawlSessionOutcome> {
  let lastSequence = input.afterSequence;
  let delay = CRAWL_FOLLOW_POLL_MS;
  let readFailureRecorded = false;

  const drainEvents = async () => {
    const rows = await deps.readEventsAfter(
      input.siteId,
      input.sessionId,
      lastSequence,
      input.signal,
    );
    for (const row of rows) {
      if (row.sequence <= lastSequence) continue;
      lastSequence = row.sequence;
      input.onEvent(row);
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
    await deps.sleep(delay, input.signal);
  }
  return { status: "aborted", lastSequence, error: null };
}
