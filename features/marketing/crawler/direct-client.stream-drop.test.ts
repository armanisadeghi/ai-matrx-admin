/**
 * A crawler stream whose socket breaks is NOT a failed run.
 *
 * Live 2026-10-12 03:30:08Z, crawl 8beb27cd on goliveinspain.com: the browser
 * side of the HTTP/3 stream closed (Caddy: "aborting with incomplete
 * response … context canceled"), the scraper kept crawling and writing
 * progress rows every ~5 s, and the page said "Crawl failed" — because
 * `streamCommand` threw the transport loss straight to every caller. It now
 * follows the run's durable session and settles with the run's real outcome.
 */

jest.mock("@ai-matrx/api", () => ({
  ...jest.requireActual("@ai-matrx/api"),
  sendMatrxRequest: jest.fn(),
}));
jest.mock("@/lib/api/stream-parser", () => ({
  parseNdjsonStream: jest.fn(),
}));
jest.mock("@/lib/api/resolve-service-url", () => ({
  resolveServiceBaseUrl: () => "https://scraper.example.test",
}));
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "token" } },
        error: null,
      }),
    },
  },
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: async () => "3e790542-fdaf-40b2-8bf3-658bf94fe67f",
}));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: jest.fn(),
}));
jest.mock("@/features/marketing/crawler/follow-session", () => ({
  ...jest.requireActual("@/features/marketing/crawler/follow-session"),
  followCrawlSession: jest.fn(),
}));

import { sendMatrxRequest, StreamTransportError } from "@ai-matrx/api";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import type { TypedStreamEvent } from "@/lib/api/types";
import { followCrawlSession } from "@/features/marketing/crawler/follow-session";
import {
  CrawlRunStalledError,
  defaultCrawlOptions,
  startSiteCrawl,
  type CrawlLiveEvent,
} from "@/features/marketing/crawler/direct-client";
import type { CrawlEvent } from "@/features/marketing/types";

const mockedSend = jest.mocked(sendMatrxRequest);
const mockedParse = jest.mocked(parseNdjsonStream);
const mockedFollow = jest.mocked(followCrawlSession);

function acceptedResponse(): Response {
  const headers: Record<string, string> = {
    "X-Crawl-Session-Id": "session-1",
    "X-Site-Id": "site-1",
  };
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => headers[name] ?? null },
  } as unknown as Response;
}

function progress(sequence: number): TypedStreamEvent {
  return {
    event: "data",
    data: { event_type: "crawl_progress", run_id: "session-1", sequence },
  } as unknown as TypedStreamEvent;
}

/** The wire: some live events, then the socket dies ("network error"). */
function streamThatDrops(events: TypedStreamEvent[]) {
  async function* generate(): AsyncGenerator<TypedStreamEvent, void, undefined> {
    for (const event of events) yield event;
    throw new StreamTransportError({ detail: "network error" });
  }
  return { events: generate(), requestId: "8109c3fa", conversationId: null };
}

function durableRow(sequence: number, eventType: string, payload: object): CrawlEvent {
  return {
    id: `event-${sequence}`,
    site_id: "site-1",
    session_id: "session-1",
    sequence,
    event_type: eventType,
    payload: { run_id: "session-1", ...payload },
    occurred_at: "2026-10-12T07:42:40.000Z",
  } as unknown as CrawlEvent;
}

