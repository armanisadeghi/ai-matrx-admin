// A pack may carry a BOARD (template-pack.ts PackBoard). Proven both ways on the committed Design system board
// pack: it passes, and each planted defect (a tile naming a table token the spec lacks, a page-layout tile wider
// than the chapter, a board-only pack with no board, pages nested two deep, a note with no words) is reported at
// its exact path. The card face carries `board`, which is how the Board gallery finds it and the Spaces gallery skips it.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "../template-pack-check";
import { packBoards, packCardFace, type SpaceTemplatePack } from "../template-pack";

const PACK = JSON.parse(readFileSync(join(__dirname, "../../../features/spaces/templates/packs/design-system-board.pack.json"), "utf8")) as SpaceTemplatePack;
const fresh = () => JSON.parse(JSON.stringify(PACK)) as SpaceTemplatePack;
const ats = (p: SpaceTemplatePack) => checkPack(p).map((f) => f.at);

describe("checkPack: the board key", () => {
  it("passes the committed Design system board pack", () => {
    expect(checkPack(PACK)).toEqual([]);
  });
  it("names a tile whose table token the spec does not have", () => {
    const p = fresh();
    p.board!.chapters[1].tiles[0].table = "color";
    expect(ats(p)).toContain("board.chapters[1].tiles[0].table");
  });
  it("names a page-layout tile wider than the chapter", () => {
    const p = fresh();
    p.board!.chapters[2].tiles[0].size.w = 1400;
    expect(ats(p)).toContain("board.chapters[2].tiles[0].size.w");
  });
  it("refuses a pack with neither pages nor a board", () => {
    const p = fresh();
    delete p.board;
    expect(ats(p)).toContain("pages");
  });
  it("keeps pages one level deep and board keys unique", () => {
    const p = fresh();
    (p.board!.pages![0] as unknown as { pages: unknown[] }).pages = [];
    p.board!.pages!.push({ ...p.board!.pages![0], key: "design-system" });
    const found = ats(p);
    expect(found).toContain("board.pages[0].pages");
    expect(found).toContain("board.pages[1].key");
  });
  it("names a note tile with no words and an unknown tile kind", () => {
    const p = fresh();
    const note = p.board!.chapters.findIndex((c) => c.tiles[0]?.kind === "note");
    expect(note).toBeGreaterThanOrEqual(0);
    p.board!.chapters[note].tiles[0].text = " ";
    (p.board!.chapters[6].tiles[0] as unknown as { kind: string }).kind = "sticker";
    const found = ats(p);
    expect(found).toContain(`board.chapters[${note}].tiles[0].text`);
    expect(found).toContain("board.chapters[6].tiles[0].kind");
  });
  it("names a seed value its design look cannot draw, and a ground row that does not exist", () => {
    const p = fresh();
    const shadow = p.spec.tables.find((t) => t.token === "shadow")!;
    shadow.rows[0].values.value = JSON.stringify({ x: 0, y: 1, blur: 2, spread: 0, color: "rgba(15,23,42,0.08)" });
    const color = p.spec.tables.find((t) => t.token === "color")!;
    color.rows[1].values.reads_on = "page";
    const found = ats(p);
    expect(found).toContain("spec.tables (shadow).rows[0].values.value");
    expect(found).toContain("spec.tables (color).rows[1].values.reads_on");
  });
  it("names a color read on itself, and two rows of one name when rows are found by name", () => {
    const p = fresh();
    const color = p.spec.tables.find((t) => t.token === "color")!;
    const primaryFg = color.rows.findIndex((r) => r.values.name === "primary-foreground");
    color.rows[primaryFg].values.reads_on = "primary-foreground";
    color.rows[0].values.name = "card"; // "background" becomes a second "card"
    const found = checkPack(p);
    expect(found.map((f) => f.at)).toContain(`spec.tables (color).rows[${primaryFg}].values.reads_on`);
    expect(found.find((f) => f.at === "spec.tables (color).rows")?.says).toMatch(/2 rows are named "card"/);
  });
  it("finds rows by the name column when there is no title field; says once when there is neither", () => {
    const p = fresh();
    const color = p.spec.tables.find((t) => t.token === "color")!;
    delete (color as { titleField?: string }).titleField;
    expect(checkPack(p).filter((f) => f.at.startsWith("spec.tables (color).rows["))).toEqual([]);
    for (const r of color.rows) {
      r.values.label = r.values.name;
      delete r.values.name;
    }
    (color.fields.find((f) => f.key === "name") as { key: string }).key = "label";
    const found = checkPack(p);
    expect(found.filter((f) => f.at.startsWith("spec.tables (color).rows["))).toEqual([]);
    expect(found.filter((f) => f.at === "spec.tables (color).titleField" && /names rows by their name/.test(f.says))).toHaveLength(1);
  });
  it("puts the board on the card face; the top board comes first", () => {
    expect(packCardFace(PACK).board).toEqual({ title: "Design system", chapters: 10, pages: 1 });
    expect(packCardFace(PACK).pages).toBe(0);
    expect(packBoards(PACK.board!).map((b) => b.key)).toEqual(["design-system", "files"]);
  });
});
