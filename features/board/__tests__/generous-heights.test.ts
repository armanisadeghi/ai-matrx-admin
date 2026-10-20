/**
 * Arman, 2026-10-19: "you're favoring shortening things far too much ... this is a board ... essentially
 * unlimited space ... the limitations should be sort of the exception, not the rule." Defaults show the
 * real content; one high ceiling guards runaway growth.
 */
import { AUTO_HEIGHT_CEILING_PX, autoHeightChange } from "../engine/tile-chrome";
import { BOARD_ITEM_TYPES } from "../items/catalog";

describe("generous heights", () => {
  it("the one safety ceiling is high, and only runaway content reaches it", () => {
    expect(AUTO_HEIGHT_CEILING_PX).toBeGreaterThanOrEqual(1600);
    expect(autoHeightChange(300, 1800)).toBe(1800);
    expect(autoHeightChange(300, 58 * 1100)).toBe(AUTO_HEIGHT_CEILING_PX);
  });

  it("no type opens as a short strip (label is a one-line title)", () => {
    const short = BOARD_ITEM_TYPES.filter((t) => t.key !== "label" && t.defaultSize.h < 560);
    expect(short.map((t) => `${t.key}:${t.defaultSize.h}`)).toEqual([]);
  });

  it("note, document and chat open ~900+ tall; tables and files 800+", () => {
    const h = (k: string) => BOARD_ITEM_TYPES.find((t) => t.key === k)?.defaultSize.h ?? 0;
    for (const k of ["note", "udt_document", "chat"]) expect(h(k)).toBeGreaterThanOrEqual(900);
    for (const k of ["file"]) expect(h(k)).toBeGreaterThanOrEqual(800);
  });
});
