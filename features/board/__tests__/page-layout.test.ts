/**
 * Page layout, chapters and pages (2026-10-17).
 *
 * SUT: `engine/page-layout.ts` (the arrangement, the kept canvas, where new things land),
 * `BoardStore.reflow` (re-lays with no undo step), `BoardCameraStore.setPageLock` (vertical-only,
 * fixed-zoom camera), and the /board list's page nesting (`listService`, `settingsForCopy`).
 * Breaks it catches: chapters out of reading order or overlapping; a tile flowing out of its frame;
 * a page arrangement that keeps moving things (a reflow loop); the canvas not coming back exactly
 * after page layout; a tile added in page layout left between chapters; the page re-flow polluting
 * undo; zoom or a sideways pan getting through in page layout; pages flooding the boards list; a
 * template copy staying a page of the template's board.
 */

jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ from: () => ({}) }) } }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import type { Rect } from "../engine/camera";
import { frameOf, type Placed } from "../engine/arrange";
import {
  PAGE_COLUMN_W,
  canvasSnapshot,
  chapterOrder,
  layoutModeOf,
  pageLanding,
  parseCanvasSnapshot,
  planPageLayout,
  restoreCanvas,
  type PageMove,
} from "../engine/page-layout";
import { BoardStore } from "../board/board-store";
import { BoardCameraStore } from "../engine/camera-store";
import { createBoardListService } from "../boards/listService";
import { PARENT_BOARD_SETTING, parentBoardIdOf, settingsForCopy, type BoardListRow } from "../persistence/boardsService";

const p = (id: string, x: number, y: number, w = 400, h = 300): Placed => ({ id, rect: { x, y, w, h } });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Apply moves to a scene (what the store does). */
function applied(scene: { tiles: Placed[]; frames: Placed[] }, moves: readonly PageMove[]) {
  const at = new Map(moves.map((m) => [m.id, m]));
  const move = (q: Placed): Placed => {
    const m = at.get(q.id);
    return m ? { id: q.id, rect: { x: m.x, y: m.y, w: m.w ?? q.rect.w, h: m.h ?? q.rect.h } } : q;
  };
  return { tiles: scene.tiles.map(move), frames: scene.frames.map(move) };
}

// A canvas: four frames in a 2x2 grid (reading order A B / C D), one note in each, and a loose tile.
const canvas = () => ({
  frames: [p("frame:A", 0, 0, 900, 700), p("frame:B", 1400, 40, 900, 700), p("frame:C", 0, 1200, 900, 700), p("frame:D", 1400, 1250, 900, 700)],
  tiles: [p("nA", 100, 100), p("nB", 1500, 140), p("nC", 100, 1300), p("nD", 1500, 1350), p("loose", 3000, 3000, 300, 200)],
});

describe("planPageLayout", () => {
  it("stacks the frames as full-width chapters in reading order, each tile inside its own frame, nothing overlapping", () => {
    const scene = canvas();
    const plan = planPageLayout(scene);
    expect(plan.chapters).toEqual(["frame:A", "frame:B", "frame:C", "frame:D"]);
    const after = applied(scene, plan.moves);
    const frames = plan.chapters.map((id) => after.frames.find((f) => f.id === id)!);
    for (const f of frames) {
      expect(f.rect.x).toBe(plan.column.x);
      expect(f.rect.w).toBe(plan.column.w);
    }
    for (let i = 1; i < frames.length; i++) expect(frames[i].rect.y).toBeGreaterThan(frames[i - 1].rect.y + frames[i - 1].rect.h);
    for (const [tile, frame] of [["nA", "frame:A"], ["nB", "frame:B"], ["nC", "frame:C"], ["nD", "frame:D"]] as const) {
      expect(frameOf(after.tiles.find((t) => t.id === tile)!.rect, after.frames)).toBe(frame);
    }
    // The loose tile sits below the last chapter, in no frame.
    const loose = after.tiles.find((t) => t.id === "loose")!;
    expect(frameOf(loose.rect, after.frames)).toBeNull();
    expect(loose.rect.y).toBeGreaterThan(frames[3].rect.y + frames[3].rect.h);
    const all = [...after.tiles, ...after.frames.map((f) => f)];
    for (const a of after.tiles) for (const b of after.tiles) if (a !== b) expect(overlaps(a.rect, b.rect)).toBe(false);
    expect(all.length).toBe(9);
  });

  it("is settled once applied (no reflow loop)", () => {
    const scene = canvas();
    const after = applied(scene, planPageLayout(scene).moves);
    expect(planPageLayout(after).moves).toEqual([]);
  });

  it("flows a frame's tiles in rows within the column, and widens the column for a tile wider than it", () => {
    const scene = { frames: [p("frame:A", 0, 0, 3000, 900)], tiles: [p("a", 10, 10), p("b", 500, 10), p("c", 1000, 10), p("wide", 1500, 10, 1300, 400)] };
    const plan = planPageLayout(scene);
    expect(plan.column.w).toBeGreaterThanOrEqual(1300);
    const after = applied(scene, plan.moves);
    const frame = after.frames[0].rect;
    for (const t of after.tiles) {
      expect(t.rect.x).toBeGreaterThanOrEqual(frame.x);
      expect(t.rect.x + t.rect.w).toBeLessThanOrEqual(frame.x + frame.w);
      expect(t.rect.y + t.rect.h).toBeLessThanOrEqual(frame.y + frame.h);
    }
    expect(PAGE_COLUMN_W).toBe(1100);
  });

  it("applies a chapter order (the outline's move up / down)", () => {
    const scene = applied(canvas(), planPageLayout(canvas()).moves);
    const plan = planPageLayout(scene, ["frame:B", "frame:A", "frame:C", "frame:D"]);
    expect(plan.chapters).toEqual(["frame:B", "frame:A", "frame:C", "frame:D"]);
    const after = applied(scene, plan.moves);
    expect(chapterOrder(after.frames).map((f) => f.id)).toEqual(["frame:B", "frame:A", "frame:C", "frame:D"]);
    // Each frame still holds its own note.
    expect(frameOf(after.tiles.find((t) => t.id === "nB")!.rect, after.frames)).toBe("frame:B");
  });
});

