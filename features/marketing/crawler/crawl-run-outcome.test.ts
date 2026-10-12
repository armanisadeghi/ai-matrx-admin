import { crawlRunVerdict } from "@/features/marketing/crawler/crawl-run-outcome";

describe("crawlRunVerdict — what a finished crawl call means for its surface", () => {
  it("never reads an aborted stream or follow as a completed crawl", () => {
    // Before: `followedStatus: "aborted"` fell through to "Crawl complete".
    expect(crawlRunVerdict(null, { followedStatus: "aborted" })).toBe("detached");
  });

  it("trusts the run's own completion event first", () => {
    expect(crawlRunVerdict("failed", { followedStatus: "complete" })).toBe("failed");
    expect(crawlRunVerdict("partial", { followedStatus: null })).toBe("partial");
  });

  it("uses the session row's status when the run was followed after a drop", () => {
    expect(crawlRunVerdict(null, { followedStatus: "partial" })).toBe("partial");
    expect(crawlRunVerdict(null, { followedStatus: "complete" })).toBe("complete");
  });

  it("treats a live stream that ended normally as complete", () => {
    expect(crawlRunVerdict(null, { followedStatus: null })).toBe("complete");
  });
});
