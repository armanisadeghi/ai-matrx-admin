/** @jest-environment node */
import { aboutTime, parseQuote, readAdvancedEvent, slowCoverage, parseCoverageList } from "../contract";

const covered = (speed: string, secs: number, service = "unlocker") => ({
  service, label: service, speed, typical_seconds: secs, unit: "page", points_per_unit: 12, returns: "", source_key: null, source_label: null, platform: null,
});

describe("advanced-read contract", () => {
  it("parses the quote and keeps an unknown price null, never 0", () => {
    const q = parseQuote({
      allow: "fast",
      items: [{ url: "https://g2.com/x", coverage: [covered("fast", 7)], would_try: ["unlocker"], points_up_to: null }],
      points_up_to_total: null,
      limit_applied: { setting: "knowledge.scraper.advanced_read_max_urls", value: 50, requested: 80 },
    });
    expect(q.items[0].pointsUpTo).toBeNull();
    expect(q.pointsUpToTotal).toBeNull();
    expect(q.limitApplied?.requested).toBe(80);
  });

  it("reads an item, the closing result and the server's one refusal", () => {
    const item = readAdvancedEvent({ event: "data", data: { type: "advanced_read_item", url: "https://a.com", ok: true, reader: "advanced reader", seconds: 7.2, points: 12, markdown: "# A", message: "Read." } });
    expect(item).toMatchObject({ kind: "item", item: { url: "https://a.com", ok: true, points: 12, markdown: "# A" } });
    const result = readAdvancedEvent({ event: "data", data: { type: "advanced_read_result", items: [{ url: "https://a.com", ok: false }], points_total: 3 } });
    expect(result).toMatchObject({ kind: "result", pointsTotal: 3 });
    const refusal = readAdvancedEvent({ event: "error", data: { code: "usage_limit", user_message: "You are out of points." } });
    expect(refusal).toMatchObject({ kind: "refusal", refusal: { code: "usage_limit", message: "You are out of points." } });
    expect(readAdvancedEvent({ event: "heartbeat" })).toBeNull();
  });

  it("offers the slow option only when a non-fast reader covers a page, with its typical time", () => {
    const fast = parseQuote({ items: [{ url: "u", coverage: [covered("fast", 7)], would_try: ["unlocker"], points_up_to: 12 }] });
    expect(slowCoverage(fast.items)).toBeNull();
    const both = parseQuote({ items: [{ url: "u", coverage: [covered("fast", 7), covered("batch", 180, "structured")], would_try: ["unlocker"], points_up_to: 12 }] });
    expect(slowCoverage(both.items)?.service).toBe("structured");
    expect(aboutTime(180)).toBe("about 3 min");
    expect(aboutTime(20)).toBe("about 20 s");
    expect(parseCoverageList([{ nope: 1 }])).toEqual([]);
  });
});
