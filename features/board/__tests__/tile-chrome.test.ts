/**
 * Tile chrome (2026-10-18): ONE "…" menu per tile, NEVER A NAME TWICE, AUTO HEIGHT in page layout,
 * one icon per chapter, tight page spacing.
 *
 * SUT: `engine/tile-chrome.ts`, `components/TileMenu.tsx` `tileMenuKeys`, the Table type's
 * `menuActions` / `namesItself` / `autoHeight` (items/data-items.tsx via the catalog),
 * `items/table-tile.ts` `tableLookHint`, `engine/page-layout.ts` `planPageLayout`.
 * Breaks it catches: the layout switch back as a loose button (no menu entry); a section chapter
 * showing its name as frame label AND tile header AND card title; an auto-height tile that loops on
 * re-measure or collapses on a hidden body; every chapter with the same icon; 96px gaps between
 * chapters; a page re-flow that keeps resizing a chapter's one tile.
 */

import { DATA_ITEMS } from "../items/data-items";
import { TABLE_ENTITY, TABLE_LAYOUT_SECTION, tableLookHint } from "../items/table-tile";
import { tileMenuKeys } from "../components/TileMenu";
import {
  CHAPTER_FALLBACK_ICON,
  autoHeightChange,
  autoHeightMoves,
  chapterIconName,
  framesNamedByTile,
  sameName,
  tileChrome,
  tileIconHint,
} from "../engine/tile-chrome";
import { PAGE_FRAME_PAD, PAGE_LABEL_H, PAGE_SECTION_GAP, planPageLayout } from "../engine/page-layout";
import type { NodeSource } from "../board/document";

const table = DATA_ITEMS.find((t) => t.key === TABLE_ENTITY)!;
const section: NodeSource = { kind: "entity", entity: TABLE_ENTITY, id: "t1", meta: { layout: TABLE_LAYOUT_SECTION } };
const plain: NodeSource = { kind: "entity", entity: TABLE_ENTITY, id: "t1" };

describe("one menu per tile", () => {
  it("holds Comment, Open, Full screen, then the type's own entries", () => {
    const actions = table.menuActions!({ tileId: "a", source: plain, title: "Colors", onSource: () => {} });
    expect(tileMenuKeys({ href: "/data/t1", comment: { count: 2, thread: null }, actions })).toEqual([
      "comment",
      "open",
      "fullscreen",
      "type:layout",
    ]);
  });

  it("the table's layout switch is a menu entry that flips the layout", () => {
    let next: NodeSource | null = null;
    const [toSection] = table.menuActions!({ tileId: "a", source: plain, title: "Colors", onSource: (s) => (next = s) });
    expect(toSection.label).toBe("Show as section");
    toSection.onSelect();
    expect(next).toEqual(section);
    const [toTable] = table.menuActions!({ tileId: "a", source: section, title: "Colors", onSource: (s) => (next = s) });
    expect(toTable.label).toBe("Show as table");
    toTable.onSelect();
    expect(next).toEqual(plain);
  });

  it("a draft table (no id) has no layout entry", () => {
    const draft: NodeSource = { kind: "entity", entity: TABLE_ENTITY, id: null };
    expect(table.menuActions!({ tileId: "a", source: draft, title: "New", onSource: () => {} })).toEqual([]);
  });
});

describe("never a name twice", () => {
  const frame = { id: "f", rect: { x: 0, y: 0, w: 1100, h: 400 }, title: "Colors" };
  const tile = (title: string) => ({ id: "t", rect: { x: 8, y: 8, w: 1084, h: 300 }, title });

  it("a frame whose tile carries its name hides its label", () => {
    expect([...framesNamedByTile([frame], [tile(" colors ")])]).toEqual(["f"]);
    expect([...framesNamedByTile([frame], [tile("Brand colors")])]).toEqual([]);
    expect(sameName("Corner  radius", "corner radius")).toBe(true);
    expect(sameName("", "")).toBe(false);
  });

  it("in page layout a section tile shows no header and no tile frame; on the canvas it keeps both", () => {
    const own = { namesItself: table.namesItself!(section), autoHeight: table.autoHeight!(section) };
    expect(tileChrome("page", own)).toEqual({ headerless: true, bare: true, autoHeight: true });
    expect(tileChrome("canvas", own)).toEqual({ headerless: false, bare: false, autoHeight: false });
    const page = { namesItself: table.namesItself!(plain), autoHeight: table.autoHeight!(plain) };
    expect(tileChrome("page", page)).toEqual({ headerless: false, bare: false, autoHeight: false });
  });

  it("page layout gives a labelled chapter label room, and none to a chapter its tile names", () => {
    const plan = planPageLayout({
      frames: [
        { ...frame, rect: { x: 0, y: 0, w: 1100, h: 400 } },
        { id: "g", rect: { x: 0, y: 1000, w: 1100, h: 400 }, title: "Notes" },
      ],
      tiles: [
        { id: "a", rect: { x: 40, y: 40, w: 600, h: 300 }, title: "Colors" },
        { id: "b", rect: { x: 40, y: 1040, w: 600, h: 300 }, title: "Ideas" },
      ],
    });
    const at = new Map(plan.moves.map((m) => [m.id, m]));
    expect(at.get("a")!.y).toBe(PAGE_FRAME_PAD); // no label room: the tile names the chapter
    const g = at.get("g")!;
    expect(at.get("b")!.y - g.y).toBe(PAGE_FRAME_PAD + PAGE_LABEL_H);
    // Chapters sit close, and a chapter's one tile takes the chapter's width.
    expect(g.y - (at.get("f")!.y + at.get("f")!.h!)).toBe(PAGE_SECTION_GAP);
    expect(PAGE_SECTION_GAP).toBeLessThanOrEqual(16);
    expect(at.get("a")!.w).toBe(1100 - PAGE_FRAME_PAD * 2);
  });

  it("re-planning an arranged page moves nothing (no reflow loop with the width rule)", () => {
    const scene = {
      frames: [{ ...frame }],
      tiles: [{ id: "a", rect: { x: 40, y: 40, w: 600, h: 300 }, title: "Colors" }],
    };
    const first = planPageLayout(scene);
    const at = new Map(first.moves.map((m) => [m.id, m]));
    const settled = {
      frames: scene.frames.map((f) => ({ ...f, rect: { ...f.rect, ...at.get(f.id) } })),
      tiles: scene.tiles.map((t) => ({ ...t, rect: { ...t.rect, ...at.get(t.id) } })),
    };
    expect(planPageLayout(settled).moves).toEqual([]);
  });
});

