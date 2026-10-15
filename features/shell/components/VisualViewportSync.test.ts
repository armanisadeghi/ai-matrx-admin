import { calculateKeyboardInset, isSoftwareKeyboardOpen } from "./VisualViewportSync";

describe("calculateKeyboardInset", () => {
  it("returns the covered bottom area for an overlay keyboard", () => {
    expect(
      calculateKeyboardInset({
        innerHeight: 900,
        viewportHeight: 520,
        viewportOffsetTop: 0,
        viewportScale: 1,
        textEntryFocused: true,
      }),
    ).toBe(380);
  });

  it("does not add an inset when the layout viewport resizes with the keyboard", () => {
    expect(
      calculateKeyboardInset({
        innerHeight: 520,
        viewportHeight: 520,
        viewportOffsetTop: 0,
        viewportScale: 1,
        textEntryFocused: true,
      }),
    ).toBe(0);
  });

  it("ignores viewport changes without a focused text-entry control", () => {
    expect(
      calculateKeyboardInset({
        innerHeight: 900,
        viewportHeight: 520,
        viewportOffsetTop: 0,
        viewportScale: 1,
        textEntryFocused: false,
      }),
    ).toBe(0);
  });

  it("ignores pinch zoom and small browser-toolbar movement", () => {
    expect(
      calculateKeyboardInset({
        innerHeight: 900,
        viewportHeight: 520,
        viewportOffsetTop: 0,
        viewportScale: 1.5,
        textEntryFocused: true,
      }),
    ).toBe(0);
    expect(
      calculateKeyboardInset({
        innerHeight: 900,
        viewportHeight: 850,
        viewportOffsetTop: 0,
        viewportScale: 1,
        textEntryFocused: true,
      }),
    ).toBe(0);
  });
});

// Arman, 2026-10-15: the app frame pins to the visible area while a keyboard
// is up — including when iOS PANNED the view down to the field (offsetTop > 0),
// which uncovers the bottom but still hides the top of the frame.
describe("isSoftwareKeyboardOpen", () => {
  const base = { innerHeight: 844, viewportHeight: 450, viewportScale: 1, textEntryFocused: true };
  it("is open when a focused field leaves a keyboard-sized gap", () => {
    expect(isSoftwareKeyboardOpen(base)).toBe(true);
  });
  it("stays open when iOS panned the view (the inset reads 0 there)", () => {
    expect(
      calculateKeyboardInset({ ...base, viewportOffsetTop: 394 }),
    ).toBe(0);
    expect(isSoftwareKeyboardOpen(base)).toBe(true);
  });
  it("is closed with nothing focused, under pinch zoom, or for toolbar movement", () => {
    expect(isSoftwareKeyboardOpen({ ...base, textEntryFocused: false })).toBe(false);
    expect(isSoftwareKeyboardOpen({ ...base, viewportScale: 2 })).toBe(false);
    expect(isSoftwareKeyboardOpen({ ...base, viewportHeight: 800 })).toBe(false);
  });
});
