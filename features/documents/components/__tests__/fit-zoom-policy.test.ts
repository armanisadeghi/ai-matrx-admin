import { fitZoomToApply } from "../fitZoomPolicy";

describe("the page is fitted to the editor only in a phone-sized window", () => {
  it("a desktop window whose stage shrank for the comment rail keeps its zoom (was: fit 0.45)", () => {
    expect(fitZoomToApply(1440, false, 0.45)).toBeNull();
  });
  it("a phone window fits the page", () => {
    expect(fitZoomToApply(390, false, 0.45)).toBe(0.45);
  });
  it("widening a window that was fitted puts the page back to 100%", () => {
    expect(fitZoomToApply(1440, true, 0.45)).toBe(1);
  });
});
