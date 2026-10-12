jest.mock("@/features/marketing/data/service", () => ({
  getCrawl: jest.fn(),
  listCrawlEventsAfterSequence: jest.fn(),
}));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: jest.fn(),
}));

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import {
  CRAWL_FOLLOW_EVENT_PAGE_SIZE,
  CRAWL_FOLLOW_MAX_BACKOFF_MS,
  CRAWL_FOLLOW_MAX_MS,
  CRAWL_FOLLOW_POLL_MS,
  CRAWL_FOLLOW_STALL_MS,
  followCrawlSession,
  type FollowCrawlSessionDeps,
  type FollowedSessionRow,
} from "@/features/marketing/crawler/follow-session";
import type { CrawlEvent } from "@/features/marketing/types";

function row(
  sequence: number,
  eventType = "crawl_progress",
  payload: Record<string, unknown> = {},
): CrawlEvent {
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
    payload: { run_id: "session-1", sequence, ...payload },
    occurred_at: "2026-10-12T03:30:00.000Z",
  } as CrawlEvent;
}

/** Scripted reads: each poll takes the next session row and event page. */
function scriptedDeps(script: {
  sessions: Array<FollowedSessionRow | Error>;
  events: Array<CrawlEvent[] | Error>;
}): FollowCrawlSessionDeps & { sleeps: number[] } {
  const sleeps: number[] = [];
  let clock = 0;
  return {
    sleeps,
    now: () => clock,
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
      clock += ms;
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

  it("stops as stalled when only identical progress heartbeats arrive", async () => {
    // Crawl 8beb27cd: `running` for 13+ hours, ~700 identical progress rows an
    // hour. Before the stall rule this follow never ended.
    const stuck = { queue_depth: 0, pages_in_flight: 0, pages_fetched: 6 };
    let sequence = 100;
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readSession = jest.fn(async () => ({ status: "running", error: null }));
    deps.readEventsAfter = jest.fn(async () => {
      sequence += 1;
      return [row(sequence, "crawl_progress", { ...stuck, elapsed_ms: sequence * 5000 })];
    });

    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 100, onEvent: () => {} },
      deps,
    );

    expect(outcome.status).toBe("stalled");
    const waited = deps.sleeps.reduce((total, ms) => total + ms, 0);
    expect(waited).toBeGreaterThanOrEqual(CRAWL_FOLLOW_STALL_MS - CRAWL_FOLLOW_POLL_MS);
    expect(waited).toBeLessThanOrEqual(CRAWL_FOLLOW_STALL_MS);
  });

  it("keeps following while the counters move", async () => {
    let sequence = 0;
    let polls = 0;
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readSession = jest.fn(async () => ({
      status: polls > (CRAWL_FOLLOW_STALL_MS / CRAWL_FOLLOW_POLL_MS) * 2 ? "complete" : "running",
      error: null,
    }));
    deps.readEventsAfter = jest.fn(async () => {
      polls += 1;
      sequence += 1;
      return [row(sequence, "crawl_progress", { pages_fetched: sequence })];
    });

    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 0, onEvent: () => {} },
      deps,
    );

    expect(outcome.status).toBe("complete");
  });

  it("stalls when no events arrive at all (a body that ended without its end frame)", async () => {
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readSession = jest.fn(async () => ({ status: "running", error: null }));

    await expect(
      followCrawlSession(
        { siteId: "site-1", sessionId: "session-1", afterSequence: 7, onEvent: () => {} },
        deps,
      ),
    ).resolves.toEqual({
      status: "stalled",
      stallReason: "no_progress",
      lastSequence: 7,
      error: null,
    });
  });

  it("drains a backlog larger than one page, so the completion event is never lost", async () => {
    const page = (from: number, count: number) =>
      Array.from({ length: count }, (_, index) => row(from + index, "page_fetched", { n: from + index }));
    const firstPage = page(1, CRAWL_FOLLOW_EVENT_PAGE_SIZE);
    const tail = [
      ...page(CRAWL_FOLLOW_EVENT_PAGE_SIZE + 1, 3),
      row(CRAWL_FOLLOW_EVENT_PAGE_SIZE + 4, "crawl_completed", { status: "completed" }),
    ];
    const deps = scriptedDeps({
      sessions: [{ status: "complete", error: null }],
      events: [firstPage, tail, [], []],
    });
    const seen: string[] = [];

    const outcome = await followCrawlSession(
      {
        siteId: "site-1",
        sessionId: "session-1",
        afterSequence: 0,
        onEvent: (event) => seen.push(event.event_type),
      },
      deps,
    );

    expect(outcome.lastSequence).toBe(CRAWL_FOLLOW_EVENT_PAGE_SIZE + 4);
    expect(seen.at(-1)).toBe("crawl_completed");
    expect(seen).toHaveLength(CRAWL_FOLLOW_EVENT_PAGE_SIZE + 4);
  });

  /** Follow a session that never ends, with `nextEvent` as each poll's one new row. */
  async function followEndless(nextEvent: (n: number) => CrawlEvent) {
    let polls = 0;
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readSession = jest.fn(async () => ({ status: "running", error: null }));
    deps.readEventsAfter = jest.fn(async () => {
      polls += 1;
      return [nextEvent(polls)];
    });
    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 0, onEvent: () => {} },
      deps,
    );
    return { outcome, waited: deps.sleeps.reduce((total, ms) => total + ms, 0) };
  }

  it("a heartbeat carrying a clock, uptime or byte count is not movement", async () => {
    const { outcome, waited } = await followEndless((n) =>
      row(n, "crawl_progress", {
        pages_fetched: 6,
        uptime_s: n * 5,
        last_activity_at: `2026-10-12T21:${String(n % 60).padStart(2, "0")}:00Z`,
        bytes_downloaded: 1_356_185 + n,
      }),
    );
    expect(outcome).toMatchObject({ status: "stalled", stallReason: "no_progress" });
    expect(waited).toBeLessThanOrEqual(CRAWL_FOLLOW_STALL_MS);
  });

  it("alternating payloads (A, B, A, B) are not movement", async () => {
    const { outcome } = await followEndless((n) =>
      row(n, "crawl_progress", { pages_fetched: n % 2 === 0 ? 6 : 7 }),
    );
    expect(outcome).toMatchObject({ status: "stalled", stallReason: "no_progress" });
  });

  it("a rising work counter of a non-crawl command is movement", async () => {
    let polls = 0;
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readSession = jest.fn(async () => ({
      status: polls > (CRAWL_FOLLOW_STALL_MS / CRAWL_FOLLOW_POLL_MS) * 2 ? "complete" : "running",
      error: null,
    }));
    deps.readEventsAfter = jest.fn(async () => {
      polls += 1;
      return [
        row(polls, "analysis_progress", {
          status: "progress",
          summary: { pages_analyzed: polls, timings: { load: polls } },
        }),
      ];
    });
    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 0, onEvent: () => {} },
      deps,
    );
    expect(outcome.status).toBe("complete");
  });

  it("ends at the overall cap however much the run moves", async () => {
    const { outcome, waited } = await followEndless((n) =>
      row(n, "page_fetched", { url: `https://example.com/${n}` }),
    );
    expect(outcome).toMatchObject({ status: "stalled", stallReason: "time_cap" });
    expect(waited).toBeGreaterThanOrEqual(CRAWL_FOLLOW_MAX_MS - CRAWL_FOLLOW_POLL_MS);
  });

  it("says the record was unreachable when reads keep failing", async () => {
    const deps = scriptedDeps({ sessions: [], events: [] });
    deps.readEventsAfter = jest.fn(async () => {
      throw new Error("network down");
    });
    const outcome = await followCrawlSession(
      { siteId: "site-1", sessionId: "session-1", afterSequence: 0, onEvent: () => {} },
      deps,
    );
    expect(outcome).toMatchObject({ status: "stalled", stallReason: "unreachable" });
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
