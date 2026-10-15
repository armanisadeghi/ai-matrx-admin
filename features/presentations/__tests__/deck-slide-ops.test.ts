import { deckReducer, blankDeck, blankSlide, type DeckState, type Deck } from "../deck-model";
import { findInDeck, replaceAllInSlides, isSkipped, slideTransitionOf, slideBackgroundOf, plainTextOf, commentsOf } from "../deck-slide-ops";
import { portionsToSlides } from "../deck-import";
import { searchSpecialChars } from "../deck-special-chars";

function twoSlides(): DeckState {
  const deck: Deck = blankDeck("Q3 plan");
  const a = { ...blankSlide("bullets"), title: "Growth Plan", bullets: ["grow the plan", "Plan B"] };
  const b = { ...blankSlide("title"), title: "plan ahead", subtitle: "x", notes: "the plan" };
  return { deck: { ...deck, slides: [a, b] }, current: 0 };
}

describe("slide-level deck operations", () => {
  it("skip toggles a flag the show reads, and unskip removes it", () => {
    const s1 = deckReducer(twoSlides(), { type: "setSkipped", index: 1, skipped: true });
    expect(isSkipped(s1.deck.slides[1])).toBe(true);
    const s2 = deckReducer(s1, { type: "setSkipped", index: 1, skipped: false });
    expect(isSkipped(s2.deck.slides[1])).toBe(false);
    expect("skipped" in s2.deck.slides[1]!).toBe(false);
  });
  it("background and transition apply to one slide or all", () => {
    let s = deckReducer(twoSlides(), { type: "setBackground", index: 0, background: { color: "#112233" } });
    expect(slideBackgroundOf(s.deck.slides[0])?.color).toBe("#112233");
    expect(slideBackgroundOf(s.deck.slides[1])).toBeNull();
    s = deckReducer(s, { type: "setTransition", index: 0, transition: { kind: "fade", ms: 300 }, allSlides: true });
    expect(slideTransitionOf(s.deck.slides[1])).toEqual({ kind: "fade", ms: 300 });
    s = deckReducer(s, { type: "setBackground", index: 0, background: null });
    expect(slideBackgroundOf(s.deck.slides[0])).toBeNull();
  });
  it("slide numbers are a deck flag", () => {
    expect(deckReducer(twoSlides(), { type: "setSlideNumbers", show: true }).deck.showSlideNumbers).toBe(true);
  });
  it("find sees titles, bullets, subtitle and notes; match case narrows", () => {
    const { deck } = twoSlides();
    expect(findInDeck(deck.slides, "plan", false).length).toBe(5);
    expect(findInDeck(deck.slides, "plan", true).length).toBe(3);
    expect(findInDeck(deck.slides, "", false)).toEqual([]);
  });
  it("replace all rewrites every text and counts occurrences", () => {
    const { deck } = twoSlides();
    const res = replaceAllInSlides(deck.slides, "plan", "roadmap", false);
    expect(res.count).toBe(5);
    expect(res.slides[0]!.title).toBe("Growth roadmap");
    expect(res.slides[0]!.bullets).toEqual(["grow the roadmap", "roadmap B"]);
    expect(res.slides[1]!.notes).toBe("the roadmap");
    expect(replaceAllInSlides(deck.slides, "zzz", "y", false).slides).toBe(deck.slides);
  });
  it("replace one changes only that text", () => {
    const { deck } = twoSlides();
    const hit = findInDeck(deck.slides, "Plan B", true)[0]!;
    const s = deckReducer({ deck, current: 0 }, { type: "replaceOne", index: hit.slideIndex, location: hit.location, find: "Plan B", replace: "Plan C", matchCase: true });
    expect(s.deck.slides[0]!.bullets).toEqual(["grow the plan", "Plan C"]);
  });
  it("comments add, resolve, delete", () => {
    let s = deckReducer(twoSlides(), { type: "addComment", index: 0, comment: { id: "c1", author: "A", text: "hi", at: "2026-01-01T00:00:00Z" } });
    expect(commentsOf(s.deck.slides[0])).toHaveLength(1);
    s = deckReducer(s, { type: "resolveComment", index: 0, id: "c1", resolved: true });
    expect(commentsOf(s.deck.slides[0])[0]!.resolved).toBe(true);
    s = deckReducer(s, { type: "deleteComment", index: 0, id: "c1" });
    expect(commentsOf(s.deck.slides[0])).toHaveLength(0);
  });
  it("slide text format merges and clears", () => {
    let s = deckReducer(twoSlides(), { type: "setSlideTextStyle", index: 0, style: { bold: true } });
    s = deckReducer(s, { type: "setSlideTextStyle", index: 0, style: { color: "#ff0000" } });
    expect((s.deck.slides[0] as { textStyle?: unknown }).textStyle).toEqual({ bold: true, color: "#ff0000" });
    s = deckReducer(s, { type: "setSlideTextStyle", index: 0, style: null });
    expect("textStyle" in s.deck.slides[0]!).toBe(false);
  });
  it("theme builder merges into the deck theme", () => {
    const s = deckReducer(twoSlides(), { type: "setTheme", theme: { primaryColor: "#abcdef" } });
    expect(s.deck.theme?.primaryColor).toBe("#abcdef");
    expect(s.deck.theme?.preset).toBe("classic");
  });
  it("plain paste takes text/plain, else strips html", () => {
    expect(plainTextOf({ text: "a\r\nb" })).toBe("a\nb");
    expect(plainTextOf({ html: "<p>Hi <b>there</b></p><p>x</p>" })).toBe("Hi there\nx");
  });
  it("import maps extracted slides to deck slides", () => {
    const slides = portionsToSlides([
      { title: "Launch", markdown: "# Launch\n\nQ3 kickoff" },
      { title: "Agenda", markdown: "## Agenda\n- one\n- two\n3. three" },
      { title: "End", markdown: "" },
    ]);
    expect(slides[0]).toMatchObject({ layout: "title", title: "Launch", subtitle: "Q3 kickoff" });
    expect(slides[1]).toMatchObject({ layout: "bullets", title: "Agenda", bullets: ["one", "two", "three"] });
    expect(slides[2]).toMatchObject({ layout: "section", title: "End" });
    const s = deckReducer(twoSlides(), { type: "appendSlides", slides });
    expect(s.deck.slides).toHaveLength(5);
    expect(s.current).toBe(2);
  });
  it("special characters search by name or glyph", () => {
    expect(searchSpecialChars("euro").map((c) => c.char)).toContain("€");
    expect(searchSpecialChars("→").length).toBeGreaterThan(0);
    expect(searchSpecialChars("qqqq")).toEqual([]);
  });
});
