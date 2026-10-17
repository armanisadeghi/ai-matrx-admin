import {
  USAGE_REVIEW_FILTER_OPTIONS,
  formatReviewFacet,
  usageColumns,
} from "./usageColumns";

interface Row {
  runs: number;
  issues: number;
}

const read = (row: Row) => ({
  runs: row.runs,
  successes: 0,
  failures: 0,
  lastUsedAt: null,
  costUsd: null,
});

describe("usageColumns — Review", () => {
  it("has no Review column when the entity does not count review issues (agents)", () => {
    const ids = usageColumns<Row>({ read, lastUsedId: "last_used" }).map((c) => c.id);
    expect(ids).toEqual(["runs", "last_used", "success_rate", "failures", "cost"]);
  });

  it("puts Review after Failures, sortable and filterable by the RPC key", () => {
    const cols = usageColumns<Row>({
      read,
      lastUsedId: "last_run",
      review: { read: (row) => row.issues },
    });
    expect(cols.map((c) => c.id)).toEqual([
      "runs",
      "last_run",
      "success_rate",
      "failures",
      "review",
      "cost",
    ]);
    const w = cols.find((c) => c.id === "review")!;
    expect(w.facet).toBe("review");
    expect(w.column.filter).toBe("select");
    expect(w.column.filterOptions).toBe(USAGE_REVIEW_FILTER_OPTIONS);
    expect(w.defaultHidden).toBeFalsy();
    expect(w.column.accessorFn?.({ runs: 3, issues: 2 })).toBe(2);
  });

  it("names the buckets the SQL bucket matcher serves", () => {
    expect(USAGE_REVIEW_FILTER_OPTIONS.map((o) => o.value)).toEqual(["0", "1-5", "6-20", "gt20"]);
    expect(formatReviewFacet("0")).toBe("None");
  });
});
