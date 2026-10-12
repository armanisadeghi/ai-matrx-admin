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
 * IT ALWAYS ENDS. Exits besides a terminal row: the caller's signal
 * (unmount, cancel, re-run); STALL — no movement for `CRAWL_FOLLOW_STALL_MS`;
 * and the overall cap `CRAWL_FOLLOW_MAX_MS`. Crawl 8beb27cd sat at
 * `queue_depth 0, in_flight 0` for 13+ hours writing ~700 progress rows an
 * hour; a follower without these rules would have polled it forever.
 *
 * MOVEMENT IS DEFINED POSITIVELY, never as "something changed": a heartbeat
 * carrying a clock, an uptime or byte count, or two payloads that alternate,
 * must never read as progress. It is exactly one of
 *   - a page-level event (`PAGE_LEVEL_EVENTS`),
 *   - a step/status transition seen for the first time (initialize steps and
 *     every command's `started → progress → ok` status),
 *   - a known work counter (`PROGRESS_COUNTERS`, from the scraper's event
 *     contracts in matrx_scraper/web_crawl/contracts.py) rising above the
 *     highest value seen so far. The first value seen is only a baseline.
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
/**
 * However much it moves, a follow ends after this long and the run shows as
 * stalled (with Keep watching). Generous: the largest crawls we allow
 * (50,000 pages) finish well inside it.
 */
export const CRAWL_FOLLOW_MAX_MS = 12 * 60 * 60_000;
/** One page of recovered events; a full page means read again. */
export const CRAWL_FOLLOW_EVENT_PAGE_SIZE = 500;

/** `web.crawl_session.status` values that end a run (DB check constraint). */
const TERMINAL_STATUSES = ["complete", "partial", "failed"] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function isTerminal(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Events that are themselves a unit of work done. */
export const PAGE_LEVEL_EVENTS: ReadonlySet<string> = new Set([
  "page_fetched",
  "page_failed",
  "page_captured",
  "issue_detected",
  "crawl_completed",
]);

/** Events whose (step, status) transition is the progress. */
const TRANSITION_EVENTS: ReadonlySet<string> = new Set([
  "initialize_step",
  "site_initialization_progress",
  "sitemap_sync_progress",
  "gsc_sync_progress",
  "url_reconciliation_progress",
  "link_resolution_progress",
  "link_check_progress",
  "link_score_progress",
  "analysis_progress",
]);

/**
 * Work counters that only rise while work is done, per event type. A dotted
 * path reads inside the payload (`summary.pages_analyzed`). Never bytes,
 * clocks, queue depth or in-flight counts — those move without work finishing.
 */
export const PROGRESS_COUNTERS: Readonly<Record<string, readonly string[]>> = {
  crawl_progress: [
    "pages_fetched",
    "pages_failed",
    "pages_downloaded",
    "pages_unchanged",
    "screenshots_captured",
    "screenshots_failed",
  ],
  sitemap_sync_progress: ["summary.found", "summary.urls", "summary.pages_upserted"],
  gsc_sync_progress: ["summary.pages", "summary.stats_rows"],
  url_reconciliation_progress: ["summary.pages_scanned", "summary.relations_scanned"],
  link_resolution_progress: ["summary.scanned", "summary.resolved", "summary.unresolved"],
  link_check_progress: [
    "summary.internal_scanned",
    "summary.internal_updated",
    "summary.external_checked",
  ],
  link_score_progress: ["summary.nodes", "summary.edges_scanned", "summary.pages_scored"],
  analysis_progress: ["summary.pages_analyzed", "summary.checks_run", "summary.results_written"],
};

function readNumber(payload: Record<string, unknown>, path: string): number | null {
  let value: unknown = payload;
  for (const part of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Tracks movement for one follow. `observe` returns true only for real work:
 * see the module header for the definition.
 */
export function createMovementTracker(): { observe: (row: CrawlEvent) => boolean } {
  const highWater = new Map<string, number>();
  const transitions = new Set<string>();
  return {
    observe: (row) => {
      if (PAGE_LEVEL_EVENTS.has(row.event_type)) return true;
      const payload =
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : {};
      let moved = false;
      if (TRANSITION_EVENTS.has(row.event_type)) {
        const transition = `${row.event_type}:${String(payload.step ?? "")}:${String(payload.status ?? "")}`;
        if (!transitions.has(transition)) {
          transitions.add(transition);
          moved = true;
        }
      }
      for (const path of PROGRESS_COUNTERS[row.event_type] ?? []) {
        const value = readNumber(payload, path);
        if (value === null) continue;
        const key = `${row.event_type}.${path}`;
        const previous = highWater.get(key);
        if (previous === undefined || value > previous) highWater.set(key, value);
        if (previous !== undefined && value > previous) moved = true;
      }
      return moved;
    },
  };
}

/**
 * Why a follow ended without a terminal row. `unreachable`: the record could
 * not be read; `no_progress`: it was read and nothing moved; `time_cap`:
 * `CRAWL_FOLLOW_MAX_MS` passed.
 */
export type CrawlStallReason = "no_progress" | "unreachable" | "time_cap";

/** The one sentence a surface shows for a stalled run. */
export function crawlStallMessage(reason: CrawlStallReason): string {
  if (reason === "unreachable") return "Can't reach the run's record right now";
  if (reason === "time_cap") {
    return `Still running after ${Math.round(CRAWL_FOLLOW_MAX_MS / 3_600_000)} hours`;
  }
  return `No progress for ${Math.round(CRAWL_FOLLOW_STALL_MS / 60_000)} minutes`;
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
  /** Override for `CRAWL_FOLLOW_MAX_MS`. */
  maxFollowMs?: number;
}

export interface FollowCrawlSessionOutcome {
  /**
   * The session's terminal status; `aborted` when the caller's signal ended
   * the follow; `stalled` when nothing moved for the stall window.
   */
  status: TerminalStatus | "aborted" | "stalled";
  /** Set when `status` is `stalled`. */
  stallReason?: CrawlStallReason;
  lastSequence: number;
  /** The session's own error text when it ended `failed`. */
  error: string | null;
}

export async function followCrawlSession(
  input: FollowCrawlSessionInput,
  deps: FollowCrawlSessionDeps = defaultDeps,
): Promise<FollowCrawlSessionOutcome> {
  const stallAfterMs = input.stallAfterMs ?? CRAWL_FOLLOW_STALL_MS;
  const maxFollowMs = input.maxFollowMs ?? CRAWL_FOLLOW_MAX_MS;
  let lastSequence = input.afterSequence;
  let delay = CRAWL_FOLLOW_POLL_MS;
  let readFailureRecorded = false;
  let consecutiveReadFailures = 0;
  // Every follow — including Keep watching — starts its own clocks, so the
  // stall window a surface names is the window that actually passed.
  const startedAt = deps.now();
  let lastMovementAt = startedAt;
  const movement = createMovementTracker();

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
        if (movement.observe(row)) lastMovementAt = deps.now();
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
      consecutiveReadFailures = 0;
    } catch (error) {
      if (input.signal?.aborted) break;
      consecutiveReadFailures += 1;
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
    const now = deps.now();
    if (now - startedAt >= maxFollowMs) {
      return { status: "stalled", stallReason: "time_cap", lastSequence, error: null };
    }
    if (now - lastMovementAt >= stallAfterMs) {
      return {
        status: "stalled",
        stallReason: consecutiveReadFailures > 0 ? "unreachable" : "no_progress",
        lastSequence,
        error: null,
      };
    }
    await deps.sleep(delay, input.signal);
  }
  return { status: "aborted", lastSequence, error: null };
}
