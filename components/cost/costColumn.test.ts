import { costColumn } from "./costColumn";

type Row = { id: string; usd: number | null };
const points = { unit: "points" as const, format: (u: number | null | undefined) => `${Math.round((u ?? 0) * 20000)} pts`, toPoints: (u: number | null | undefined) => (u == null ? null : Math.round(u * 20000)) };
const dollars = { ...points, unit: "usd" as const, format: (u: number | null | undefined) => `$${(u ?? 0).toFixed(2)}` };

describe("costColumn — one per-row cost, in the viewer's unit", () => {
  it("a member's column reads, sorts and copies points", () => {
    const col = costColumn<Row>({ id: "cost", usd: (r) => r.usd, display: points, prefix: "~" });
    expect(col.accessorFn?.({ id: "a", usd: 0.05 })).toBe(1000);
    expect(col.copyValue?.({ id: "a", usd: 0.05 })).toBe("~1000 pts");
    expect(col.format).toEqual({ id: "integer" });
  });

  it("a system admin with dollars on reads dollars, to the cent", () => {
    const col = costColumn<Row>({ id: "cost", usd: (r) => r.usd, display: dollars });
    expect(col.accessorFn?.({ id: "a", usd: 0.05 })).toBe(0.05);
    expect(col.copyValue?.({ id: "a", usd: 0.05 })).toBe("$0.05");
    expect(col.format).toEqual({ id: "currency" });
  });

  it("an unpriced row is blank, never zero", () => {
    const col = costColumn<Row>({ id: "cost", usd: (r) => r.usd, display: points });
    expect(col.accessorFn?.({ id: "a", usd: null })).toBeNull();
    expect(col.copyValue?.({ id: "a", usd: null })).toBe("");
  });
});
