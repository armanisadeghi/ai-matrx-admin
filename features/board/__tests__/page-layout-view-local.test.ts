/**
 * Page layout: a narrow view's re-flow is view-local, never saved to the shared board (2026-10-18).
 *
 * SUT: `home/usePageLayout.ts` `relayPage`, `engine/page-layout.ts` `planPageProjection`, `board/board-store.ts`
 * `project` / `readSaved` / `endProjection` (what `UserBoard` saves is `readSaved`).
 *
 * Break it catches (board 0f6afaa4, live): page layout narrowed the column to a phone's view and wrote the
 * narrowed rects through `board.reflow`, which is saved; a ~240px viewer turned every 1084px card into a
 * 311px one for every other viewer, and the desktop viewer re-flowed them back (last writer wins). A height
 * measured at the phone's width (a section taller there) was saved the same way.
 */

jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ from: () => ({}) }) } }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import type { Rect } from "../engine/camera";
import { BoardStore } from "../board/board-store";
import { PAGE_COLUMN_W, PAGE_FRAME_PAD, planPageLayout } from "../engine/page-layout";
import { pageScene, relayPage } from "../home/usePageLayout";

type Tile = { id: string; rect: Rect; title?: string; chapter?: string };

const PHONE = 311;
const CARD_W = PAGE_COLUMN_W - PAGE_FRAME_PAD * 2;

/** Two chapters, one card each, laid out at the full column (what a desktop viewer saved). */
function desktopBoard(): BoardStore<Tile> {
  const board = new BoardStore<Tile>({
    tiles: [
      { id: "a", rect: { x: 0, y: 0, w: 400, h: 300 }, title: "Alpha", chapter: "fa" },
      { id: "b", rect: { x: 0, y: 500, w: 400, h: 200 }, title: "Beta", chapter: "fb" },
    ],
    frames: [
      { id: "fa", rect: { x: -8, y: -40, w: 600, h: 400 }, title: "One" },
      { id: "fb", rect: { x: -8, y: 460, w: 600, h: 300 }, title: "Two" },
    ],
  });
  relayPage(board, undefined, {});
  return board;
}

/** Every saved rect, by id (what `UserBoard` writes to the shared document). */
function savedRects(board: BoardStore<Tile>): Record<string, Rect> {
  const s = board.readSaved();
  return Object.fromEntries([...s.tiles, ...s.frames].map((t) => [t.id, t.rect]));
}

describe("page layout on a narrow view never writes the shared board", () => {
  it("a canonical (wide) plan saves the page at the full column", () => {
    const board = desktopBoard();
    const saved = savedRects(board);
    expect(saved.a.w).toBe(CARD_W);
    expect(saved.b.w).toBe(CARD_W);
    expect(saved.fa.w).toBe(PAGE_COLUMN_W);
    expect(board.projecting).toBe(false);
  });

  it("a narrow plan shows the narrowed page but saves no move", () => {
    const board = desktopBoard();
    const before = savedRects(board);
    relayPage(board, undefined, { columnW: PHONE });
    // The view shows the phone's column…
    expect(board.read().tiles.map((t) => t.rect.w)).toEqual([PHONE - PAGE_FRAME_PAD * 2, PHONE - PAGE_FRAME_PAD * 2]);
    expect(board.read().frames.map((f) => f.rect.w)).toEqual([PHONE, PHONE]);
    // …and the saved page is exactly what the desktop viewer saved.
    expect(savedRects(board)).toEqual(before);
  });

  it("a height measured at the narrow width is never saved", () => {
    const board = desktopBoard();
    const before = savedRects(board);
    relayPage(board, undefined, { columnW: PHONE });
    const a = board.getTile("a")!;
    // The section measured at the phone's width is much taller (`onAutoHeight` → `reflow`).
    board.reflow([{ id: "a", x: a.rect.x, y: a.rect.y, w: a.rect.w, h: 1400 }]);
    relayPage(board, undefined, { columnW: PHONE });
    expect(board.getTile("a")!.rect.h).toBe(1400);
    expect(savedRects(board)).toEqual(before);
  });

  it("a real change on a narrow view (a chapter reorder) is saved, at the full column", () => {
    const board = desktopBoard();
    relayPage(board, undefined, { columnW: PHONE });
    relayPage(board, ["fb", "fa"], { columnW: PHONE });
    const saved = savedRects(board);
    expect(saved.fb.y).toBe(0);
    expect(saved.fa.y).toBeGreaterThan(saved.fb.y + saved.fb.h);
    expect(saved.a.w).toBe(CARD_W);
    expect(saved.b.w).toBe(CARD_W);
    // The saved page equals what a desktop viewer plans for that order: nothing for it to re-flow.
    expect(planPageLayout({ tiles: board.readSaved().tiles, frames: board.readSaved().frames }).moves).toEqual([]);
  });

  it("a tile the person moves into another chapter on a phone is refiled in the saved page", () => {
    const board = desktopBoard();
    let plan = relayPage(board, undefined, { columnW: PHONE });
    const fb = board.read().frames.find((f) => f.id === "fb")!;
    // Dragged (on the phone's page) to just inside the bottom of chapter Two.
    board.moveTile("a", 8, fb.rect.y + fb.rect.h - 2);
    plan = relayPage(board, undefined, { columnW: PHONE, members: plan.members, placed: plan.placed });
    expect(plan.members.get("a")).toBe("fb");
    const saved = savedRects(board);
    expect(saved.a.w).toBe(CARD_W);
    expect(saved.a.y).toBeGreaterThan(saved.fb.y);
    expect(saved.a.y + saved.a.h).toBeLessThanOrEqual(saved.fb.y + saved.fb.h);
    expect(board.readSaved().tiles.find((t) => t.id === "a")!.chapter).toBe("fb");
  });

  it("widening the view ends the projection: the board shows the saved page again", () => {
    const board = desktopBoard();
    const before = savedRects(board);
    relayPage(board, undefined, { columnW: PHONE });
    relayPage(board, undefined, {});
    expect(board.projecting).toBe(false);
    const shown = Object.fromEntries([...board.read().tiles, ...board.read().frames].map((t) => [t.id, t.rect]));
    expect(shown).toEqual(before);
  });

  it("a page a narrow client already saved narrow is put back to the full column by a wide plan", () => {
    const board = desktopBoard();
    // What the defect left on the shared board: cards at the phone's width.
    board.reflow(board.read().tiles.map((t) => ({ id: t.id, x: t.rect.x, y: t.rect.y, w: PHONE - 16, h: t.rect.h })));
    relayPage(board, undefined, {});
    expect(Object.values(savedRects(board)).filter((r, i) => i < 2).map((r) => r.w)).toEqual([CARD_W, CARD_W]);
  });

  it("pageScene reads what the view shows (the planner's input)", () => {
    const board = desktopBoard();
    relayPage(board, undefined, { columnW: PHONE });
    expect(pageScene(board).frames.every((f) => f.rect.w === PHONE)).toBe(true);
  });
});