describe("canvas kept while in page layout", () => {
  it("restores every canvas position exactly, frames at their canvas size", () => {
    const scene = canvas();
    const kept = parseCanvasSnapshot(JSON.parse(JSON.stringify(canvasSnapshot(scene))))!;
    const paged = applied(scene, planPageLayout(scene).moves);
    const back = applied(paged, restoreCanvas(paged, kept));
    expect(back).toEqual(scene);
  });

  it("a tile added in page layout rides with its frame back to the canvas", () => {
    const scene = canvas();
    const kept = canvasSnapshot(scene);
    const paged = applied(scene, planPageLayout(scene).moves);
    const frameC = paged.frames.find((f) => f.id === "frame:C")!.rect;
    const added = { tiles: [...paged.tiles, p("new", frameC.x + 500, frameC.y + 60, 200, 100)], frames: paged.frames };
    const back = applied(added, restoreCanvas(added, kept));
    expect(frameOf(back.tiles.find((t) => t.id === "new")!.rect, back.frames)).toBe("frame:C");
  });

  it("reads a stored value defensively", () => {
    expect(parseCanvasSnapshot(null)).toBeNull();
    expect(parseCanvasSnapshot({ a: [1, 2, 3, 4], b: "x", c: [1, 2] })).toEqual({ a: [1, 2, 3, 4] });
    expect(layoutModeOf("page")).toBe("page");
    expect(layoutModeOf(undefined)).toBe("canvas");
    expect(layoutModeOf("grid")).toBe("canvas");
  });
});

describe("pageLanding — new things in page layout", () => {
  const scene = applied(canvas(), planPageLayout(canvas()).moves);
  const frameB = scene.frames.find((f) => f.id === "frame:B")!.rect;
  const bottom = Math.max(...[...scene.tiles, ...scene.frames].map((q) => q.rect.y + q.rect.h));

  it("lands in the chapter being read, and the flow puts it last in that chapter", () => {
    const fresh = p("fresh", 1600, frameB.y, 400, 300); // the view's free spot, beside the column
    const at = pageLanding(fresh.rect, scene.frames, frameB.y + 50, bottom)!;
    const withNew = { tiles: [...scene.tiles, { id: "fresh", rect: { ...fresh.rect, ...at } }], frames: scene.frames };
    expect(frameOf(withNew.tiles.at(-1)!.rect, withNew.frames)).toBe("frame:B");
    const after = applied(withNew, planPageLayout(withNew).moves);
    const nB = after.tiles.find((t) => t.id === "nB")!.rect;
    const placed = after.tiles.find((t) => t.id === "fresh")!.rect;
    expect(frameOf(placed, after.frames)).toBe("frame:B");
    expect(placed.x > nB.x || placed.y > nB.y).toBe(true);
  });

  it("with no chapter in view, starts a new section at the bottom", () => {
    const at = pageLanding({ x: 1600, y: bottom + 400, w: 400, h: 300 }, scene.frames, bottom + 2000, bottom)!;
    expect(at.y).toBeGreaterThan(bottom);
  });

  it("leaves a thing already inside a chapter where it is", () => {
    expect(pageLanding({ x: frameB.x + 50, y: frameB.y + 50, w: 100, h: 100 }, scene.frames, 0, bottom)).toBeNull();
  });
});

