/**
 * C9b: a peer's cursor ring is placed with Univer's own cell transform. `FRange.getCellRect()` returns SHEET
 * coordinates (no scroll, no zoom), so using it as screen pixels put rings in the wrong place and left them behind after a
 * scroll. cellBox applies (cell - main viewport scroll) x zoom + the canvas position; scrolling moves the box with the cell.
 */
import { IRenderManagerService } from "@univerjs/engine-render";
import { SheetSkeletonManagerService } from "@univerjs/preset-sheets-core";

import { cellBox } from "../sheetCellBox";

function world(o: { scrollX: number; scrollY: number; scale?: number; canvas?: { left: number; top: number; cssWidth: number; width: number } }) {
  const canvasRect = o.canvas ?? { left: 40, top: 120, cssWidth: 800, width: 800 };
  const canvas = { style: { width: `${canvasRect.cssWidth}px` }, getBoundingClientRect: () => ({ left: canvasRect.left, top: canvasRect.top, width: canvasRect.width }) };
  // Row r starts at y = 20 + 24 r; column c at x = 46 + 100 c (row header 46 wide, column header 20 high)
  const skeleton = { getCellWithCoordByIndex: (r: number, c: number) => ({ startX: 46 + 100 * c, endX: 146 + 100 * c, startY: 20 + 24 * r, endY: 44 + 24 * r }) };
  const render = {
    scene: { getAncestorScale: () => ({ scaleX: o.scale ?? 1, scaleY: o.scale ?? 1 }), getViewport: (k: string) => (k === "viewMain" ? { viewportScrollX: o.scrollX, viewportScrollY: o.scrollY } : null) },
    engine: { getCanvasElement: () => canvas },
    with: (t: unknown) => (t === SheetSkeletonManagerService ? { getCurrentParam: () => ({ skeleton }) } : undefined),
  };
  const injector = { get: (t: unknown) => (t === IRenderManagerService ? { getRenderUnitById: () => render } : undefined) };
  return injector as { get<T>(t: unknown): T };
}

describe("cellBox", () => {
  it("unscrolled: the cell's sheet position plus where the canvas sits on the page", () => {
    expect(cellBox(world({ scrollX: 0, scrollY: 0 }), "wb", 2, 1)).toEqual({ left: 40 + 146, right: 40 + 246, top: 120 + 68, bottom: 120 + 92 });
  });
  it("after scrolling down 480px and right 200px the same cell is drawn that far up and left", () => {
    const still = cellBox(world({ scrollX: 0, scrollY: 0 }), "wb", 30, 4)!;
    const scrolled = cellBox(world({ scrollX: 200, scrollY: 480 }), "wb", 30, 4)!;
    expect(scrolled.left).toBe(still.left - 200);
    expect(scrolled.top).toBe(still.top - 480);
    expect(scrolled.right - scrolled.left).toBe(still.right - still.left);
  });
  it("zoom scales distances from the canvas origin", () => {
    const b = cellBox(world({ scrollX: 0, scrollY: 0, scale: 2 }), "wb", 0, 0)!;
    expect(b).toEqual({ left: 40 + 92, right: 40 + 292, top: 120 + 40, bottom: 120 + 88 });
  });
  it("says so (null) when the workbook has no render yet", () => {
    const injector = { get: () => ({ getRenderUnitById: () => undefined }) } as unknown as { get<T>(t: unknown): T };
    expect(cellBox(injector, "wb", 0, 0)).toBeNull();
  });
});
