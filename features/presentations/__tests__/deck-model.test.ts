import {
  blankDeck,
  blankSlide,
  deckForStorage,
  deckReducer,
  normalizeDeck,
  type Deck,
  type DeckState,
} from "../deck-model";
import { historyReducer, initialHistory } from "../deck-history";

const deckOf = (...titles: string[]): Deck =>
  normalizeDeck({ __kind: "presentation_deck", slides: titles.map((title) => ({ title, bullets: ["a", "b"] })) });
const st = (deck: Deck, current = 0): DeckState => ({ deck, current });
const titles = (s: DeckState) => s.deck.slides.map((x) => x.title);

describe("normalizeDeck keeps the kind and every key", () => {
  it("adds __kind to the deck and each slide and keeps unknown keys", () => {
    const d = normalizeDeck({ title: "T", slides: [{ title: "x", extra: { eyebrow: "E" }, custom: 1 }], extraKey: true });
    expect(d.__kind).toBe("presentation_deck");
    expect(d.slides[0]!.__kind).toBe("presentation_slide");
    expect(d.slides[0]!.custom).toBe(1);
    expect(d.extraKey).toBe(true);
  });
  it("reads the legacy {presentation:{slides,theme}} envelope, a JSON string and a bare array", () => {
    expect(normalizeDeck({ presentation: { slides: [{ title: "L" }], theme: { preset: "ocean" } } }).theme?.preset).toBe("ocean");
    expect(normalizeDeck(JSON.stringify({ slides: [{ title: "S" }] })).slides[0]!.title).toBe("S");
    expect(normalizeDeck([{ title: "A" }]).slides).toHaveLength(1);
    expect(normalizeDeck("not json").slides).toEqual([]);
  });
  it("storage drops only the rail ids and keeps __kind on every slide", () => {
    const stored = deckForStorage(deckOf("a", "b"));
    expect(stored.slides.every((s) => s.__kind === "presentation_slide" && !("id" in s))).toBe(true);
    expect(stored.__kind).toBe("presentation_deck");
  });
});

