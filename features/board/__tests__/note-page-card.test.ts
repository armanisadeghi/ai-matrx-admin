/**
 * V-7 (final review 2026-10-18): in page layout the Assets note drew the whole notes workspace (its
 * toolbar, a second "…" menu, a footer) and its body opened by repeating the title. In page layout a
 * note now lays out at its content's height as a read-first card (NotePageCard), and a first line that
 * only repeats the tile's title is left out.
 */
import { noteCardText } from "../items/NotePageCard";
import { itemTypeFor } from "../items/catalog";
import { tileChrome } from "../engine/tile-chrome";

jest.mock("@ai-matrx/chat/ui/markdown-stream/MarkdownStream", () => ({ __esModule: true, default: () => null }));

describe("a note in page layout reads as a card", () => {
  it("lays out at its content's height (no grow-around-an-editor)", () => {
    const note = { kind: "entity", entity: "note", id: "n1" } as const;
    const auto = itemTypeFor(note)?.autoHeight?.(note);
    expect(auto).toBe(true);
    expect(tileChrome("page", { autoHeight: auto })).toMatchObject({ autoHeight: true, growToFit: false });
  });

  it("never repeats the title as its first line", () => {
    expect(noteCardText("Assets\n\nKeep the logo files here.", "Assets")).toBe("Keep the logo files here.");
    expect(noteCardText("# Assets\nKeep the logo files here.", "assets")).toBe("Keep the logo files here.");
    expect(noteCardText("Assets", "Assets")).toBe("");
    expect(noteCardText("Assets we keep\n\nLogos.", "Assets")).toBe("Assets we keep\n\nLogos.");
  });
});
