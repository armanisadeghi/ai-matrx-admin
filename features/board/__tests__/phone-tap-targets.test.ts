/**
 * The Board's own chrome carries the platform's touch floor (`matrx-touch-targets`, 44px under a
 * coarse pointer or below `lg`; desktop density untouched). jsdom computes no CSS, so this pins the
 * ROOTS that carry it — the board canvas root (toolbar, zoom HUD, selection bar, every tile header)
 * and each portaled menu/popover/panel (they leave the root's subtree) — and the one control whose
 * utility `min-w-8` out-ranks the floor. The measured 44px is checked live at 375px (FEATURE.md).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("the Board's chrome is at the phone touch floor", () => {
  it("the canvas root carries the floor, so the toolbar, zoom HUD and tile headers inherit it", () => {
    expect(read("home/UserBoard.tsx")).toMatch(/className="relative h-full min-h-0 matrx-touch-targets"/);
  });

  it.each([
    ["home/AddMenu.tsx", /w-80 p-0 matrx-touch-targets" data-board-chrome/],
    ["home/AddMenu.tsx", /pointer-events-auto matrx-touch-targets max-h-full/],
    ["components/ToolBar.tsx", /w-44 matrx-touch-targets" data-board-chrome/],
    ["components/ZoomMenu.tsx", /w-52 matrx-touch-targets" data-board-chrome/],
    ["components/SelectionToolbar.tsx", /p-2 matrx-touch-targets">/],
    ["components/TileMenu.tsx", /min-w-52 matrx-touch-targets/],
    ["components/TileMenu.tsx", /p-3 matrx-touch-targets/],
    ["boards/BoardsListPage.tsx", /contents matrx-touch-targets/],
  ])("%s: a portaled or separate surface carries the floor itself (%s)", (file, pattern) => {
    expect(read(file)).toMatch(pattern);
  });

  it("an icon button's own min-w-8 never beats the floor on a phone", () => {
    expect(read("components/SelectionToolbar.tsx")).toMatch(/min-w-8 max-lg:min-w-11 pointer-coarse:min-w-11/);
  });
});
