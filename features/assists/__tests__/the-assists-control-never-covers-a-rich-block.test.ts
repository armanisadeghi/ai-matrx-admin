/**
 * THE ASSISTS CONTROL NEVER COVERS A RICH BLOCK (review 5, G11, 2026-10-21).
 *
 * In a note's Split view the pill rested over a tasks block's progress bar: the bar is not a
 * control, so nothing lifted the pill off it. Every rich block is wrapped in `data-block-menu`;
 * that wrapper is now a row of the document, like a chat message, so with blocks filling the pane
 * the pill takes the header's chrome slot instead of covering what the person reads.
 *
 * RED on the old code: no slot was written and the lift stayed 0, the pill resting on the bar.
 */
import { applyAssistDockLift, dockPlacementVar } from "../assistClearance";

type Box = { top: number; bottom: number; left: number; right: number };
const W = 1440;
const H = 900;
const rect = ({ top, bottom, left, right }: Box): DOMRect =>
  ({ top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
function el(tag: string, box: Box, parent: Element = document.body) {
  const node = document.createElement(tag);
  node.getBoundingClientRect = () => rect(box);
  parent.appendChild(node);
  return node;
}
const inside = (x: number, y: number, b: Box) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

describe("the assists control never covers a rich block", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: W });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: H });
  });
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-assist-dock-slot");
  });

  it("does not rest on a block's progress bar in Split", () => {
    const DOCK: Box = { top: 754, bottom: 784, left: 1273, right: 1427 };
    const dock = el("div", DOCK);
    dock.setAttribute("data-assists-dock", "");

    const header = el("header", { top: 0, bottom: 48, left: 0, right: W });
    el("span", { top: 12, bottom: 36, left: 56, right: 300 }, header).textContent = "Note";
    const cluster = el("div", { top: 4, bottom: 44, left: W - 200, right: W }, header);
    cluster.setAttribute("data-header-right-set", "");
    const search = el("button", { top: 8, bottom: 40, left: W - 196, right: W - 4 }, cluster);

    // The right pane: blocks stacked from under the header to the bottom, bars and text only.
    const pane: Box = { top: 64, bottom: H, left: 720, right: W };
    const blocks: HTMLElement[] = [];
    for (let top = 64; top < H; top += 160) {
      const menu = el("div", { top, bottom: Math.min(top + 160, H), left: 720, right: W });
      menu.setAttribute("data-block-menu", "");
      blocks.push(el("div", { top, bottom: top + 160, left: 720, right: W }, menu));
    }
    (document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = (x, y) => {
      if (inside(x, y, pane)) {
        const block = blocks[Math.min(blocks.length - 1, Math.floor((y - 64) / 160))]!;
        return inside(x, y, DOCK) ? [dock, block] : [block];
      }
      if (y < 48) return [inside(x, y, { top: 8, bottom: 40, left: W - 196, right: W - 4 }) ? search : header];
      return [document.body];
    };

    applyAssistDockLift();
    const lift = Number.parseFloat(dockPlacementVar("--assist-dock-lift") || "0");
    const slot = document.documentElement.getAttribute("data-assist-dock-slot");
    const yielded = dock.hasAttribute("data-assist-dock-yield");
    // Not resting at 754..784 over the bar; not faded over it either.
    expect(lift === 0 && !slot).toBe(false);
    expect(yielded).toBe(false);
  });
});
