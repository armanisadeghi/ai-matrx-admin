jest.mock("@/features/marketing/data/service", () => ({
  getCrawl: jest.fn(),
  listCrawlEventsAfterSequence: jest.fn(),
}));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: jest.fn(),
}));

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import {
  CRAWL_FOLLOW_MAX_BACKOFF_MS,
  CRAWL_FOLLOW_POLL_MS,
  followCrawlSession,
  type FollowCrawlSessionDeps,
  type FollowedSessionRow,
} from "@/features/marketing/crawler/follow-session";
import type { CrawlEvent } from "@/features/marketing/types";

function row(sequence: number, eventType = "crawl_progress"): CrawlEvent {
  return {
    id: `event-${sequence}`,
    organization_id: "org-1",
    created_at: "2026-10-12T03:30:00.000Z",
    updated_at: "2026-10-12T03:30:00.000Z",
    created_by: null,
    updated_by: null,
    deleted_at: null,
    version: 1,
    metadata: {},
    custom_fields: {},
    site_id: "site-1",
    session_id: "session-1",
    sequence,
    event_type: eventType,
    phase: null,
    level: "info",
    message: null,
    page_id: null,
    crawl_url_id: null,
    payload: { run_id: "session-1", sequence },
    occurred_at: "2026-10-12T03:30:00.000Z",
  } as CrawlEvent;
}

/** Scripted reads: each poll takes the next session row and event page. */
function scriptedDeps(script: {
  sessions: Array<FollowedSessionRow | Error>;
  events: Array<CrawlEvent[] | Error>;
}): FollowCrawlSessionDeps & { sleeps: number[] } {
  const sleeps: number[] = [];
  return {
    sleeps,
    readSession: jest.fn(async () => {
      const next = script.sessions.shift();
      if (!next) throw new Error("script exhausted");
      if (next instanceof Error) throw next;
      return next;
    }),
    readEventsAfter: jest.fn(async () => {
      const next = script.events.shift() ?? [];
      if (next instanceof Error) throw next;
      return next;
    }),
    sleep: jest.fn(async (ms: number) => {
      sleeps.push(ms);
    }),
  };
}

describe("followCrawlSession — a dropped crawler stream follows the run's record", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delivers new events in order and returns the session's terminal status", async () => {
    const deps = scriptedDeps({
      sessions: [
        { status: "running", error: null },
        { status: "complete", error: null },
      ],
      // poll 1, poll 2, then the final drain after the terminal status
      events: [[row(249), row(250)], [row(251)], [row(252, "crawl_completed")]],
    });
    const seen: number[] = [];

    const outcome = await followCrawlSession(
      {
        siteId: "site-1",
        sessionId: "session-1",
        afterSequence: 248,
        onEvent: (event) => seen.push(event.sequence),
      },
      deps,
    );

    expect(outcome).toEqual({ status: "complete", lastSequence: 252, error: null });
    // The crawl_completed row committed between the event read and the status
    // read still reaches the caller.
    expect(seen).toEqual([249, 250, 251, 252]);
    expect(deps.sleeps).toEqual([CRAWL_FOLLOW_POLL_MS]);
  });

  it("never re-delivers an event the live stream already handed over", async () => {
    const deps = scriptedDeps({
      sessions: [{ status: "partial", error: null }],
      events: [[row(10), row(11), row(12)], []],
    });
    const seen: number[] = [];

    await followCrawlSession(
      {
        siteId: "site-1",
        sessionId: "session-1",
        afterSequence: 11,
        onEvent: (event) => seen.push(event.sequence),
      },
      deps,
    );

    expect(seen).toEqual([12]);
  });

  it("returns the session's own error when the run ended failed", async () => {
    const deps = scriptedDeps({
      sessions: [{ status: "failed", error: "Target closed" }],
      events: [[], []],
    });

    await expect(
      followCrawlSession(
        { siteId: "site-1", sessionId: "session-1", afterSequence: 0, onEvent: () => {} },
        deps,
      ),
    ).resolves.toEqual({ status: "failed", lastSequence: 0, error: "Target closed" });
  });

  it("keeps following through failed reads, backs off, and records the failure once", async () => {
    const deps = scriptedDeps({
      sessions: [{ status: "running", error: null }, { status: "complete", error: null }],
      events: [
        new Error("network down"),
        new Error("network down"),
        new Error("network down"),
        new Error("network down"),
        [],
        [],
        [],
      ],
    });

    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 5, onEvent: () => {} },
      deps,
    );

    expect(outcome.status).toBe("complete");
    expect(deps.sleeps).toEqual([
      CRAWL_FOLLOW_POLL_MS * 2,
      CRAWL_FOLLOW_POLL_MS * 4,
      Math.min(CRAWL_FOLLOW_POLL_MS * 8, CRAWL_FOLLOW_MAX_BACKOFF_MS),
      Math.min(CRAWL_FOLLOW_POLL_MS * 16, CRAWL_FOLLOW_MAX_BACKOFF_MS),
      CRAWL_FOLLOW_POLL_MS,
    ]);
    expect(captureError).toHaveBeenCalledTimes(1);
  });

  it("stops quietly when the caller aborts", async () => {
    const controller = new AbortController();
    controller.abort();
    const deps = scriptedDeps({ sessions: [], events: [] });

    await expect(
      followCrawlSession(
        {
          siteId: "site-1",
          sessionId: "session-1",
          afterSequence: 3,
          signal: controller.signal,
          onEvent: () => {},
        },
        deps,
      ),
    ).resolves.toEqual({ status: "aborted", lastSequence: 3, error: null });
    expect(deps.readSession).not.toHaveBeenCalled();
  });
});
