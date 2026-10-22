/**
 * @jest-environment jsdom
 *
 * A MENU PANEL IS NOT A PAGE (live walk 2026-10-21/22): the composer's "Model and overrides" panel
 * scrolls inside a 360px popover, and the floating-clearance guard judged it by the page's bottom
 * band — the assists pill sat beside it, so the panel's last switch (an input capability) got the
 * dashed red outline and a "1 Issue" badge. A popper layer is drawn above the floating chrome and
 * placed by its popper; the band rule is a page's. The same scroller outside a popper still fails.
 */
import { findContentUnderFloatingChrome, type FloatingBox } from "./floating-chrome";

function box(el: Element, top: number, bottom: number, left = 0, right = 800) {
  el.getBoundingClientRect = () => ({ top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} }) as DOMRect;
}

function panelScroller(inPopper: boolean) {
  const host = document.createElement("div");
  if (inPopper) host.setAttribute("data-radix-popper-content-wrapper", "");
  const scroller = document.createElement("div");
  box(scroller, 350, 870, 775, 1135);
  const row = document.createElement("button");
  row.setAttribute("role", "switch");
  box(row, 797, 825, 1085, 1119);
  scroller.append(row);
  host.append(scroller);
  document.body.append(host);
  return scroller;
}

const pill = { element: document.createElement("div"), rect: { top: 812, bottom: 840, left: 1180, right: 1290 } as DOMRect } as FloatingBox;

afterEach(() => {
  document.body.innerHTML = "";
});

it("never judges a menu panel's scroller by the page's floating band", () => {
  expect(findContentUnderFloatingChrome(panelScroller(true), [pill])).toBeNull();
});

it("still finds the same content under the band in a page scroller", () => {
  expect(findContentUnderFloatingChrome(panelScroller(false), [pill])?.content.getAttribute("role")).toBe("switch");
});
