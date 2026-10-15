// "This page's row" (data/this-row.ts): the token is resolved to the page's row before the store is asked,
// and a page that belongs to no row shows NO rows — the token can only ever narrow (row-pages PLAN §3).
import { resolveThisRow, thisRowValues, THIS_ROW, usesThisRow } from "../this-row";

const HARBOR = "0b8f5f0e-1111-4c3e-9d6e-6a1f0f1a0001";

describe("this page's row", () => {
  it("a view without the token is asked exactly as saved", () => {
    expect(resolveThisRow({ status: "Paid" }, undefined)).toEqual({ state: "plain", filters: { status: "Paid" } });
    expect(usesThisRow({ status: "Paid" })).toBe(false);
  });

  it("resolves the token to the owning row, beside the view's other filters", () => {
    expect(resolveThisRow({ client: THIS_ROW, status: "Paid" }, HARBOR)).toEqual({ state: "resolved", filters: { client: HARBOR, status: "Paid" } });
  });

  it("waits while the row is read, and never asks the store with the token", () => {
    expect(resolveThisRow({ client: THIS_ROW }, undefined)).toEqual({ state: "waiting" });
  });

  it("a page that belongs to no row shows no rows, never every row", () => {
    const answer = resolveThisRow({ client: THIS_ROW }, null);
    expect(answer).toEqual({ state: "no-row" });
    expect("filters" in answer).toBe(false);
  });

  it("a row added in the view starts linked to the page's row", () => {
    expect(thisRowValues({ client: THIS_ROW, status: "Paid" }, HARBOR)).toEqual({ client: [HARBOR] });
    expect(thisRowValues({ client: THIS_ROW }, null)).toEqual({});
  });
});
