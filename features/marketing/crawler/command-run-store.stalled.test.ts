jest.mock("@/features/marketing/crawler/direct-client", () => ({
  ...jest.requireActual("@/features/marketing/crawler/direct-client"),
  followCrawlRun: jest.fn(),
  cancelCrawl: jest.fn(),
}));

import {
  cancelCrawl,
  CrawlRunStalledError,
  followCrawlRun,
} from "@/features/marketing/crawler/direct-client";
import {
  cancelSiteCommandRun,
  clearSiteCommandRun,
  getSiteCommandRun,
  keepWatchingSiteCommandRun,
  startSiteCommandRun,
} from "@/features/marketing/crawler/command-run-store";
import { siteCommandKey } from "@/features/marketing/crawler/site-commands";

/**
 * A command whose follow stalled is STILL RUNNING on the server. Before: the
 * store marked it "failed" ("the run looks stuck") and every surface toasted
 * "… failed". Now it is "stalled" with Keep watching and Cancel.
 */
describe("a stalled site command is never failed", () => {
  const key = siteCommandKey("site-9", "analysis", null);
  const stalled = () =>
    new CrawlRunStalledError({
      sessionId: "session-9",
      siteId: "site-9",
      lastSequence: 41,
      reason: "no_progress",
    });

  afterEach(() => {
    clearSiteCommandRun(key);
    jest.clearAllMocks();
  });

  it("shows stalled, resolves null, and does not reject", async () => {
    const result = await startSiteCommandRun({
      siteId: "site-9",
      mode: "analysis",
      run: async () => {
        throw stalled();
      },
    });

    expect(result).toBeNull();
    const run = getSiteCommandRun(key);
    expect(run?.status).toBe("stalled");
    expect(run?.error).toBeNull();
    expect(run?.stall).toEqual({ reason: "no_progress", lastSequence: 41 });
  });

  it("Keep watching follows from where it stopped and settles complete", async () => {
    const onLateComplete = jest.fn();
    await startSiteCommandRun({
      siteId: "site-9",
      mode: "analysis",
      onLateComplete,
      run: async () => {
        throw stalled();
      },
    });
    jest.mocked(followCrawlRun).mockResolvedValue({
      sessionId: "session-9",
      siteId: "site-9",
      lastSequence: 60,
      followedStatus: "complete",
    });

    await keepWatchingSiteCommandRun(key);

    expect(followCrawlRun).toHaveBeenCalledWith(
      "site-9",
      "session-9",
      41,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(getSiteCommandRun(key)?.status).toBe("complete");
    expect(onLateComplete).toHaveBeenCalledTimes(1);
  });

  it("Cancel asks the server, then follows the run to the outcome it records", async () => {
    await startSiteCommandRun({
      siteId: "site-9",
      mode: "analysis",
      run: async () => {
        throw stalled();
      },
    });
    jest.mocked(followCrawlRun).mockResolvedValue({
      sessionId: "session-9",
      siteId: "site-9",
      lastSequence: 42,
      followedStatus: "partial",
    });

    await cancelSiteCommandRun(key);

    expect(cancelCrawl).toHaveBeenCalledWith("session-9");
    expect(getSiteCommandRun(key)?.status).toBe("complete");
  });
});
