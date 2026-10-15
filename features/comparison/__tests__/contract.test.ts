import {
  ComparisonRefusal,
  consumeComparison,
  parseKinds,
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
    expect(res).not.toBeNull();
    expect(res!.items[0].values.overall_rating.is_best).toBe(true);
    expect(res!.items[1].values.overall_rating.is_best).toBe(false);
    expect(res!.total_points).toBe(600);
  });

  it("reads progress, result and refusal events", () => {
    const prog = readEvent({ event: "data", data: { type: "comparison_stage", item_index: 1, item_count: 3, item_label: "Acme", stage: "fetching", label: "Reading", current: 2, total: 10 } });
    expect(prog?.kind).toBe("progress");
    const err = readEvent({ event: "error", data: { code: "usage_limit", user_message: "Out of points." } });
    expect(err?.kind).toBe("refusal");
    expect((err as { refusal: ComparisonRefusal }).refusal.code).toBe("usage_limit");
  });

  it("consumes a stream, surfacing progress then the result", async () => {
    async function* events() {
      yield { event: "data", data: { type: "comparison_stage", item_index: 0, item_count: 2, item_label: "A", stage: "fetching", label: "Reading A" } };
      yield { event: "data", data: { type: "comparison_result", result: {
        kind: "companies_reviews", kind_label: "X", status: "live", primary_field: "overall_rating",
        fields: [], items: [], total_records_billed: 0, total_points: 0, notices: [] } } };
    }
    const seen: string[] = [];
    const result = await consumeComparison(events(), (p) => seen.push(p.itemLabel));
    expect(seen).toEqual(["A"]);
    expect(result.kind).toBe("companies_reviews");
  });

  it("throws the refusal when the stream carries one", async () => {
    async function* events() {
      yield { event: "error", data: { code: "input_error", user_message: "Bad link." } };
    }
    await expect(consumeComparison(events())).rejects.toBeInstanceOf(ComparisonRefusal);
  });
});
