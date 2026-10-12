jest.mock("@/features/marketing/crawler/follow-session", () => ({
  ...jest.requireActual("@/features/marketing/crawler/follow-session"),
  followCrawlSession: jest.fn(),
}));

import {
  clearSiteCommandRun,
  getSiteCommandRun,
  startSiteCommandRun,
} from "@/features/marketing/crawler/command-run-store";
import type {
  CrawlStreamCallbacks,
  CrawlStreamResult,
} from "@/features/marketing/crawler/direct-client";
import { siteCommandKey } from "@/features/marketing/crawler/site-commands";

/**
 * A command run's stream — and the record-follow behind it after a drop —
 * must be stoppable. Before: no signal reached `run`, so a follow of a stuck
 * session polled forever, even after the run was cleared.
 */
describe("site command runs carry a signal that clearing or relaunching aborts", () => {
  it("passes a signal and aborts it when the run is cleared", async () => {
    let seen: AbortSignal | undefined;
    const pending = startSiteCommandRun({
      siteId: "site-1",
      mode: "sitemap_sync",
      run: (callbacks: CrawlStreamCallbacks) =>
        new Promise<CrawlStreamResult>((resolve) => {
          seen = callbacks.signal;
          callbacks.signal?.addEventListener("abort", () =>
            resolve({
              sessionId: "s-1",
              siteId: "site-1",
              lastSequence: 0,
              followedStatus: "aborted",
            }),
          );
        }),
    });
    const key = siteCommandKey("site-1", "sitemap_sync", null);

    expect(seen).toBeDefined();
    expect(seen?.aborted).toBe(false);
    clearSiteCommandRun(key);
    expect(seen?.aborted).toBe(true);
    await pending;
    // A cleared run is gone — it is never re-marked "complete" afterwards.
    expect(getSiteCommandRun(key)).toBeNull();
  });

  it("aborts the previous run of the same command when it is launched again", async () => {
    const signals: AbortSignal[] = [];
    const run = (callbacks: CrawlStreamCallbacks) =>
      new Promise<CrawlStreamResult>((resolve) => {
        if (callbacks.signal) signals.push(callbacks.signal);
        callbacks.signal?.addEventListener("abort", () =>
          resolve({ sessionId: "s", siteId: "site-2", lastSequence: 0, followedStatus: "aborted" }),
        );
      });
    const first = startSiteCommandRun({ siteId: "site-2", mode: "sitemap_sync", run });
    const second = startSiteCommandRun({ siteId: "site-2", mode: "sitemap_sync", run });

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    clearSiteCommandRun(siteCommandKey("site-2", "sitemap_sync", null));
    await Promise.all([first, second]);
  });
});