describe("BoardStore.reflow", () => {
  type T = { id: string; rect: Rect };
  it("moves tiles and resizes frames without an undo step", () => {
    const s = new BoardStore<T>({ tiles: [{ id: "a", rect: { x: 0, y: 0, w: 100, h: 100 } }], frames: [{ id: "frame:f", title: "F", rect: { x: 0, y: 0, w: 300, h: 300 } }] });
    s.moveTile("a", 10, 10); // the person's own change
    expect(s.getLayout().canUndo).toBe(true);
    s.reflow([{ id: "a", x: 500, y: 600 }, { id: "frame:f", x: 400, y: 500, w: 1100, h: 400 }]);
    expect(s.getTile("a")!.rect).toMatchObject({ x: 500, y: 600 });
    expect(s.read().frames[0].rect).toEqual({ x: 400, y: 500, w: 1100, h: 400 });
    // ⌘Z takes back the person's move, not the reflow as a separate step.
    s.undo();
    expect(s.getTile("a")!.rect).toMatchObject({ x: 0, y: 0 });
    expect(s.getLayout().canUndo).toBe(false);
  });
});

describe("BoardCameraStore page lock", () => {
  const make = () => {
    const c = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    c.setSize({ w: 1400, h: 900 });
    c.registerItem("a", { x: 0, y: 0, w: 1100, h: 3000 });
    c.setPageLock({ column: { x: 0, w: 1100 } });
    return c;
  };

  it("fixes zoom and the column's place; only vertical movement gets through, clamped to the page", () => {
    const c = make();
    const start = c.getCamera();
    expect(start.z).toBeLessThanOrEqual(1);
    c.setCamera({ ...start, z: 2.5 }); // a zoom
    expect(c.getCamera().z).toBe(start.z);
    expect(c.getCamera().x).toBe(start.x);
    c.setCamera({ ...c.getCamera(), x: start.x - 400, y: start.y - 500 }); // a pan sideways and down
    const after = c.getCamera();
    expect(after.z).toBe(start.z);
    expect(after.x).toBe(start.x);
    expect(after.y).toBe(start.y - 500);
    c.setCamera({ ...after, y: 100_000 }); // far above the top
    expect(c.getCamera().y).toBeLessThanOrEqual(24);
    c.setCamera({ ...after, y: -100_000 }); // far below the end
    expect(c.getCamera().y + 3000 * c.getCamera().z).toBeGreaterThanOrEqual(900 - 24 - 1);
  });

  it("fits the column to a narrow view, and unlocks back to a free camera", () => {
    const c = make();
    c.setSize({ w: 600, h: 900 });
    expect(c.getCamera().z).toBeLessThan(0.6);
    c.setPageLock(null);
    c.setCamera({ x: 5, y: 6, z: 2 });
    expect(c.getCamera()).toEqual({ x: 5, y: 6, z: 2 });
  });
});

describe("pages in the boards list", () => {
  const row = (id: string, parent: string | null, pages = 0): BoardListRow => ({
    id,
    title: id,
    organization_id: "o1",
    archived: false,
    tile_count: 0,
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
    last_opened_at: null,
    parent_id: parent,
    page_count: pages,
  });
  const query = { scope: { kind: "mine" as const }, orgId: null, search: "", deep: false, archived: "active" as const, filters: {}, page: 1 };
  const sort = { sort: "updated_at", direction: "desc" as const, favoritesFirst: false, pageSize: 25 };

  it("lists top boards only; a page lists under its board", async () => {
    const service = createBoardListService(async () => [row("top", null, 2), row("p1", "top"), row("p2", "top"), row("other", null)]);
    const page = await service.fetchPage(query, sort);
    expect(page.rows.map((r) => r.id).sort()).toEqual(["other", "top"]);
  });

  it("a page keeps its parent on a Duplicate, a template copy is a new top board", () => {
    const settings = { [PARENT_BOARD_SETTING]: "top", layout: "page" };
    expect(parentBoardIdOf(settingsForCopy(settings))).toBe("top");
    expect(parentBoardIdOf(settingsForCopy(settings, { dropBrand: true }))).toBeNull();
  });
});
