/** Edit → Copy / Cut / Paste hold a slide and paste a fresh-id copy after the current one. */
import { blankDeck, blankSlide, deckReducer } from "../deck-model";
import { buildDeckMenus, type DeckChromeHost } from "../deck-commands";

jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function host(over: Partial<DeckChromeHost>): DeckChromeHost {
  return {
    canEdit: true, slideCount: 2, current: 0, currentLayout: "bullets", presetKey: null, presets: [], canUndo: false, canRedo: false,
    notesShown: false, currentSlide: null, dispatch: () => {}, undo: () => {}, redo: () => {}, present: () => {}, toggleNotes: () => {},
    uploadImage: () => {}, searchImage: () => {}, removeImage: () => {}, hasImage: false, showShortcuts: () => {},
    ...over,
  };
}

describe("slide clipboard", () => {
  it("the reducer pastes a copy with a new id after the given slide", () => {
    const deck = { ...blankDeck("d"), slides: [blankSlide(), blankSlide()] };
    const src = { ...blankSlide(), title: "copied" };
    const next = deckReducer({ deck, current: 0 }, { type: "pasteSlide", after: 0, slide: src });
    expect(next.deck.slides).toHaveLength(3);
    expect(next.deck.slides[1]!.title).toBe("copied");
    expect(next.deck.slides[1]!.id).not.toBe(src.id);
    expect(next.current).toBe(1);
  });

  it("Copy then Paste dispatches the copied slide; Cut deletes the slide", () => {
    const actions: unknown[] = [];
    const slide = { ...blankSlide(), title: "S" };
    const h = host({ currentSlide: slide, dispatch: (a) => actions.push(a) });
    const edit = buildDeckMenus(h).find((m) => m.id === "edit")!;
    const row = (id: string) => edit.items.find((e) => e.kind === "action" && e.id === id) as { run: () => void };
    row("edit.copy").run();
    row("edit.paste").run();
    expect(actions).toEqual([{ type: "pasteSlide", after: 0, slide }]);
    row("edit.cut").run();
    expect(actions.at(-1)).toEqual({ type: "deleteSlide", index: 0 });
  });
});
