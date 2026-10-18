/**
 * An add-a-row button on a Spaces page opens the row it made in the page's own peek, never the Data route
 * (REVIEW-3 defect 1: the tab left /spaces for /data/<table>/r/<row>).
 */
import { createRowOpener, openRecordPort } from "../row-opener";

describe("the row an add-a-row button made opens in Spaces", () => {
  it("goes to the database block's peek when one is mounted, and never to the page", () => {
    const opener = createRowOpener();
    const peeked: Array<[string, string]> = [];
    const paged: Array<[string, string]> = [];
    opener.register((tableId, recordId) => peeked.push([tableId, recordId]));
    openRecordPort(opener, (t, r) => paged.push([t, r]))({ table: { id: "tasks" }, recordId: "row-1" });
    expect(peeked).toEqual([["tasks", "row-1"]]);
    expect(paged).toEqual([]);
  });

  it("falls back to the record's page only when no block is mounted (never a silent no-op)", () => {
    const paged: Array<[string, string]> = [];
    openRecordPort(createRowOpener(), (t, r) => paged.push([t, r]))({ table: { id: "tasks" }, recordId: "row-1" });
    expect(paged).toEqual([["tasks", "row-1"]]);
  });
});
