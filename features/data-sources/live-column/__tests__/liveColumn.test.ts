import { addressColumns, companyLevelSources, columnLabelFor, columnTypeFor, declareSpec, fieldLabel, parseRun, totalPoints } from "../liveColumn";

describe("a table column from live data", () => {
  it("declares a readable instruction, the one input column and the data source", () => {
    const spec = declareSpec({ sourceKey: "trustpilot_reviews", inputField: "trustpilot_url", outputField: "review_rating" }, "Trustpilot reviews", "Trustpilot URL");
    expect(spec.inputs).toEqual(["trustpilot_url"]);
    expect(spec.data_source).toEqual({ source_key: "trustpilot_reviews", input_field: "trustpilot_url", output_field: "review_rating" });
    expect(String(spec.instruction).length).toBeGreaterThanOrEqual(8);
    expect(spec.enabled).toBe(true);
  });
  it("names columns and picks number columns for numeric-looking fields", () => {
    expect(fieldLabel("employees_in_linkedin")).toBe("Employees In Linkedin");
    expect(columnLabelFor("LinkedIn company", "followers")).toBe("LinkedIn company - Followers");
    expect(columnTypeFor("review_rating")).toBe("number");
    expect(columnTypeFor("company_name")).toBe("text");
  });
  it("offers only columns a person types into", () => {
    const f = [{ parity_type: "formula" }, { parity_type: null, source: "agent" }, { parity_type: "text" }, { parity_type: null }];
    expect(addressColumns(f)).toHaveLength(2);
  });
  it("reads the server's quote and adds columns up", () => {
    const run = parseRun({ rows_seen: 3, says: "x", quote: { rows: 3, records_per_row: 1, points_per_record: 30, points_per_row: 30, points_total: 90, max_rows_per_run: 25, records_per_row_setting: "a.b", max_rows_setting: "a.c" } });
    expect(run.quote?.pointsTotal).toBe(90);
    expect(totalPoints([run.quote, run.quote, null])).toBe(180);
    expect(parseRun(null).quote).toBeNull();
  });
  it("declares what a many-record source keeps and names the column for it", () => {
    const spec = declareSpec({ sourceKey: "trustpilot_reviews", inputField: "u", outputField: "review_rating", keep: "average", recordsPerRow: 10 }, "Trustpilot", "Site");
    expect(spec.data_source).toEqual({ source_key: "trustpilot_reviews", input_field: "u", output_field: "review_rating", keep: "average", records_per_row: 10 });
    expect(columnLabelFor("Trustpilot", "review_rating", "average", 10)).toBe("Trustpilot - Average Review Rating (last 10)");
    expect(columnLabelFor("Trustpilot", "review_rating")).toBe("Trustpilot - Review Rating");
    expect(columnTypeFor("title", "count")).toBe("number");
    expect(columnTypeFor("title", "newest")).toBe("text");
  });
  it("suggests the company-level sources that have the figure", () => {
    const src = (key: string, label: string, records_are: string, output_fields: string[], featured = false) => ({ key, label, records_are, output_fields, featured, input: { kind: "url" } });
    const sources = [
      src("trustpilot_reviews", "Trustpilot reviews", "items", ["review_rating"], true),
      src("glassdoor_company", "Glassdoor company", "entity", ["name", "ratings_overall"], true),
      src("google_maps_place", "Google Maps place", "entity", ["rating", "name"], true),
      src("random_place", "Random", "entity", ["name"]),
    ];
    const got = companyLevelSources("review_rating", sources).map((x) => `${x.source.key}:${x.field}`);
    expect(got).toEqual(["glassdoor_company:ratings_overall", "google_maps_place:rating"]);
    expect(companyLevelSources("review_text", sources)).toEqual([]);
  });
});
