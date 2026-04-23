/**
 * rectClamp.test.ts — viewport-safe geometry restoration.
 *
 * Guards the invariant that a rect saved at a larger screen never lands
 * off-screen on a smaller device, and that NaN / 0 / absurd inputs always
 * fall back to sensible defaults.
 */
import { clampRectToViewport } from "../utils/rectClamp";

const VIEWPORT = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 667 };

describe("clampRectToViewport", () => {
  describe("passes through valid rects", () => {
    it("keeps a rect that already fits", () => {
      const rect = { x: 100, y: 100, width: 400, height: 300 };
      const out = clampRectToViewport(rect, VIEWPORT);
      expect(out).toEqual(rect);
    });

    it("preserves zero origin", () => {
      const out = clampRectToViewport(
        { x: 0, y: 0, width: 200, height: 200 },
        VIEWPORT,
      );
      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
    });
  });

  describe("clamps oversized rects", () => {
    it("caps width + height to viewport minus padding", () => {
      const out = clampRectToViewport(
        { x: 0, y: 0, width: 9999, height: 9999 },
        MOBILE,
      );
      expect(out.width).toBeLessThanOrEqual(MOBILE.width);
      expect(out.height).toBeLessThanOrEqual(MOBILE.height);
    });

    it("keeps a rect stored at desktop inside a phone viewport", () => {
      const out = clampRectToViewport(
        { x: 200, y: 400, width: 800, height: 600 },
        MOBILE,
      );
      expect(out.x).toBeGreaterThanOrEqual(-(out.width - 48));
      expect(out.x).toBeLessThanOrEqual(MOBILE.width - 48);
      expect(out.y).toBeGreaterThanOrEqual(0);
      expect(out.y).toBeLessThanOrEqual(MOBILE.height - 48);
    });
  });

  describe("rejects nonsensical inputs", () => {
    it("falls back when width is 0", () => {
      const out = clampRectToViewport(
        { x: 100, y: 100, width: 0, height: 300 },
        VIEWPORT,
      );
      expect(out.width).toBeGreaterThan(0);
    });

    it("falls back when width is NaN", () => {
      const out = clampRectToViewport(
        { x: 100, y: 100, width: Number.NaN, height: 300 },
        VIEWPORT,
      );
      expect(out.width).toBeGreaterThan(0);
      expect(Number.isNaN(out.width)).toBe(false);
    });

    it("falls back when height is negative", () => {
      const out = clampRectToViewport(
        { x: 100, y: 100, width: 300, height: -500 },
        VIEWPORT,
      );
      expect(out.height).toBeGreaterThan(0);
    });

    it("falls back when width is 4x viewport width", () => {
      const out = clampRectToViewport(
        { x: 0, y: 0, width: VIEWPORT.width * 10, height: 300 },
        VIEWPORT,
      );
      expect(out.width).toBeLessThanOrEqual(VIEWPORT.width);
    });
  });

  describe("keeps the header grabbable", () => {
    it("clamps far-left-offscreen x so 48px remains visible", () => {
      const out = clampRectToViewport(
        { x: -1000, y: 100, width: 500, height: 300 },
        VIEWPORT,
      );
      // Min visible = 48px — window's (x + width) must be >= 48 from left
      expect(out.x + out.width).toBeGreaterThanOrEqual(48);
    });

    it("clamps far-right-offscreen x so 48px remains visible", () => {
      const out = clampRectToViewport(
        { x: VIEWPORT.width + 500, y: 100, width: 500, height: 300 },
        VIEWPORT,
      );
      expect(out.x).toBeLessThanOrEqual(VIEWPORT.width - 48);
    });

    it("never lets y go above the viewport", () => {
      const out = clampRectToViewport(
        { x: 100, y: -500, width: 500, height: 300 },
        VIEWPORT,
      );
      expect(out.y).toBeGreaterThanOrEqual(0);
    });

    it("clamps far-below-offscreen y so 48px remains visible", () => {
      const out = clampRectToViewport(
        { x: 100, y: VIEWPORT.height + 500, width: 500, height: 300 },
        VIEWPORT,
      );
      expect(out.y).toBeLessThanOrEqual(VIEWPORT.height - 48);
    });
  });

  describe("handles tiny viewports gracefully", () => {
    it("doesn't produce negative dimensions at 100x100", () => {
      const out = clampRectToViewport(
        { x: 0, y: 0, width: 500, height: 500 },
        { width: 100, height: 100 },
      );
      expect(out.width).toBeGreaterThan(0);
      expect(out.height).toBeGreaterThan(0);
    });
  });
});
