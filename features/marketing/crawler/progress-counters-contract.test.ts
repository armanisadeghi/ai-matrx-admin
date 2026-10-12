/**
 * The follower's movement counters must exist, as numbers, on the payloads the
 * scraper STORES in web.crawl_event. Since aidream ea11268884 every site
 * command's progress event is persisted (before that, none were — so a
 * dropped command had nothing to follow). The shapes below are the stored
 * payloads, field for field from matrx_scraper/web_crawl/contracts.py (the
 * scraper's own test, test_command_progress_is_durable.py, pins the same
 * paths from its side). Rename a counter on either side and one test fails.
 */

jest.mock("@/features/marketing/data/service", () => ({
  getCrawl: jest.fn(),
  listCrawlEventsAfterSequence: jest.fn(),
}));

import {
  PROGRESS_COUNTERS,
  createMovementTracker,
} from "@/features/marketing/crawler/follow-session";
import type { CrawlEvent } from "@/features/marketing/types";

const base = { run_id: "s-1", session_id: "s-1", site_id: "site-1", status: "progress", message: "m" };

/** One stored payload per command type, every summary counter present. */
const STORED: Record<string, Record<string, unknown>> = {
  crawl_progress: {
    ...base,
    queue_depth: 0,
    pages_failed: 0,
    pages_fetched: 6,
    pages_in_flight: 0,
    bytes_downloaded: 1_356_185,
    pages_discovered: 6,
    pages_downloaded: 6,
    pages_unchanged: 0,
    screenshots_captured: 0,
    screenshots_failed: 0,
    elapsed_ms: 1,
  },
  sitemap_sync_progress: {
    ...base,
    summary: { found: 0, urls: 0, pages_upserted: 0, truncated: false },
    errors: [],
  },
  gsc_sync_progress: {
    ...base,
    summary: {
      property: "",
      days: 0,
      pages: 0,
      stats_rows: 0,
      submitted_sitemaps: [],
      skipped_out_of_scope: 0,
      errors: [],
    },
  },
  url_reconciliation_progress: {
    ...base,
    summary: {
      pages_scanned: 0,
      relations_scanned: 0,
      aliases_matched: 0,
      pointers_changed: 0,
      gsc_rows_moved: 0,
      sitemap_memberships_moved: 0,
      cycles: 0,
      intent_conflicts: 0,
    },
  },
  link_resolution_progress: { ...base, summary: { scanned: 0, resolved: 0, unresolved: 0 } },
  link_check_progress: {
    ...base,
    summary: {
      internal_scanned: 0,
      internal_updated: 0,
      internal_uncrawled: 0,
      external_checked: 0,
      external_ok: 0,
      external_broken: 0,
    },
  },
  link_score_progress: {
    ...base,
    summary: { nodes: 0, edges_scanned: 0, edges_resolved: 0, pages_scored: 0, top_score: null },
  },
  analysis_progress: {
    ...base,
    summary: { pages_total: 0, pages_analyzed: 0, checks_run: 0, results_written: 0, timings: {} },
  },
};

function read(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (value, part) =>
      value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined,
    payload,
  );
}

function storedRow(eventType: string, sequence: number, payload: Record<string, unknown>): CrawlEvent {
  return {
    id: `e-${sequence}`,
    event_type: eventType,
    sequence,
    message: "m",
    payload: { ...payload, event_type: eventType, sequence },
  } as unknown as CrawlEvent;
}

describe("PROGRESS_COUNTERS against the stored command payloads", () => {
  it("covers every command type the scraper now stores", () => {
    expect(Object.keys(PROGRESS_COUNTERS).sort()).toEqual(Object.keys(STORED).sort());
  });

  it.each(Object.entries(PROGRESS_COUNTERS))(
    "%s: every counter path is a number on the stored payload",
    (eventType, paths) => {
      for (const path of paths) {
        expect(typeof read(STORED[eventType] ?? {}, path)).toBe("number");
      }
    },
  );

  it.each(Object.entries(PROGRESS_COUNTERS))(
    "%s: a stored row whose counter rises reads as movement",
    (eventType, paths) => {
      const tracker = createMovementTracker();
      const first = STORED[eventType] ?? {};
      const [path] = paths;
      if (!path) throw new Error("no counter");
      const bumped = structuredClone(first);
      const parts = path.split(".");
      const leafKey = parts.pop() as string;
      const holder = parts.reduce<Record<string, unknown>>(
        (value, part) => value[part] as Record<string, unknown>,
        bumped,
      );
      holder[leafKey] = (holder[leafKey] as number) + 1;
      tracker.observe(storedRow(eventType, 1, first));
      expect(tracker.observe(storedRow(eventType, 2, first))).toBe(false);
      expect(tracker.observe(storedRow(eventType, 3, bumped))).toBe(true);
    },
  );
});
