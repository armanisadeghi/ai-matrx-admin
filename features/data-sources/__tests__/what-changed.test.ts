import { fieldDelta, firstTab, hasChanges, parseChangeSet, parseHistory, parseSummary, showValue, summaryParts, tabCounts } from "../changes";
import { parseResult, parseSpec } from "../contract";

const summary = { added: 12, changed: 3, gone: 1, unchanged: 40, gone_checked: true, first_fetch: false };

describe("the bar's counts", () => {
  it("reads 12 new · 3 changed · 1 gone", () => {
    expect(summaryParts(parseSummary(summary))).toEqual(["12 new", "3 changed", "1 gone"]);
  });
  it("leaves gone out when it could not be judged, and says nothing for the fetch that made the table", () => {
    expect(summaryParts(parseSummary({ ...summary, gone: null, gone_checked: false }))).toEqual(["12 new", "3 changed"]);
    expect(summaryParts(parseSummary({ ...summary, first_fetch: true }))).toBeNull();
    expect(summaryParts(null)).toBeNull();
  });
  it("knows when nothing moved", () => {
    expect(hasChanges(parseSummary({ ...summary, added: 0, changed: 0, gone: 0 }))).toBe(false);
    expect(hasChanges(parseSummary(summary))).toBe(true);
    expect(hasChanges(parseSummary({ ...summary, first_fetch: true }))).toBe(false);
  });
  it("rides the fetch result and the stored job", () => {
    expect(parseResult({ table_id: "t", changes: summary })?.changes?.added).toBe(12);
    expect(parseSpec({ id: "j", source_key: "s", result: { changes: summary } })?.changes?.changed).toBe(3);
    expect(parseSpec({ id: "j", source_key: "s", result: null })?.changes).toBeNull();
  });
});

describe("numeric deltas", () => {
  it("colours direction and strips float noise: 4.3 → 4.1 is ▼0.2", () => {
    expect(fieldDelta({ type: "number", before: 4.3, after: 4.1 })).toEqual({ delta: "▼0.2", direction: "down" });
    expect(fieldDelta({ type: "number", before: 4.1, after: 4.3 })).toEqual({ delta: "▲0.2", direction: "up" });
    expect(fieldDelta({ type: "number", before: 1000, after: 1250 }).direction).toBe("up");
  });
  it("has no delta for text, empties or equal numbers", () => {
    expect(fieldDelta({ type: "text", before: "a", after: "b" })).toEqual({ delta: null, direction: "same" });
    expect(fieldDelta({ type: "number", before: null, after: 3 }).delta).toBeNull();
    expect(fieldDelta({ type: "number", before: 2, after: 2 }).delta).toBeNull();
  });
  it("shows an empty side as a dash, never a blank", () => {
    expect(showValue(null)).toBe("—");
    expect(showValue("")).toBe("—");
    expect(showValue(true)).toBe("Yes");
  });
});

describe("the change set", () => {
  const raw = {
    job_id: "j2",
    summary,
    added: [{ key: "r9", label: "Great", id: "x" }],
    changed: [{ key: "r1", label: "Old", id: "y", fields_total: 3, fields: [{ field: "Rating", type: "number", before: 4.3, after: 4.1 }, { field: "", type: "text" }] }],
    gone: [{ key: "r0", label: null, id: null }],
    truncated: true,
    gone_note: null,
  };
  it("parses all three lists and drops malformed fields", () => {
    const set = parseChangeSet(raw)!;
    expect(set.added[0]).toEqual({ key: "r9", label: "Great", id: "x" });
    expect(set.changed[0].fields).toHaveLength(1);
    expect(set.changed[0].fieldsTotal).toBe(3);
    expect(set.gone[0].label).toBeNull();
    expect(set.truncated).toBe(true);
  });
  it("opens on the first tab with something in it", () => {
    expect(firstTab(parseSummary(summary))).toBe("added");
    expect(firstTab(parseSummary({ ...summary, added: 0 }))).toBe("changed");
    expect(firstTab(parseSummary({ ...summary, added: 0, changed: 0 }))).toBe("gone");
    expect(tabCounts(parseSummary({ ...summary, gone: null }))).toEqual({ added: 12, changed: 3, gone: null });
  });
});

describe("the refresh history", () => {
  it("lists finished refreshes newest first with counts and cost", () => {
    const runs = parseHistory([
      { id: "j2", status: "done", finished_at: "2026-10-12T10:00:00Z", cost_usd: 0.03, records_billed: 20, result: { changes: summary } },
      { id: "j3", status: "failed", finished_at: null },
      { id: "j1", status: "done", created_at: "2026-10-11T10:00:00Z", cost_usd: "0.03", records_billed: 20, result: { changes: { ...summary, first_fetch: true } } },
    ]);
    expect(runs.map((r) => r.jobId)).toEqual(["j2", "j1"]);
    expect(runs[0].summary?.added).toBe(12);
    expect(runs[1].costUsd).toBe(0.03);
    expect(summaryParts(runs[1].summary)).toBeNull();
  });
});
