import { shouldRearmWheel } from "./wheel-rearm";

// The shape a Mac trackpad emits for one swipe: rising, then a long decaying
// momentum tail. A second swipe starts while the tail is still emitting.
const SWIPE = [4, 10, 18, 26, 30, 28, 24, 20, 17, 14, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1];

describe("shouldRearmWheel", () => {
  it("never re-arms on the decaying momentum tail of one swipe", () => {
    for (let i = 6; i < SWIPE.length; i++) {
      expect(
        shouldRearmWheel({ locked: true, abs: SWIPE[i], lastAbs: SWIPE[i - 1], sinceFlipMs: 400 }),
      ).toBe(false);
    }
  });

  it("re-arms when a new swipe rises out of the previous tail", () => {
    // tail ended at 1, next swipe goes 4 → 10: the 10 is the new gesture.
    expect(shouldRearmWheel({ locked: true, abs: 10, lastAbs: 4, sinceFlipMs: 400 })).toBe(true);
  });

  it("does not re-arm right after a flip (same flick)", () => {
    expect(shouldRearmWheel({ locked: true, abs: 30, lastAbs: 10, sinceFlipMs: 50 })).toBe(false);
  });

  it("ignores tiny jitter and unlocked state", () => {
    expect(shouldRearmWheel({ locked: true, abs: 4, lastAbs: 1, sinceFlipMs: 400 })).toBe(false);
    expect(shouldRearmWheel({ locked: false, abs: 30, lastAbs: 1, sinceFlipMs: 400 })).toBe(false);
  });
});
