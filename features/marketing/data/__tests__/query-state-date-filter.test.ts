// A date filter on a server-driven marketing table must survive the URL (2026-10-17 fleet review:
// the codec threw on `kind: "date"`, so every sort/page/search change errored while one was active)
// and a relative preset must reach the server as bounds, not be dropped.
import { decodeFilter, encodeFilter } from "../query-state";
import { dateFilterBounds } from "@ai-matrx/design-system/data-table/date-filter";

describe("marketing table URL codec — date filters", () => {
  it("round-trips an explicit range", () => {
    const filter = { kind: "date" as const, since: "2026-10-01T00:00:00.000Z", until: "2026-10-08T00:00:00.000Z" };
    expect(decodeFilter(encodeFilter(filter))).toEqual(filter);
  });
  it("round-trips an open-ended range", () => {
    expect(decodeFilter(encodeFilter({ kind: "date", since: "2026-10-01T00:00:00.000Z" }))).toEqual({ kind: "date", since: "2026-10-01T00:00:00.000Z" });
  });
  it("keeps a relative preset relative (a shared 'Last hour' link means the last hour)", () => {
    const decoded = decodeFilter(encodeFilter({ kind: "date", preset: "1h", anchor: "2026-10-17T12:00:00.000Z" }));
    expect(decoded).toEqual({ kind: "date", preset: "1h" });
  });
  it("refuses an unknown preset instead of filtering by garbage", () => {
    expect(decodeFilter("date:last:forever")).toBeUndefined();
  });
  it("a preset resolves to bounds the server can apply", () => {
    const bounds = dateFilterBounds({ kind: "date", preset: "1h", anchor: "2026-10-17T12:00:00.000Z" });
    expect(bounds.since).toBe("2026-10-17T11:00:00.000Z");
  });
});
