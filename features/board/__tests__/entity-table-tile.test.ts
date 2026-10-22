// A board table tile can show a REAL SCHEMA TABLE (a registered entity token made with
// platform.create_entity_table), optionally one parent's rows — not only a custom Table. A pack tile may name an
// entity instead of a spec table, and the plan turns it into that tile without installing anything. Fails
// without entityTableOf / entityTableSource and the plan's entity branch.

import { planPackBoards } from "../templates/board-pack-plan";
import { TABLE_ENTITY, TABLE_LAYOUT_SECTION, entityTableOf, entityTableSource } from "../items/table-tile";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkPack } from "@/lib/spaces-blocks/template-pack-check";
import { BRAND_ASSET_TOKEN, withBrandAssets } from "../design-brand/brand-assets-tile";
import { startNewEntries, type BoardItemType } from "../items/types";

const PACK_JSON = readFileSync(join(__dirname, "../../spaces/templates/packs/design-system-board.pack.json"), "utf8");

/** The checker's findings about one extra tile added to a real pack's first chapter. */
function checkBoardPack(tile: Record<string, unknown>): string[] {
  const pack = JSON.parse(PACK_JSON) as { board: { chapters: { tiles: unknown[] }[] } };
  const chapter = pack.board.chapters[0]!;
  const at = chapter.tiles.length;
  chapter.tiles.push(tile);
  return checkPack(pack)
    .map((f) => JSON.stringify(f))
    .filter((f) => f.includes(`chapters[0].tiles[${at}]`));
}

const BRAND = "b1000000-0000-4000-8000-000000000001";

describe("a table tile over a real schema table", () => {
  it("round-trips the token, the parent filter and the section layout through the tile's meta", () => {
    const source = entityTableSource("web_brand_choice", { filter: { brand_id: BRAND }, layout: "section" });
    expect(source).toEqual({ kind: "entity", entity: TABLE_ENTITY, id: null, meta: { token: "web_brand_choice", filter: JSON.stringify({ brand_id: BRAND }), layout: TABLE_LAYOUT_SECTION } });
    expect(entityTableOf(source)).toEqual({ token: "web_brand_choice", filter: { brand_id: BRAND } });
  });

  it("a custom Table tile is not an entity tile", () => {
    expect(entityTableOf({ kind: "entity", entity: TABLE_ENTITY, id: "00000000-0000-4000-8000-000000000001" })).toBeNull();
  });

  it("a filter that is not JSON is dropped loudly, never read as 'every parent'", () => {
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(entityTableOf({ kind: "entity", entity: TABLE_ENTITY, id: null, meta: { token: "web_brand_choice", filter: "{nope" } })).toEqual({ token: "web_brand_choice" });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("a pack tile naming an entity becomes that tile, with nothing installed", () => {
    const [top] = planPackBoards(
      { key: "brand", title: "Brand", layout: "page", chapters: [{ title: "Choices", tiles: [{ kind: "table", title: "Choices", entity: "web_brand_choice", layout: "section", size: { w: 640, h: 400 } }] }] },
      {},
      () => "id",
    );
    const tile = top!.doc.nodes[0]!;
    expect(entityTableOf(tile.source)).toEqual({ token: "web_brand_choice" });
    expect(tile.source.kind === "entity" && tile.source.meta?.layout).toBe(TABLE_LAYOUT_SECTION);
  });

  it("the pack checker accepts an entity tile and refuses one that names both", () => {
    expect(checkBoardPack({ kind: "table", title: "Choices", entity: "web_brand_choice", size: { w: 640, h: 400 } })).toEqual([]);
    expect(checkBoardPack({ kind: "table", title: "Choices", entity: "web_brand_choice", table: "color", size: { w: 640, h: 400 } }).join(" ")).toMatch(/never both/);
  });
});

// A design board linked to a brand offers the brand's assets (web.brand_asset, that brand's rows only) as a
// READ-ONLY table tile from the Add menu; a board with no brand offers nothing extra.
describe("the brand's assets on its design board", () => {
  const table = { key: TABLE_ENTITY, label: "Table", startNew: [{ label: "New table", create: () => ({ title: "t", source: entityTableSource("x") }) }] } as unknown as BoardItemType;
  const note = { key: "note", label: "Note" } as unknown as BoardItemType;

  it("a read-only tile keeps its token, its brand filter and read-only through the meta, drawn as a section", () => {
    const source = entityTableSource(BRAND_ASSET_TOKEN, { filter: { brand_id: BRAND }, readOnly: true });
    expect(entityTableOf(source)).toEqual({ token: BRAND_ASSET_TOKEN, filter: { brand_id: BRAND }, readOnly: true });
    expect(source.kind === "entity" && source.meta?.layout).toBe(TABLE_LAYOUT_SECTION);
  });

  it("a linked board adds 'Brand assets' to the Table type only, placing that brand's read-only tile", () => {
    const [t, n] = withBrandAssets([table, note], BRAND);
    const entries = startNewEntries(t!);
    expect(entries.map((e) => e.label)).toEqual(["New table", "Brand assets"]);
    const brand = entries[1]!;
    if (!("create" in brand)) throw new Error("Brand assets places at once");
    expect(entityTableOf(brand.create().source)).toEqual({ token: BRAND_ASSET_TOKEN, filter: { brand_id: BRAND }, readOnly: true });
    expect(n).toBe(note);
  });

  it("a board with no brand offers nothing extra", () => {
    const types = [table, note];
    expect(withBrandAssets(types, null)).toBe(types);
  });
});

