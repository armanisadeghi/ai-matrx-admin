import { STUDIO_MIN_THREE_PANE_PX, STUDIO_PANE_MIN_PX } from "../studio-layout";

describe("studio pane minimums", () => {
  it("fit side by side at the narrowest three-pane width", () => {
    const total = STUDIO_PANE_MIN_PX.assistant + STUDIO_PANE_MIN_PX.agent + STUDIO_PANE_MIN_PX.controls;
    expect(total).toBeLessThanOrEqual(STUDIO_MIN_THREE_PANE_PX - 44);
  });
  it("leave the controls pane room for its five tabs", () => {
    expect(STUDIO_PANE_MIN_PX.controls).toBeGreaterThanOrEqual(340);
  });
});
