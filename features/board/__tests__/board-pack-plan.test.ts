// A board pack's install plan: every table tile is pointed at the table THIS install made (by token), in section
// layout; notes carry their seed; the board is already in page shape (planPageLayout moves nothing); every
// chapter of the pack is a frame in order; and the child page is its own board. Fails without the plan.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import { chapterOrder, planPageLayout } from "../engine/page-layout";
import { planPackBoards } from "../templates/board-pack-plan";
import { TABLE_ENTITY, TABLE_LAYOUT_SECTION } from "../items/table-tile";


const PACK = JSON.parse(readFileSync(join(__dirname, "../../spaces/templates/packs/design-system-board.pack.json"), "utf8")) as SpaceTemplatePack;
const MADE = Object.fromEntries(["color", "type_style", "spacing", "radius", "shadow", "component"].map((t, i) => [t, { tableId: `00000000-0000-4000-8000-00000000000${i + 1}`, viewIds: {} }]));

describe("planPackBoards", () => {
  let n = 0;
  const [top, ...pages] = planPackBoards(PACK.board!, MADE, () => `id-${++n}`);

  it("points every table tile at the installed table id, as a section", () => {
    const tables = top.doc.nodes.filter((x) => x.source.kind === "entity" && x.source.entity === TABLE_ENTITY);
    expect(tables.map((t) => [t.title, t.source.kind === "entity" ? t.source.id : null])).toEqual([
      ["Colors", MADE.color.tableId],
      ["Typography", MADE.type_style.tableId],
      ["Spacing", MADE.spacing.tableId],
      ["Corner radius", MADE.radius.tableId],
      ["Shadows", MADE.shadow.tableId],
      ["Components", MADE.component.tableId],
    ]);
    for (const t of tables) expect(t.source.kind === "entity" && t.source.meta?.layout).toBe(TABLE_LAYOUT_SECTION);
  });

  it("refuses, by name, a tile whose table was not made", () => {
    const { color: _c, ...rest } = MADE;
    expect(() => planPackBoards(PACK.board!, rest)).toThrow(/"color" table was not made/);
  });

  it("makes each chapter a frame, in order, already in page shape", () => {
    expect(top.layout).toBe("page");
    expect(chapterOrder(top.doc.groups).map((g) => g.title)).toEqual(["Overview", "Colors", "Typography", "Spacing", "Corner radius", "Shadows", "Components", "Assets"]);
    const plan = planPageLayout({ tiles: top.doc.nodes, frames: top.doc.groups });
    expect(plan.moves).toEqual([]);
    expect(plan.chapters).toEqual(top.doc.groups.map((g) => g.id));
  });

  it("seeds the notes so each use files its own", () => {
    const overview = top.doc.nodes.find((x) => x.title === "Design system")!;
    expect(overview.source).toMatchObject({ kind: "entity", entity: "note", id: null });
    const seed = overview.source.kind === "entity" ? overview.source.meta?.seed ?? "" : "";
    expect(seed.split("\n")[0]).toBe("Design system");
    for (const h of ["## Principles", "## Using tokens", "## Using components", "## Accessibility"]) expect(seed).toContain(h);
  });

  it("makes the Files page as its own board", () => {
    expect(pages.map((p) => [p.key, p.title, p.layout])).toEqual([["files", "Files", "page"]]);
    expect(pages[0].doc.groups.map((g) => g.title)).toEqual(["Files"]);
  });
});