describe("deckReducer", () => {
  it("adds a slide after the current one and selects it", () => {
    const next = deckReducer(st(deckOf("a", "b")), { type: "addSlide", after: 0, layout: "quote" });
    expect(next.deck.slides.map((s) => s.layout ?? s.title)).toEqual(["a", "quote", "b"]);
    expect(next.current).toBe(1);
  });
  it("duplicates with a new rail id and deep-copied content", () => {
    const s0 = st(deckOf("a"));
    const next = deckReducer(s0, { type: "duplicateSlide", index: 0 });
    expect(titles(next)).toEqual(["a", "a"]);
    expect(next.deck.slides[1]!.id).not.toBe(next.deck.slides[0]!.id);
    next.deck.slides[1]!.bullets!.push("c");
    expect(next.deck.slides[0]!.bullets).toEqual(["a", "b"]);
  });
  it("deletes and keeps the selection in range", () => {
    expect(deckReducer(st(deckOf("a", "b", "c"), 2), { type: "deleteSlide", index: 2 }).current).toBe(1);
    expect(titles(deckReducer(st(deckOf("a", "b", "c"), 0), { type: "deleteSlide", index: 1 }))).toEqual(["a", "c"]);
  });
  it("moves a slide (drag reorder) and the selection follows it", () => {
    const next = deckReducer(st(deckOf("a", "b", "c"), 0), { type: "moveSlide", from: 0, to: 2 });
    expect(titles(next)).toEqual(["b", "c", "a"]);
    expect(next.current).toBe(2);
    expect(deckReducer(st(deckOf("a", "b")), { type: "moveSlide", from: 0, to: 9 }).deck.slides[1]!.title).toBe("a");
    // Moving another slide across the selected one keeps the selection on the same slide.
    const across = deckReducer(st(deckOf("a", "b", "c", "d"), 1), { type: "moveSlide", from: 3, to: 0 });
    expect(across.deck.slides[across.current]!.title).toBe("b");
  });
  it("edits a field in place by path, including nested stats and columns", () => {
    let s = st(deckOf("a"));
    s = deckReducer(s, { type: "setField", index: 0, path: "bullets.1", value: "B!" });
    expect(s.deck.slides[0]!.bullets).toEqual(["a", "B!"]);
    s = deckReducer(s, { type: "setLayout", index: 0, layout: "two-column" });
    const cols = (s.deck.slides[0]!.extra as { columns: { bullets: string[] }[] }).columns;
    expect(cols.map((c) => c.bullets)).toEqual([["a"], ["B!"]]);
    s = deckReducer(s, { type: "setField", index: 0, path: "extra.columns.1.title", value: "Right" });
    expect((s.deck.slides[0]!.extra as { columns: { title?: string }[] }).columns[1]!.title).toBe("Right");
  });
  it("Enter adds a list item after; Backspace on empty removes it but keeps one", () => {
    let s = st(deckOf("a"));
    s = deckReducer(s, { type: "insertItem", index: 0, path: "bullets.0" });
    expect(s.deck.slides[0]!.bullets).toEqual(["a", "", "b"]);
    s = deckReducer(s, { type: "removeItem", index: 0, path: "bullets.1" });
    expect(s.deck.slides[0]!.bullets).toEqual(["a", "b"]);
    const one = st(normalizeDeck({ slides: [{ bullets: [""] }] }));
    expect(deckReducer(one, { type: "removeItem", index: 0, path: "bullets.0" })).toBe(one);
  });
  it("theme, notes and image land on the right objects", () => {
    let s = st(deckOf("a"));
    s = deckReducer(s, { type: "setPreset", preset: "ocean" });
    s = deckReducer(s, { type: "setNotes", index: 0, notes: "say hi" });
    s = deckReducer(s, { type: "setImage", index: 0, image: "file-1" });
    expect(s.deck.theme?.preset).toBe("ocean");
    expect(s.deck.slides[0]!.notes).toBe("say hi");
    expect(s.deck.slides[0]!.image_url).toBe("file-1");
    expect(s.deck.slides[0]!.layout).toBe("image-split");
    s = deckReducer(s, { type: "setImage", index: 0, image: null, prompt: "mountains" });
    expect(s.deck.slides[0]!.image_url).toBeUndefined();
    expect((s.deck.slides[0]!.extra as { imagePrompt?: string }).imagePrompt).toBe("mountains");
  });
  it("every blank layout is a slide the kind accepts", () => {
    for (const l of ["title", "section", "bullets", "two-column", "image-split", "image-full", "quote", "stat", "closing"] as const) {
      expect(blankSlide(l).__kind).toBe("presentation_slide");
    }
    expect(blankDeck().slides).toHaveLength(1);
  });
});

describe("deck history (undo / redo)", () => {
  it("typing in one field is one undo step; a structural change is another", () => {
    let h = initialHistory(deckOf("a"));
    for (const v of ["H", "He", "Hel"]) h = historyReducer(h, { type: "setField", index: 0, path: "title", value: v });
    h = historyReducer(h, { type: "addSlide", after: 0 });
    expect(h.past).toHaveLength(2);
    h = historyReducer(h, { type: "undo" });
    expect(h.present.deck.slides).toHaveLength(1);
    expect(h.present.deck.slides[0]!.title).toBe("Hel");
    h = historyReducer(h, { type: "undo" });
    expect(h.present.deck.slides[0]!.title).toBe("a");
    h = historyReducer(h, { type: "redo" });
    expect(h.present.deck.slides[0]!.title).toBe("Hel");
  });
  it("committing the text already there (a blur after undo) keeps the redo stack", () => {
    let h = initialHistory(deckOf("a"));
    h = historyReducer(h, { type: "setField", index: 0, path: "title", value: "ab" });
    h = historyReducer(h, { type: "undo" });
    h = historyReducer(h, { type: "setField", index: 0, path: "title", value: "a" });
    h = historyReducer(h, { type: "setNotes", index: 0, notes: "" });
    expect(h.future).toHaveLength(1);
    h = historyReducer(h, { type: "redo" });
    expect(h.present.deck.slides[0]!.title).toBe("ab");
  });
  it("selecting a slide is not an edit (no revision, no undo step)", () => {
    const h0 = initialHistory(deckOf("a", "b"));
    const h1 = historyReducer(h0, { type: "select", index: 1 });
    expect(h1.revision).toBe(0);
    expect(h1.past).toHaveLength(0);
    expect(h1.present.current).toBe(1);
  });
  it("every edit bumps the revision the autosave watches", () => {
    const h = historyReducer(initialHistory(deckOf("a")), { type: "setPreset", preset: "mono" });
    expect(h.revision).toBe(1);
  });
});
