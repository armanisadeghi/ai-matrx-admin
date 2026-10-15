import { windowScrollerRunwayPx, type FloatingBox } from "./floating-chrome";

const box = (top: number, bottom: number) => ({ element: {} as Element, rect: { top, bottom } as DOMRect }) as FloatingBox;

describe("a scroller inside a floating window reserves room under every floating box it reaches", () => {
  it("reserves nothing when nothing floats over it", () => {
    expect(windowScrollerRunwayPx({ top: 100, bottom: 600 }, [])).toBe(0);
    expect(windowScrollerRunwayPx({ top: 100, bottom: 600 }, [box(700, 760)])).toBe(0);
  });
  it("covers the assists pill that overlaps the window foot, not only the minimized tile", () => {
    const pill = box(560, 600);
    const tile = box(580, 640);
    expect(windowScrollerRunwayPx({ top: 100, bottom: 620 }, [pill])).toBeGreaterThanOrEqual(620 - 560 + 12);
    expect(windowScrollerRunwayPx({ top: 100, bottom: 620 }, [pill, tile])).toBe(windowScrollerRunwayPx({ top: 100, bottom: 620 }, [pill]));
  });
});
