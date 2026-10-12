"use client";

/**
 * The live buffer for site-command runs.
 *
 * WHY THIS IS NOT COMPONENT STATE. Two consumers need the same run: the
 * surface that launched it (to disable its button and report the result) and
 * the floating `SiteCommandRunWindow`, which `OverlayController` renders at the
 * ROOT of the tree — outside the marketing site provider entirely. A run also
 * has to survive the launching component unmounting when the user navigates to
 * another tab of the same site while it works.
 *
 * WHY NOT REDUX. A page-fetch stream emits crawl events at page speed; a
 * dispatch per event is the freeze class this repo has paid for repeatedly.
 * This is a bounded, ephemeral stream buffer keyed by run, read through
 * `useSyncExternalStore` — not application state, and nothing here is
 * persisted. The DURABLE record is the `web.crawl_session` row the server
 * writes; that is what a reload rejoins (see `useSiteCommandRun`).
 */

import {
  cancelCrawl,
  CrawlRunStalledError,
  followCrawlRun,
  mergeCrawlLiveEvents,
  siteCommandProgressFromEvent,
  type CrawlLiveEvent,
  type CrawlStreamCallbacks,
  type CrawlStreamResult,
} from "@/features/marketing/crawler/direct-client";
import {
  crawlStallMessage,
  type CrawlStallReason,
} from "@/features/marketing/crawler/follow-session";
import {
  SITE_COMMAND_COPY,
  siteCommandKey,
  type SiteCommandMode,
} from "@/features/marketing/crawler/site-commands";

export type SiteCommandStatus =
  | "connecting"
  | "running"
  | "complete"
  | "failed"
  /**
   * Still `running` on the server, but this tab stopped following it (no
   * progress, record unreachable, or the follow's time cap). Never "failed":
   * the server never said so. The window offers Keep watching and Cancel.
   */
  | "stalled";

export interface SiteCommandRunState {
  key: string;
  siteId: string;
  mode: SiteCommandMode;
  /** The page URL for `page_fetch`; null for site-wide commands. */
  target: string | null;
  status: SiteCommandStatus;
  sessionId: string | null;
  events: CrawlLiveEvent[];
  /** Newest narrated line from the server, or our starting sentence. */
  message: string;
  /** Newest counter object the command reported. */
  summary: Record<string, unknown> | null;
  /** Non-fatal per-item errors the command collected and continued through. */
  warnings: string[];
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  /** True when this run was rejoined from a durable session, not started here. */
  reattached: boolean;
  /** Set while `status` is `stalled`: why, and where Keep watching resumes. */
  stall: { reason: CrawlStallReason; lastSequence: number } | null;
}

type Listener = () => void;

const runs = new Map<string, SiteCommandRunState>();
/**
 * The stream (or record-follow) behind each run this tab started. A run
 * deliberately OUTLIVES the component that launched it (THE FLOATING LAW —
 * its window renders at the overlay root), so unmount never stops it; clearing
 * the run or launching it again does. The follower's own stall rule
 * (`follow-session.ts`) bounds a run nobody clears.
 */
const controllers = new Map<string, AbortController>();
const listeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<Listener>();

function emit(key: string): void {
  for (const listener of listeners.get(key) ?? []) listener();
  for (const listener of globalListeners) listener();
}

function patch(key: string, next: Partial<SiteCommandRunState>): void {
  const current = runs.get(key);
  if (!current) return;
  runs.set(key, { ...current, ...next });
  emit(key);
}

export function getSiteCommandRun(key: string): SiteCommandRunState | null {
  return runs.get(key) ?? null;
}

