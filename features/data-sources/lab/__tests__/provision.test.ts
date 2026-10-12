import { estimateTokensForText } from "@ai-matrx/kit/tokens";

import {
  SITE_DATA_RESULT_CHARS,
  buildHandedOver,
  fieldStats,
  fieldsUsed,
  groupByInput,
  modelUsd,
  orderRecords,
  renderRecords,
  toolCallsFor,
  trimGroups,
  type HandedOverKnobs,
  type LabRecord,
} from "../provision";

const A = "https://www.trustpilot.com/review/acmeplumbing.com";
const B = "https://www.trustpilot.com/review/rivalplumbing.com";

function review(input: string, i: number, rating: number, date: string, content: string): LabRecord {
  return {
    review_id: `${input.slice(-12)}-${i}`,
    review_rating: rating,
    review_date: date,
    review_title: `Visit ${i}`,
    review_content: content,
    reviewer_name: `Person ${i}`,
    company_overall_rating: 4.1,
    input: { url: input },
    timestamp: "2026-10-11T00:00:00Z",
  };
}

const records: LabRecord[] = [
  review(A, 1, 5, "2026-09-01", "The technician arrived early and fixed the water heater quickly."),
  review(A, 2, 2, "2026-09-20", "Billing was confusing and the invoice doubled without warning."),
  review(A, 3, 4, "2026-08-11", "Friendly crew, cleaned up after replacing the kitchen faucet."),
  review(B, 1, 1, "2026-09-05", "No one showed up for the scheduled appointment, twice."),
  review(B, 2, 5, "2026-09-25", "Fast drain cleaning, fair price, would hire again."),
];

const knobs = (over: Partial<HandedOverKnobs> = {}): HandedOverKnobs => ({
  fields: ["review_rating", "review_date", "review_content"],
  perInput: 10,
  shape: "json",
  ordering: "as_fetched",
  fieldChars: 0,
  ...over,
});

describe("fieldStats", () => {
  it("lists every field once, skips fetch bookkeeping, counts fill and size", () => {
    const stats = fieldStats(records);
    const names = stats.map((s) => s.name);
    expect(names).toContain("review_content");
    expect(names).not.toContain("input");
    expect(names).not.toContain("timestamp");
    const rating = stats.find((s) => s.name === "review_rating")!;
    expect(rating.kind).toBe("number");
    expect(rating.filled).toBe(5);
    expect(stats.find((s) => s.name === "review_date")!.kind).toBe("date");
    const content = stats.find((s) => s.name === "review_content")!;
    expect(content.chars).toBe(records.reduce((n, r) => n + String(r.review_content).length, 0));
  });

  it("does not count an empty value as filled", () => {
    const stats = fieldStats([{ a: "x" }, { a: "" }, { a: null }]);
    expect(stats[0].filled).toBe(1);
  });
});

describe("groupByInput", () => {
  it("groups by the input link, in first-seen order, labelled by the company", () => {
    const groups = groupByInput(records);
    expect(groups.map((g) => g.key)).toEqual([A, B]);
    expect(groups.map((g) => g.records.length)).toEqual([3, 2]);
    expect(groups[0].label).toBe("acmeplumbing.com");
  });
});

describe("record trimming and order", () => {
  it("cuts each input to perInput after ordering", () => {
    const trimmed = trimGroups(groupByInput(records), { perInput: 1, ordering: "newest" });
    expect(trimmed.map((g) => g.records.length)).toEqual([1, 1]);
    expect(trimmed[0].records[0].review_date).toBe("2026-09-20");
    expect(trimmed[1].records[0].review_date).toBe("2026-09-25");
  });

  it("orders by the record's own rating, never the company rating", () => {
    const low = orderRecords(records, "lowest_rated");
    expect(low[0].review_rating).toBe(1);
    expect(orderRecords(records, "highest_rated")[0].review_rating).toBe(5);
  });

  it("perInput 0 sends no records but keeps the question", () => {
    const h = buildHandedOver(groupByInput(records), knobs({ perInput: 0 }), "Compare.");
    expect(h.recordsSent).toBe(0);
    expect(h.text.startsWith("Compare.")).toBe(true);
  });
});

