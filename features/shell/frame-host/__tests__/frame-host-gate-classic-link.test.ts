/**
 * THE WAY BACK KEEPS THE PAGE (adversarial review, 2026-10-22): the frame's error fallback linked
 * `?frame=classic`, which drops every other query parameter (a filter, a tab, a record), so the
 * classic page opened somewhere else. It keeps them and only sets `frame`.
 */
import { classicLayoutHref } from "../FrameHostGate";

jest.mock("@/components/errors/LazyErrorAlchemyMenu", () => ({ LazyErrorAlchemyMenu: () => null }));
jest.mock("next/dynamic", () => () => () => null);

describe("classicLayoutHref", () => {
  it("keeps the existing query and switches frame to classic", () => {
    const href = new URLSearchParams(classicLayoutHref("?tab=runs&id=42&frame=new").slice(1));
    expect(href.get("tab")).toBe("runs");
    expect(href.get("id")).toBe("42");
    expect(href.get("frame")).toBe("classic");
  });

  it("an empty query gives just the switch", () => {
    expect(classicLayoutHref("")).toBe("?frame=classic");
  });
});
