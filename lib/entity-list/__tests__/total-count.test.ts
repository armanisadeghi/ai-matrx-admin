import { splitTotalCount } from "../total-count";

describe("splitTotalCount", () => {
  it("reads the total from the first row and strips the key from every row", () => {
    const out = splitTotalCount([
      { id: "a", total_count: "291" },
      { id: "b", total_count: "291" },
    ]);
    expect(out.total).toBe(291);
    expect(out.rows).toEqual([{ id: "a" }, { id: "b" }]);
    for (const r of out.rows) expect("total_count" in r).toBe(false);
  });

  it("is zero for an empty page", () => {
    expect(splitTotalCount([])).toEqual({ total: 0, rows: [] });
  });
});
