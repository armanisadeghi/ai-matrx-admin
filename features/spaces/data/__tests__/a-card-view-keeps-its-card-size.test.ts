// CD-VIEW-11 (Notion's "Card size" on a Spaces database block's board and gallery): the view keeps a card
// size (small / medium / large), records-ui draws it (gallerySize / boardSize), and a size picked on the
// gallery's own S / M / L is saved onto the view instead of dropped (it reset on reload).
// Red before: viewSpec never handed a size and the block kept no card size.
import type { Field } from "@ai-matrx/records/react";

import { CARD_SIZES, cardSizeFromLook, viewSpec } from "../view-spec";

const fields = [{ id: "F-NAME", key: "name", label: "Name", type: "text" }, { id: "F-ST", key: "status", label: "Status", type: "select" }] as unknown as Field[];

describe("a card view keeps its card size", () => {
  it("offers Notion's three sizes", () => {
    expect(CARD_SIZES).toEqual(["small", "medium", "large"]);
  });
  it("hands a gallery's size and a board's size to records-ui", () => {
    expect(viewSpec("T1", { id: "g", name: "Gallery", layout: "gallery", cardSize: "large" }, fields).presentation?.gallerySize).toBe("large");
    expect(viewSpec("T1", { id: "b", name: "Board", layout: "kanban", groupField: "status", cardSize: "small" }, fields).presentation?.boardSize).toBe("small");
  });
  it("a table has no card size", () => {
    const p = viewSpec("T1", { id: "t", name: "Table", layout: "grid", cardSize: "large" }, fields).presentation ?? {};
    expect(p.gallerySize).toBeUndefined();
    expect(p.boardSize).toBeUndefined();
  });
  it("reads the size a person picked on the card view itself, so it is saved", () => {
    expect(cardSizeFromLook("gallery", { gallerySize: "small" })).toBe("small");
    expect(cardSizeFromLook("kanban", { boardSize: "large" })).toBe("large");
    expect(cardSizeFromLook("grid", { gallerySize: "small" })).toBeUndefined();
    expect(cardSizeFromLook("gallery", {})).toBeUndefined();
  });
});
