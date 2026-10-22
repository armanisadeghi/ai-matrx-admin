/**
 * A headerless tile's floating "…" menu sits ON the card's top edge, never inside the body: the body
 * (a records-ui section card: Colors, Typography, Spacing, Corner radius) carries its own Add at its
 * top right, and on a phone the menu is always shown, so a menu inside the corner covered Add.
 * Red recipe: put FLOATING_TILE_MENU_PLACE back to "absolute right-2 top-2 z-10".
 */
import { FLOATING_TILE_MENU_PLACE } from "../engine/tile-chrome";
import { PAGE_TILE_GAP } from "../engine/page-layout";

const MENU_PX = 28; // TileMenu's h-7 trigger

function topOffsetPx(cls: string): number {
  const m = cls.match(/(^|\s)(-?)top-([\d.]+)(\s|$)/);
  if (!m) throw new Error(`no top-* in "${cls}"`);
  return (m[2] === "-" ? -1 : 1) * Number(m[3]) * 4;
}

describe("the floating tile menu", () => {
  it("rides the card's top edge, so the body's top-right controls stay clear", () => {
    const top = topOffsetPx(FLOATING_TILE_MENU_PLACE);
    // The menu's bottom edge stays inside the body's 20px header padding (records-ui pt-5).
    expect(top + MENU_PX).toBeLessThanOrEqual(20 - 4);
    // ...and what rises above the card fits in the gap to the tile above.
    expect(-top).toBeLessThanOrEqual(PAGE_TILE_GAP);
  });
});
