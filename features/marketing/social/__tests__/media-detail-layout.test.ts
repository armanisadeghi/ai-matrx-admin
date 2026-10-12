import { planMediaLayout } from "../components/MediaDetailLayout";

describe("planMediaLayout", () => {
  it("a vertical reel in a 780x600 window sits beside the details and uses nearly the full height", () => {
    const p = planMediaLayout(780, 520, 9 / 16);
    expect(p.mode).toBe("side");
    expect(p.height).toBeGreaterThan(520 - 24 - 36 - 12);
    expect(Math.abs(p.width / p.height - 9 / 16)).toBeLessThan(0.01);
  });
  it("a 16:9 video in a narrow window stacks, full width", () => {
    const p = planMediaLayout(760, 520, 16 / 9);
    expect(p.mode).toBe("stack");
    expect(p.width).toBeGreaterThan(450);
  });
  it("a phone stacks and leaves a peek of the details under a tall reel", () => {
    const p = planMediaLayout(375, 700, 9 / 16);
    expect(p.mode).toBe("stack");
    expect(p.height).toBeLessThanOrEqual(700 - 150);
  });
  it("scales with the window", () => {
    expect(planMediaLayout(1280, 860, 9 / 16).height).toBeGreaterThan(planMediaLayout(780, 520, 9 / 16).height);
  });
});