describe("startSiteCrawl when the stream's connection drops", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSend.mockResolvedValue(acceptedResponse());
  });

  it("follows the run from its record instead of failing, feeding recovered events", async () => {
    mockedParse.mockReturnValue(streamThatDrops([progress(247), progress(248)]));
    mockedFollow.mockImplementation(async (input) => {
      input.onEvent(durableRow(249, "crawl_progress", {}));
      input.onEvent(durableRow(250, "crawl_completed", { status: "completed" }));
      return { status: "complete", lastSequence: 250, error: null };
    });
    const onTransportLost = jest.fn();
    const recovered: Array<[TypedStreamEvent | null, CrawlLiveEvent | null]> = [];

    const result = await startSiteCrawl("site-1", defaultCrawlOptions, {
      onTransportLost,
      onEvent: (event, crawlEvent) => recovered.push([event, crawlEvent]),
    });

    expect(result).toEqual({
      sessionId: "session-1",
      siteId: "site-1",
      lastSequence: 250,
      followedStatus: "complete",
    });
    expect(onTransportLost).toHaveBeenCalledWith({
      sessionId: "session-1",
      siteId: "site-1",
    });
    // It resumes AFTER the last live sequence, so nothing is replayed twice.
    expect(mockedFollow).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        sessionId: "session-1",
        afterSequence: 248,
      }),
    );
    const followed = recovered.filter(([event]) => event === null);
    expect(followed.map(([, crawlEvent]) => crawlEvent?.event_type)).toEqual([
      "crawl_progress",
      "crawl_completed",
    ]);
  });

  it("rejects with the run's own error when the followed run failed", async () => {
    mockedParse.mockReturnValue(streamThatDrops([progress(3)]));
    mockedFollow.mockResolvedValue({
      status: "failed",
      lastSequence: 9,
      error: "Target page, context or browser has been closed",
    });

    await expect(
      startSiteCrawl("site-1", defaultCrawlOptions, {}),
    ).rejects.toThrow("Target page, context or browser has been closed");
  });

  it("still fails at once on a server-announced error, without following", async () => {
    async function* generate(): AsyncGenerator<TypedStreamEvent, void, undefined> {
      yield {
        event: "error",
        data: {
          error_type: "canonicalsitecrawl_error",
          message: "boom",
          user_message: "CanonicalSiteCrawl failed unexpectedly",
        },
      } as unknown as TypedStreamEvent;
    }
    mockedParse.mockReturnValue({
      events: generate(),
      requestId: null,
      conversationId: null,
    });

    await expect(
      startSiteCrawl("site-1", defaultCrawlOptions, {}),
    ).rejects.toMatchObject({ detail: "boom" });
    expect(mockedFollow).not.toHaveBeenCalled();
  });
  it("ends a follow that stopped moving as stalled — never 'still following' forever", async () => {
    mockedParse.mockReturnValue(streamThatDrops([progress(12)]));
    mockedFollow.mockResolvedValue({ status: "stalled", lastSequence: 40, error: null });

    const run = startSiteCrawl("site-1", defaultCrawlOptions, {});

    await expect(run).rejects.toBeInstanceOf(CrawlRunStalledError);
    await expect(run).rejects.toMatchObject({
      sessionId: "session-1",
      siteId: "site-1",
      lastSequence: 40,
    });
  });

  it("follows a body that closed cleanly without its end frame, under the same stall rule", async () => {
    async function* closesEarly(): AsyncGenerator<TypedStreamEvent, void, undefined> {
      yield progress(5);
    }
    mockedParse.mockReturnValue({ events: closesEarly(), requestId: null, conversationId: null });
    mockedFollow.mockResolvedValue({ status: "stalled", lastSequence: 5, error: null });

    await expect(startSiteCrawl("site-1", defaultCrawlOptions, {})).rejects.toBeInstanceOf(
      CrawlRunStalledError,
    );
    expect(mockedFollow).toHaveBeenCalledWith(expect.objectContaining({ afterSequence: 5 }));
  });

  it("hands the caller's signal to the follower and reports an abort as aborted, never success", async () => {
    const controller = new AbortController();
    mockedParse.mockReturnValue(streamThatDrops([progress(2)]));
    mockedFollow.mockImplementation(async (input) => {
      expect(input.signal).toBe(controller.signal);
      controller.abort();
      return { status: "aborted", lastSequence: 2, error: null };
    });

    const result = await startSiteCrawl("site-1", defaultCrawlOptions, {
      signal: controller.signal,
    });

    expect(result.followedStatus).toBe("aborted");
  });
});

