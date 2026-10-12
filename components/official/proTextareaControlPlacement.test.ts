import {
  INLINE_CONTROLS_MIN_HEIGHT_PX,
  SUBMIT_BUTTON_WIDTH_PX,
  TAP_HALF_GAP_PX,
  clusterPlacementProblems,
  inlineControlsFieldPadding,
  proTextareaClusterPlacement,
} from "./proTextareaControlPlacement";

/**
 * The composer Send button sat 6px out of a 36px field (2026-10-12). The
 * inline geometry must keep a 38px tap box dead-centre in the shortest box.
 */
describe("ProTextarea inline controls geometry", () => {
  it("never lets the box be shorter than one tap row plus its half-gaps", () => {
    expect(INLINE_CONTROLS_MIN_HEIGHT_PX).toBe(SUBMIT_BUTTON_WIDTH_PX + 2 * TAP_HALF_GAP_PX);
  });

  it("insets the cluster by exactly the half-gap, so one line is dead-centre", () => {
    const p = proTextareaClusterPlacement(true, "inline");
    expect(p.className).toBe(`bottom-[${TAP_HALF_GAP_PX}px] right-[${TAP_HALF_GAP_PX}px]`);
    const below = TAP_HALF_GAP_PX;
    const above = INLINE_CONTROLS_MIN_HEIGHT_PX - SUBMIT_BUTTON_WIDTH_PX - below;
    expect(above).toBe(below);
    expect(clusterPlacementProblems(p)).toEqual([]);
  });

  it("reserves the measured cluster width plus the half-gap on each side", () => {
    expect(inlineControlsFieldPadding(126).paddingRight).toBe(`${126 + 2 * TAP_HALF_GAP_PX}px`);
  });
});
