/**
 * @jest-environment jsdom
 *
 * A TABLE'S OWN SCROLLER ENDS CLEAR OF FLOATING CHROME (live walk 2026-10-22, Check findings): a
 * full-height table scrolls its rows inside its own frame, so the page runway never reaches it and
 * the attention pill sat over the last row's cells at the end of the scroll. The table's scroller
 * takes the same per-scroller runway a window's scroller does — but only while it is a bounded
 * scroller (its rows overflow it); a natural-height table that grows with its rows is the page's
 * to clear, and giving it a runway would grow it again on every measure.
 */
import { syncWindowScrollerRunways, WINDOW_SCROLLER_RUNWAY_ATTR, WINDOW_SCROLLER_RUNWAY_VAR, type FloatingBox } from "./floating-chrome";

function scroller(rect: { top: number; bottom: number }, scrollHeight: number, clientHeight: number) {
  const el = document.createElement("div");
  el.setAttribute("data-matrx-table-scroll", "");
  el.getBoundingClientRect = () => ({ top: rect.top, bottom: rect.bottom, left: 0, right: 800, width: 800, height: rect.bottom - rect.top, x: 0, y: rect.top, toJSON() {} }) as DOMRect;
  Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => scrollHeight + (el.hasAttribute(WINDOW_SCROLLER_RUNWAY_ATTR) ? Number.parseFloat(el.style.getPropertyValue(WINDOW_SCROLLER_RUNWAY_VAR)) || 0 : 0) });
  Object.defineProperty(el, "clientHeight", { configurable: true, get: () => clientHeight });
  document.body.append(el);
  return el;
}
const pill = { element: document.createElement("div"), rect: { top: 860, bottom: 892 } as DOMRect } as FloatingBox;

afterEach(() => { document.body.innerHTML = ""; });

it("gives a bounded table scroller the room to scroll its last row above the pill", () => {
  const el = scroller({ top: 140, bottom: 880 }, 3200, 740);
  syncWindowScrollerRunways([pill]);
  expect(el.hasAttribute(WINDOW_SCROLLER_RUNWAY_ATTR)).toBe(true);
  expect(Number.parseFloat(el.style.getPropertyValue(WINDOW_SCROLLER_RUNWAY_VAR))).toBeGreaterThanOrEqual(880 - 860);
  // A second measure keeps the same room (the scroller's box does not move).
  const first = el.style.getPropertyValue(WINDOW_SCROLLER_RUNWAY_VAR);
  syncWindowScrollerRunways([pill]);
  expect(el.style.getPropertyValue(WINDOW_SCROLLER_RUNWAY_VAR)).toBe(first);
});

it("leaves a natural-height table (its rows never overflow it) to the page", () => {
  const el = scroller({ top: 140, bottom: 1400 }, 1260, 1260);
  syncWindowScrollerRunways([pill]);
  expect(el.hasAttribute(WINDOW_SCROLLER_RUNWAY_ATTR)).toBe(false);
});

it("reserves nothing when nothing floats over the table", () => {
  const el = scroller({ top: 140, bottom: 700 }, 3200, 560);
  syncWindowScrollerRunways([pill]);
  expect(el.hasAttribute(WINDOW_SCROLLER_RUNWAY_ATTR)).toBe(false);
});
