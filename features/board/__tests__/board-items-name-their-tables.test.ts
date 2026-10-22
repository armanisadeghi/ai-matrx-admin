/**
 * A TABLE ITEM NAMES ITS TABLE, AWAKE OR ASLEEP.
 *
 * Live failure (2026-10-22, design boards b5429d60… and 4b1dd15b…): `board_items` gave the design job only each
 * table tile's id, title and kind. Its section tiles never mounted their surface, so `board_open_item` answered
 * "The item's surface did not mount" for every token table, and the agent, with no table id anywhere, passed a TILE
 * id to the records tool ("You do not have access to this record"). Nothing was written.
 * Now every table item carries `table_id` (and a template table its `table_token`) straight from the tile, so the
 * rows are reached through the records tool by id with no tile awake.
 */
import { boardItemsOverview, createItemSurfaceIndex, type BoardItemRow } from "../tools/item-surfaces";
import { customTableOf } from "../items/table-tile";

const SURFACE = "matrx-user/data-tables";

describe("board_items names each table item's table", () => {
  it("a template table tile gives its table id and pack token; other tiles give none", () => {
    expect(customTableOf({ kind: "entity", entity: "data-table", id: "t-color", meta: { table_token: "color", layout: "section" } })).toEqual({
      id: "t-color",
      token: "color",
    });
    // Boards made 2026-10-19 carry the pack token as `meta.token` beside the id.
    expect(customTableOf({ kind: "entity", entity: "data-table", id: "t-old", meta: { token: "spacing" } })).toEqual({ id: "t-old", token: "spacing" });
    expect(customTableOf({ kind: "entity", entity: "data-table", id: "t-mine" })).toEqual({ id: "t-mine" });
    // A schema-table tile (no custom Table id) and a note name no table.
    expect(customTableOf({ kind: "entity", entity: "data-table", id: null, meta: { token: "web_brand_choice" } })).toBeNull();
    expect(customTableOf({ kind: "entity", entity: "note", id: "n-1" })).toBeNull();
  });

  it("asleep (no capture) and never awake, the item still carries table_id and table_token", async () => {
    const rows: BoardItemRow[] = [
      { id: "tile-colors", title: "Colors", kind: "data table", surface: SURFACE, live: false, table: { id: "t-color", token: "color" } },
      { id: "tile-type", title: "Typography", kind: "data table", surface: SURFACE, live: false, table: { id: "t-type", token: "type_style" } },
      { id: "tile-mine", title: "Leads", kind: "data table", surface: SURFACE, live: false, table: { id: "t-leads" } },
      { id: "tile-note", title: "Brief", kind: "note", surface: "matrx-user/notes", live: false },
    ];
    const overview = await boardItemsOverview(rows, createItemSurfaceIndex());
    const byId = Object.fromEntries(overview.items.map((item) => [item.id, item]));
    expect(byId["tile-colors"]).toMatchObject({ table_id: "t-color", table_token: "color" });
    expect(byId["tile-type"]).toMatchObject({ table_id: "t-type", table_token: "type_style" });
    expect(byId["tile-mine"].table_id).toBe("t-leads");
    expect(byId["tile-mine"].table_token).toBeUndefined();
    expect(byId["tile-note"].table_id).toBeUndefined();
    expect(overview.read_in_full).toMatch(/table_id/);
  });
});