export function subscribeSiteCommandRun(
  key: string,
  listener: Listener,
): () => void {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Drop a finished run so a re-run starts from a clean feed. */
export function clearSiteCommandRun(key: string): void {
  controllers.get(key)?.abort();
  controllers.delete(key);
  lateCompletions.delete(key);
  if (!runs.delete(key)) return;
  emit(key);
}

function seed(input: {
  key: string;
  siteId: string;
  mode: SiteCommandMode;
  target: string | null;
  status: SiteCommandStatus;
  sessionId: string | null;
  startedAt: number;
  reattached: boolean;
}): void {
  runs.set(input.key, {
    key: input.key,
    siteId: input.siteId,
    mode: input.mode,
    target: input.target,
    status: input.status,
    sessionId: input.sessionId,
    events: [],
    message: input.reattached
      ? "Rejoined a run that was already in progress on the server."
      : SITE_COMMAND_COPY[input.mode].startingMessage,
    summary: null,
    warnings: [],
    error: null,
    startedAt: input.startedAt,
    finishedAt: null,
    reattached: input.reattached,
    stall: null,
  });
  emit(input.key);
}

/**
 * Register a run this tab did NOT start — a durable session found still
 * running on load. Its progress events are gone (they were streamed to the
 * tab that launched it), so the surface shows the honest state: what is
 * running, since when, plus whatever the session's own durable rows carry.
 */
export function reattachSiteCommandRun(input: {
  siteId: string;
  mode: SiteCommandMode;
  target: string | null;
  sessionId: string;
  startedAt: number;
}): string {
  const key = siteCommandKey(input.siteId, input.mode, input.target);
  const existing = runs.get(key);
  // A run we are streaming ourselves is always the better record.
  if (existing && existing.sessionId === input.sessionId) return key;
  if (existing && !existing.finishedAt && !existing.reattached) return key;
  seed({
    key,
    siteId: input.siteId,
    mode: input.mode,
    target: input.target,
    status: "running",
    sessionId: input.sessionId,
    startedAt: input.startedAt,
    reattached: true,
  });
  return key;
}

/**
 * Mark a reattached run terminal once its durable session row says so. The
 * stream that would have told us belongs to another tab, so the session row
 * IS the completion signal — never a silent disappearance.
 */
export function settleReattachedSiteCommandRun(input: {
  key: string;
  status: "complete" | "failed";
  message: string;
  error: string | null;
  summary: Record<string, unknown> | null;
}): void {
  const current = runs.get(input.key);
  if (!current || !current.reattached || current.finishedAt) return;
  patch(input.key, {
    status: input.status,
    message: input.message,
    error: input.error,
    summary: input.summary ?? current.summary,
    finishedAt: Date.now(),
  });
}

/** Durable events fetched for a reattached session (page fetches have them). */
export function mergeDurableSiteCommandEvents(
  key: string,
  events: CrawlLiveEvent[],
): void {
  const current = runs.get(key);
  if (!current || events.length === 0) return;
  const merged = mergeCrawlLiveEvents(events, current.events);
  if (merged.length === current.events.length && current.events.length > 0) {
    return;
  }
  patch(key, { events: merged });
}

export interface StartSiteCommandInput {
  siteId: string;
  mode: SiteCommandMode;
  target?: string | null;
  /** The `direct-client` wrapper for this command, already bound to its args. */
  run: (callbacks: CrawlStreamCallbacks) => Promise<CrawlStreamResult>;
  /**
   * The run completed only after it stalled and the person chose Keep
   * watching — `startSiteCommandRun` had already resolved null by then.
   */
  onLateComplete?: (result: CrawlStreamResult) => void | Promise<void>;
}

/** Per-run follow-up for Keep watching (kept beside the controller). */
const lateCompletions = new Map<
  string,
  (result: CrawlStreamResult) => void | Promise<void>
>();

function streamCallbacks(
  key: string,
  signal: AbortSignal,
): CrawlStreamCallbacks {
  return {
    signal,
    onConnected: ({ sessionId }) => patch(key, { sessionId, status: "running" }),
    onEvent: (_streamEvent, crawlEvent) => {
      if (!crawlEvent) return;
      const current = runs.get(key);
      if (!current) return;
      const progress = siteCommandProgressFromEvent(crawlEvent);
      patch(key, {
        status: "running",
        events: mergeCrawlLiveEvents(current.events, [crawlEvent]),
        message: progress?.message || current.message,
        summary: progress?.summary ?? current.summary,
        warnings: progress?.errors.length ? progress.errors : current.warnings,
      });
    },
    // The socket dropped; the command follows the run from its session
    // row and keeps feeding events above. Say so — it is not a failure.
    onTransportLost: () =>
      patch(key, {
        status: "running",
        message: "Connection dropped — still following the run.",
      }),
  };
}

/**
 * Drive one stream or follow to its end and settle the run. Resolves null
 * when the run did NOT settle here — cleared, relaunched, or stalled (still
 * running on the server). Rejects only for a real failure.
 */
async function driveRun(
  key: string,
  mode: SiteCommandMode,
  controller: AbortController,
  run: (callbacks: CrawlStreamCallbacks) => Promise<CrawlStreamResult>,
): Promise<CrawlStreamResult | null> {
  controllers.get(key)?.abort();
  controllers.set(key, controller);
  try {
    const result = await run(streamCallbacks(key, controller.signal));
    if (controller.signal.aborted || result.followedStatus === "aborted") {
      // Cleared or relaunched: the server run goes on; this buffer is done.
      return null;
    }
    const settled = runs.get(key);
    patch(key, {
      status: "complete",
      sessionId: result.sessionId,
      finishedAt: Date.now(),
      stall: null,
      message:
        settled?.message && settled.message !== SITE_COMMAND_COPY[mode].startingMessage
          ? settled.message
          : "Finished.",
    });
    return result;
  } catch (error) {
    if (controller.signal.aborted) return null;
    if (error instanceof CrawlRunStalledError) {
      patch(key, {
        status: "stalled",
        sessionId: error.sessionId,
        message: crawlStallMessage(error.reason),
        stall: { reason: error.reason, lastSequence: error.lastSequence },
      });
      return null;
    }
    patch(key, {
      status: "failed",
      finishedAt: Date.now(),
      stall: null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (controllers.get(key) === controller) controllers.delete(key);
  }
}

/**
 * Keep watching a stalled run: follow its record again from where it
 * stopped, with fresh stall clocks (so "10 minutes" on screen stays true).
 */
export async function keepWatchingSiteCommandRun(key: string): Promise<void> {
  const current = runs.get(key);
  if (!current || current.status !== "stalled" || !current.sessionId || !current.stall) {
    return;
  }
  const { siteId, sessionId, mode } = current;
  const { lastSequence } = current.stall;
  patch(key, {
    status: "running",
    stall: null,
    message: "Watching the run again.",
  });
  const result = await driveRun(key, mode, new AbortController(), (callbacks) =>
    followCrawlRun(siteId, sessionId, lastSequence, callbacks),
  ).catch(() => null);
  if (result) await lateCompletions.get(key)?.(result);
}

/**
 * Ask the server to cancel a stalled run, then follow it to the outcome the
 * server records — a cancel is a request, so the row settles it.
 */
export async function cancelSiteCommandRun(key: string): Promise<void> {
  const current = runs.get(key);
  if (!current?.sessionId) return;
  await cancelCrawl(current.sessionId);
  if (current.status !== "stalled" || !current.stall) return;
  patch(key, { message: "Cancellation requested." });
  await keepWatchingSiteCommandRun(key);
}

/**
 * Launch a command and stream it into the store. Resolves with the result
 * when the run settled here, null when it did not (cleared, relaunched, or
 * STALLED — still running on the server, shown in the window with Keep
 * watching and Cancel). Rejects only for a real failure; the caller reports it.
 */
export async function startSiteCommandRun(
  input: StartSiteCommandInput,
): Promise<CrawlStreamResult | null> {
  const target = input.target ?? null;
  const key = siteCommandKey(input.siteId, input.mode, target);
  if (input.onLateComplete) lateCompletions.set(key, input.onLateComplete);
  else lateCompletions.delete(key);
  controllers.get(key)?.abort();
  seed({
    key,
    siteId: input.siteId,
    mode: input.mode,
    target,
    status: "connecting",
    sessionId: null,
    startedAt: Date.now(),
    reattached: false,
  });
  return driveRun(key, input.mode, new AbortController(), input.run);
}