describe("buildHandedOver", () => {
  it("sends only the chosen fields", () => {
    const h = buildHandedOver(groupByInput(records), knobs({ fields: ["review_rating"] }), "Compare.");
    expect(h.dataText).toContain('"review_rating":5');
    expect(h.dataText).not.toContain("review_content");
    expect(h.dataText).not.toContain("reviewer_name");
  });

  it("counts tokens with the one estimator over the exact text", () => {
    const h = buildHandedOver(groupByInput(records), knobs(), "Compare these companies' reviews.");
    expect(h.tokens).toBe(estimateTokensForText(h.text, "structured"));
    expect(h.chars).toBe(h.text.length);
    expect(h.parts).toHaveLength(2);
    const prose = buildHandedOver(groupByInput(records), knobs({ shape: "markdown" }), "Compare.");
    expect(prose.tokens).toBe(estimateTokensForText(prose.text, "prose"));
  });

  it("fewer fields and records means fewer tokens", () => {
    const groups = groupByInput(records);
    const all = buildHandedOver(groups, knobs(), "Q");
    const lean = buildHandedOver(groups, knobs({ fields: ["review_rating"], perInput: 1 }), "Q");
    expect(lean.tokens).toBeLessThan(all.tokens);
    expect(lean.recordsSent).toBe(2);
  });

  it("cuts long text to fieldChars", () => {
    const h = buildHandedOver(groupByInput(records), knobs({ fieldChars: 10, fields: ["review_content"] }), "Q");
    expect(h.dataText).toContain('"The techni…"');
  });

  it("digest carries the average and the date range", () => {
    const h = buildHandedOver(groupByInput(records), knobs({ shape: "digest" }), "Q");
    expect(h.dataText).toContain("Average review_rating: 3.67 over 3");
    expect(h.dataText).toContain("Dates: 2026-08-11 to 2026-09-20");
  });
});

describe("tool mode", () => {
  it("one call per input with the tool's own args, result carries rendering AND raw records", () => {
    const calls = toolCallsFor(groupByInput(records), 10, "trustpilot_reviews", "Trustpilot reviews");
    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual({ url: A, max_records: 10 });
    const parsed = JSON.parse(calls[0].resultText);
    expect(parsed.record_count).toBe(3);
    expect(parsed.records).toHaveLength(3);
    expect(parsed.rendering).toContain("Live data — Trustpilot reviews (3 records)");
    expect(calls[0].resultTokens).toBe(estimateTokensForText(calls[0].resultText, "structured"));
  });

  it("drops raw records from the tail to fit the result size, and says so", () => {
    const big = Array.from({ length: 30 }, (_, i) => review(A, i, 3, "2026-09-01", "x".repeat(3000)));
    const [call] = toolCallsFor(groupByInput(big), 30, "trustpilot_reviews", "Trustpilot reviews");
    expect(call.resultChars).toBeLessThanOrEqual(SITE_DATA_RESULT_CHARS + 400);
    expect(call.recordsDropped).toBeGreaterThan(0);
    expect(JSON.parse(call.resultText).records_note).toMatch(/left out of `records`/);
  });

  it("the rendering stops at its limit and says where", () => {
    const big = Array.from({ length: 30 }, (_, i) => review(A, i, 3, "2026-09-01", "y".repeat(500)));
    const r = renderRecords(big, "Trustpilot reviews", 3000);
    expect(r.truncated).toBe(true);
    expect(r.text).toMatch(/\[Rendering stopped at \d+ of 30 records/);
  });
});

describe("fieldsUsed", () => {
  it("counts a field as used when the answer repeats its value", () => {
    const answer = "Acme averages 3.67; one reviewer said billing was confusing and the invoice doubled without warning.";
    const use = fieldsUsed(answer, records, ["review_content", "reviewer_name"]);
    expect(use[0].hits).toBe(1);
    expect(use[0].sent).toBe(5);
    expect(use[1].hits).toBe(0);
  });

  it("does not measure values too short to tell, and matches short ones as whole words", () => {
    const rs: LabRecord[] = [{ loc: "US", ok: false, total: 6999, name: "Lowe's" }];
    const use = fieldsUsed("Customers thus far trust Lowe's; 6999 reviews in total.", rs, ["loc", "ok", "total", "name"]);
    expect(use[0].sent).toBe(0);
    expect(use[1].sent).toBe(0);
    expect(use[2]).toMatchObject({ hits: 1, sent: 1 });
    expect(use[3]).toMatchObject({ hits: 1, sent: 1 });
    expect(fieldsUsed("69990 rows", rs, ["total"])[0].hits).toBe(0);
  });
});

describe("modelUsd", () => {
  it("prices per million tokens; null without a price", () => {
    expect(modelUsd({ input: 0.075, output: 0.3 }, 1_000_000, 1_000_000)).toBeCloseTo(0.375);
    expect(modelUsd(null, 10, 10)).toBeNull();
  });
});
