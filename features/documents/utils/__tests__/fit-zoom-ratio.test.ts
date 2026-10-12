import { fitZoomRatio, MIN_FIT_ZOOM } from "../fitZoomRatio";

describe("fitZoomRatio", () => {
  it("is 100% when the page already fits", () => {
    expect(fitZoomRatio(1200, 595)).toBe(1);
    expect(fitZoomRatio(611, 595)).toBe(1);
  });
  it("shrinks the page to a phone's width", () => {
    const z = fitZoomRatio(375, 595);
    expect(z).toBeLessThan(1);
    expect(595 * z).toBeLessThanOrEqual(375);
  });
  it("never goes below the readable floor, and ignores a not-yet-measured width", () => {
    expect(fitZoomRatio(100, 595)).toBe(MIN_FIT_ZOOM);
    expect(fitZoomRatio(0, 595)).toBe(1);
  });
});
