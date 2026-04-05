import { WindowRect } from "@/lib/redux/slices/windowManagerSlice";

/**
 * Calculates a 4-grid quadrant (2x2).
 * @param index 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
 */
export function getGrid4Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 2);
  const h = Math.round(vh / 2);
  return {
    x: (index % 2) * w,
    y: Math.floor(index / 2) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates a 6-grid partition (3 columns x 2 rows).
 * @param index 0-5. 0-2 is top row (left-to-right), 3-5 is bottom row.
 */
export function getGrid6Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 3);
  const h = Math.round(vh / 2);
  return {
    x: (index % 3) * w,
    y: Math.floor(index / 3) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates an 8-grid partition (4 columns x 2 rows).
 * @param index 0-7. 0-3 is top row, 4-7 is bottom row.
 */
export function getGrid8Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 4);
  const h = Math.round(vh / 2);
  return {
    x: (index % 4) * w,
    y: Math.floor(index / 4) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates 2 stacked windows on the right edge.
 * @param index 0: top right half, 1: bottom right half
 */
export function getStackedRight2Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 2);
  const h = Math.round(vh / 2);
  return {
    x: w,
    y: (index % 2) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates 3 stacked windows on the right edge.
 * @param index 0, 1, 2 top-to-bottom on the right third of the screen.
 */
export function getStackedRight3Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 3);
  const h = Math.round(vh / 3);
  return {
    x: vw - w,
    y: (index % 3) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates 2 stacked windows on the left edge.
 * @param index 0: top left half, 1: bottom left half
 */
export function getStackedLeft2Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 2);
  const h = Math.round(vh / 2);
  return {
    x: 0,
    y: (index % 2) * h,
    width: w,
    height: h,
  };
}

/**
 * Calculates 3 stacked windows on the left edge.
 * @param index 0, 1, 2 top-to-bottom on the left third of the screen.
 */
export function getStackedLeft3Rect(index: number, vw: number, vh: number): WindowRect {
  const w = Math.round(vw / 3);
  const h = Math.round(vh / 3);
  return {
    x: 0,
    y: (index % 3) * h,
    width: w,
    height: h,
  };
}

/**
 * Helper: Applies global arrangement to an array of windows logic.
 * Returns an array of updates to batch dispatch.
 */
export function computeGlobalArrangement(
  layout: "grid4" | "grid6" | "grid8" | "stackRight2" | "stackRight3" | "stackLeft2" | "stackLeft3",
  windowIds: string[],
  vw: number,
  vh: number
): { id: string; rect: WindowRect }[] {
  const getRectFn = {
    grid4: getGrid4Rect,
    grid6: getGrid6Rect,
    grid8: getGrid8Rect,
    stackRight2: getStackedRight2Rect,
    stackRight3: getStackedRight3Rect,
    stackLeft2: getStackedLeft2Rect,
    stackLeft3: getStackedLeft3Rect,
  }[layout];

  return windowIds.map((id, i) => ({
    id,
    rect: getRectFn(i, vw, vh),
  }));
}