describe("a phone reflows the page to its own width", () => {
  it("the column takes the view's width and every tile narrows to the chapter, at 100%", () => {
    const scene = {
      frames: [{ id: "f", rect: { x: 0, y: 0, w: 1100, h: 800 }, title: "Notes" }],
      tiles: [
        { id: "a", rect: { x: 8, y: 40, w: 960, h: 300 }, title: "A" },
        { id: "b", rect: { x: 8, y: 400, w: 200, h: 300 }, title: "B" },
      ],
    };
    const plan = planPageLayout(scene, undefined, { columnW: 342 });
    const at = new Map(plan.moves.map((m) => [m.id, m]));
    expect(plan.column.w).toBe(342);
    expect(at.get("a")!.w).toBe(342 - PAGE_FRAME_PAD * 2);
    expect(at.get("b")?.w).toBeUndefined(); // already narrower: keeps its size
    expect(planPageLayout(scene).column.w).toBe(1100); // a wide view keeps the column
  });
});

describe("auto height", () => {
  it("a tile growing to its content takes its chapter with it (never drifts into the next chapter)", () => {
    const frames = [
      { id: "f1", rect: { x: 0, y: 0, w: 1100, h: 120 } },
      { id: "f2", rect: { x: 0, y: 136, w: 1100, h: 120 } },
    ];
    const moves = autoHeightMoves({ x: 8, y: 8, w: 1084, h: 100 }, "t", 1900, frames);
    expect(moves).toEqual([
      { id: "t", x: 8, y: 8, w: 1084, h: 1900 },
      { id: "f1", x: 0, y: 0, w: 1100, h: 8 + 1900 + 8 },
    ]);
    // The grown tile's centre is still inside its own chapter.
    const centreY = 8 + 1900 / 2;
    expect(centreY).toBeLessThan(moves[1].h!);
  });

  it("writes only a real change of a real measurement", () => {
    expect(autoHeightChange(300, 299.6)).toBeNull(); // rounds to what it already is
    expect(autoHeightChange(301, 300.4)).toBeNull();
    expect(autoHeightChange(300, 300.4)).toBe(301);
    expect(autoHeightChange(300, 0)).toBeNull(); // a hidden body measures 0
    expect(autoHeightChange(300, Number.NaN)).toBeNull();
    expect(autoHeightChange(300, 812)).toBe(812);
    expect(autoHeightChange(300, 10)).toBe(48);
  });
});

describe("one icon per chapter", () => {
  it("reads the frame's own icon, else what the tile holds, else a neutral one", () => {
    expect(chapterIconName({ icon: "Ruler" }, ["Palette"])).toBe("Ruler");
    expect(chapterIconName({}, [tileIconHint({ kind: "entity", entity: TABLE_ENTITY, meta: { look: "color_pair" } })])).toBe("Palette");
    expect(chapterIconName({}, [null, "type:note"])).toBe("type:note");
    expect(chapterIconName({}, [])).toBe(CHAPTER_FALLBACK_ICON);
  });

  it("a table's look names what it holds", () => {
    const f = (id: string, options: Record<string, unknown> = {}) => ({ key: id, display_format: { id, options } });
    expect(tableLookHint([{ key: "name" }, f("color_pair")])).toBe("color_pair");
    expect(tableLookHint([f("measure", { measurePreview: "spacing" })])).toBe("measure_spacing");
    expect(tableLookHint([f("measure", { measurePreview: "radius" })])).toBe("measure_radius");
    expect(tableLookHint([f("type_style")])).toBe("type_style");
    expect(tableLookHint([{ key: "name" }])).toBeNull();
    const icons = ["color_pair", "type_style", "measure_spacing", "measure_radius", "shadow"].map((look) =>
      tileIconHint({ kind: "entity", entity: TABLE_ENTITY, meta: { look } }),
    );
    expect(new Set(icons).size).toBe(icons.length);
  });
});
