/**
 * THE ASSISTS CONTROL NEVER FADES OVER THE COMPOSER (review 4, F14, 2026-10-20).
 *
 * Chat with the Notes & comments panel open: the thread fills the narrowed column, so no lift clears it
 * and the header has no room. The pill used to YIELD, faded over the composer's mic and send row. It now
 * rests in the strip just above the composer, left of the scroll-to-bottom button.
 *
 * RED on the old dock: `data-assist-dock-yield` was set and no `--assist-dock-slot-*` was written.
 */
import { applyAssistDockLift, dockPlacementVar } from "../assistClearance";

type Box = { top: number; bottom: number; left: number; right: number };
const W = 1000;
const H = 900;
const rect = ({ top, bottom, left, right }: Box): DOMRect =>
  ({ top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, box: Box, parent: Element = document.body) {
  const node = document.createElement(tag);
  node.getBoundingClientRect = () => rect(box);
  parent.appendChild(node);
  return node;
}
const inside = (x: number, y: number, b: Box) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

const DOCK: Box = { top: 817, bottom: 847, left: 718, right: 870 };
const COMPOSER: Box = { top: 747, bottom: 860, left: 292, right: 876 };
const THREAD: Box = { top: 60, bottom: 700, left: 292, right: 876 };
const SCROLL_BUTTON: Box = { top: 695, bottom: 727, left: 833, right: 865 };

function plant() {
  const dock = el("div", DOCK);
  dock.setAttribute("data-assists-dock", "");
  const message = el("div", THREAD);
  message.setAttribute("data-message-id", "m1");
  const composer = el("div", COMPOSER);
  composer.setAttribute("data-agent-input-shell", "");
  const send = el("button", { top: 820, bottom: 850, left: 820, right: 860 }, composer);
  const scroll = el("button", SCROLL_BUTTON);
  (document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = (x, y) => {
    const hits: Element[] = [];
    if (inside(x, y, DOCK)) hits.push(dock);
    if (inside(x, y, SCROLL_BUTTON)) hits.push(scroll);
    else if (inside(x, y, { top: 820, bottom: 850, left: 820, right: 860 })) hits.push(send);
    else if (inside(x, y, COMPOSER)) hits.push(composer);
    else if (inside(x, y, THREAD)) hits.push(message);
    return hits;
  };
  return { dock };
}

describe("the assists control rests above the composer when nothing else fits", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: W });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: H });
  });
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-assist-dock-slot");
  });

  it("does not yield: it sits in the strip above the composer, left of the scroll-to-bottom button", () => {
    const { dock } = plant();
    applyAssistDockLift();
    expect(dock.hasAttribute("data-assist-dock-yield")).toBe(false);
    const right = W - Number.parseFloat(dockPlacementVar("--assist-dock-slot-right"));
    const bottom = H - Number.parseFloat(dockPlacementVar("--assist-dock-slot-bottom"));
    const top = bottom - (DOCK.bottom - DOCK.top);
    expect(bottom).toBeLessThanOrEqual(COMPOSER.top); // above the composer, never in it
    expect(top).toBeGreaterThan(THREAD.bottom - 40);
    expect(right).toBeLessThan(SCROLL_BUTTON.left); // left of the button
  });
});
