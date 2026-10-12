import type { CrawlStreamResult } from "@/features/marketing/crawler/direct-client";

/**
 * What a finished `startSiteCrawl` call means for the surface that started
 * it. `detached` is the caller's own signal ending the stream or its follow
 * (unmount, cancel, re-run): the crawl itself goes on, so it is neither a
 * success nor a failure and the surface says nothing — the site's durable
 * crawl activity carries the run from there.
 */
export type CrawlRunVerdict = "complete" | "partial" | "failed" | "detached";

/**
 * `fromEvents` is the ending the run's own `crawl_completed` event named
 * (live or recovered), null when none arrived.
 */
export function crawlRunVerdict(
  fromEvents: "complete" | "partial" | "failed" | null,
  result: Pick<CrawlStreamResult, "followedStatus">,
): CrawlRunVerdict {
  if (result.followedStatus === "aborted") return "detached";
  if (fromEvents) return fromEvents;
  if (result.followedStatus === "partial") return "partial";
  return "complete";
}
