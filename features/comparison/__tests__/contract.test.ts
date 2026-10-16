import {
  ComparisonRefusal,
  parseKinds,
  parseLookup,
  parseRunState,
  parseQuote,
  parseResult,
  readEvent,
} from "../contract";

describe("comparison contract parsing", () => {
  it("parses the kinds list, keeping status and fields", () => {
    const kinds = parseKinds({
      kinds: [
        { key: "companies_reviews", label: "Companies by their reviews", status: "live", source_key: "trustpilot_reviews",
          records_are: "items", records_per_item: 10, primary_field: "overall_rating",
          fields: [{ key: "overall_rating", label: "Overall rating", type: "rating", direction: "higher_better", is_primary: true, help: "" }] },
        { key: "products", label: "Products", status: "coming", source_key: "amazon_product", fields: [] },
      ],
    });
    expect(kinds).toHaveLength(2);
    expect(kinds[0].status).toBe("live");
    expect(kinds[0].fields[0].is_primary).toBe(true);
    expect(kinds[1].status).toBe("coming");
  });

  it("parses a quote", () => {
    const q = parseQuote({ kind: "companies_reviews", kind_label: "X", item_count: 3, records_per_item: 10,
      total_records: 30, points_per_record: 30, total_points: 900, usd_per_record: 0.0015, total_usd: 0.045, note: "" });
    expect(q.total_points).toBe(900);
    expect(q.total_usd).toBeCloseTo(0.045);
  });

  it("parses a result and keeps best-cell flags", () => {
    const res = parseResult({
      kind: "companies_reviews", kind_label: "Companies by their reviews", status: "live", primary_field: "overall_rating",
      fields: [{ key: "overall_rating", label: "Overall rating", type: "rating", direction: "higher_better", is_primary: true, help: "" }],
      items: [
        { item_id: "a", name: "Alpha", rank: 1, table_id: "t1", records_billed: 10, points: 300,
          values: { overall_rating: { value: 4.8, display: "4.8", is_best: true, basis: "" } } },
        { item_id: "b", name: "Bravo", rank: 2, table_id: "t2", records_billed: 10, points: 300,
          values: { overall_rating: { value: 4.5, display: "4.5", is_best: false, basis: "" } } },
      ],
      total_records_billed: 20, total_points: 600, notices: [],
    });
    expect(res?.items[0].values.overall_rating.is_best).toBe(true);
    expect(res?.items[1].values.overall_rating.is_best).toBe(false);
    expect(res?.total_points).toBe(600);
  });

  it("reads progress, result and refusal events", () => {
    const prog = readEvent({ event: "data", data: { type: "comparison_stage", item_index: 1, item_count: 3, item_label: "Acme", stage: "fetching", label: "Reading", current: 2, total: 10 } });
    expect(prog?.kind).toBe("progress");
    const err = readEvent({ event: "error", data: { code: "usage_limit", user_message: "Out of points." } });
    expect(err?.kind).toBe("refusal");
    expect((err as { refusal: ComparisonRefusal }).refusal.code).toBe("usage_limit");
  });

  it("reads the run id that every stream opens with", () => {
    const run = readEvent({ event: "data", data: { type: "comparison_run", run_id: "r1", item_count: 2, labels: ["A", "B"] } });
    expect(run).toEqual({ kind: "run", runId: "r1", labels: ["A", "B"] });
  });

  it("parses a lookup and a run state", () => {
    const l = parseLookup({ kind: "companies_reviews", searches: 1, points: 100, items: [
      { index: 0, query: "Acme", status: "choose", match: null, candidates: [
        { item: { label: "Acme", url: "https://www.trustpilot.com/review/acme.com", website: "acme.com" }, name: "Acme", detail: "acme.com" }] },
    ] });
    expect(l.items[0].status).toBe("choose");
    expect(l.items[0].candidates[0].item.url).toBe("https://www.trustpilot.com/review/acme.com");
    const s = parseRunState({ run_id: "r1", kind: "local_business", status: "running", item_count: 2,
      items: [{ index: 0, label: "A", stage: "waiting_for_provider", stage_label: "Reading", done: false }] });
    expect(s?.items[0].stage).toBe("waiting_for_provider");
    expect(s?.result).toBeNull();
  });
});
