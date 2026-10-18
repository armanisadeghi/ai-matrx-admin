import {
  STUDIO_PANE_MIN_PX,
  STUDIO_SIDE_MIN_PX,
  STUDIO_THREE_PANE_PX,
  STUDIO_TWO_PANE_PX,
  studioLayoutFor,
} from "../studio-layout";

describe("studio layout", () => {
  it("three panes only where their minimums fit with room to spare", () => {
    const total = STUDIO_PANE_MIN_PX.assistant + STUDIO_PANE_MIN_PX.agent + STUDIO_PANE_MIN_PX.controls;
    expect(total).toBeLessThanOrEqual(STUDIO_THREE_PANE_PX - 60);
  });
  it("two panes only where the side column and the agent fit", () => {
    expect(STUDIO_SIDE_MIN_PX + STUDIO_PANE_MIN_PX.agent).toBeLessThanOrEqual(STUDIO_TWO_PANE_PX);
  });
  it("leaves the controls pane room for its five tabs", () => {
    expect(STUDIO_PANE_MIN_PX.controls).toBeGreaterThanOrEqual(320);
    expect(STUDIO_SIDE_MIN_PX).toBeGreaterThanOrEqual(320);
  });
  it("follows the workspace's own width (Watch AI open at 1440 leaves about 760 px)", () => {
    expect(studioLayoutFor(1876)).toBe("three"); // 1920 window
    expect(studioLayoutFor(1396)).toBe("three"); // 1440 window, nothing open beside it
    expect(studioLayoutFor(1236)).toBe("three"); // 1280 window
    expect(studioLayoutFor(760)).toBe("two"); // 1440 window with Watch AI open
    expect(studioLayoutFor(1000)).toBe("two");
    expect(studioLayoutFor(600)).toBe("tabs");
    expect(studioLayoutFor(390)).toBe("tabs"); // phone
  });
});
