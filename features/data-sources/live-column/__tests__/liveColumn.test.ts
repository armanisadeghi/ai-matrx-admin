import { addressColumns, columnLabelFor, columnTypeFor, declareSpec, fieldLabel, parseRun, totalPoints } from "../liveColumn";

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
});
