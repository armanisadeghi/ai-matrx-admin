import { shouldRefreshTopicOverview } from "../../types";

describe("shouldRefreshTopicOverview", () => {
  it.each([
    "search_sources_stored",
    "scrape_complete",
    "scrape_failed",
    "analysis_complete",
    "analysis_failed",
    "synthesis_complete",
    "synthesis_failed",
    "document_complete",
    "pipeline_complete",
  ] as const)(
    "refreshes lifetime counts after durable %s events",
    (eventType) => {
      expect(shouldRefreshTopicOverview(eventType)).toBe(true);
    },
  );

  it.each([
    "search_page_start",
    "scrape_start",
    "analysis_start",
    "synthesis_start",
    "authority_rank_batch",
  ] as const)(
    "does not query the overview for transient %s events",
    (eventType) => {
      expect(shouldRefreshTopicOverview(eventType)).toBe(false);
    },
  );
});
