/**
 * Arman, 2026-10-19: "My scroll starts and ends with the thing it started with. It never switches
 * from one to the other just because one of them ran out." The first wheel event of a gesture
 * picks the owner (WheelLatch); it holds until the events pause WHEEL_GESTURE_LATCH_MS.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardViewport } from "../components/BoardViewport";
import { BoardTile } from "../components/BoardTile";
import type { BoardCameraStore } from "../engine/camera-store";
import { WHEEL_GESTURE_LATCH_MS, WheelLatch } from "../engine/wheel-input";

describe("WheelLatch", () => {
  const a = document.createElement("div");
  it("picks once per gesture and keeps the owner while events keep coming (momentum)", () => {
    const l = new WheelLatch();
    expect(l.claim(0, () => a)).toBe(a);
    expect(l.claim(WHEEL_GESTURE_LATCH_MS - 1, () => null)).toBe(a);
    // each event extends the gesture, so a long momentum tail stays latched
    expect(l.claim(2 * WHEEL_GESTURE_LATCH_MS - 2, () => null)).toBe(a);
    expect(l.claim(3 * WHEEL_GESTURE_LATCH_MS, () => null)).toBeNull();
  });
});

describe("the wheel over a tile with its own scroll", () => {
  let host: HTMLDivElement;
  let root: Root;
  let store: BoardCameraStore;
  let t = 1000;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    t = 1000;
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  async function mount() {
    await act(async () =>
      root.render(
        <BoardViewport initialCamera={{ x: 0, y: 0, z: 1 }} fitOnMount={false} wheelMode="pan" onStore={(s) => { store = s; }}>
          <BoardTile id="scrolly" rect={{ x: 0, y: 0, w: 600, h: 400 }} title="Long" onResize={null}>
            {() => <div id="scroller" style={{ overflowY: "auto", height: 300 }}><p id="inner">text</p></div>}
          </BoardTile>
          <BoardTile id="flat" rect={{ x: 700, y: 0, w: 600, h: 400 }} title="Flat" onResize={null}>
            {() => <p id="flat-text">no scroll</p>}
          </BoardTile>
        </BoardViewport>,
      ),
    );
    const sc = host.querySelector<HTMLElement>("#scroller")!;
    Object.defineProperty(sc, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(sc, "scrollHeight", { value: 1000, configurable: true });
    return sc;
  }

  const wheel = (el: Element, deltaY: number, gap = 16) => {
    t += gap;
    const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY });
    Object.defineProperty(ev, "timeStamp", { value: t });
    act(() => {
      el.dispatchEvent(ev);
    });
    return ev;
  };
  const SETTLE = WHEEL_GESTURE_LATCH_MS + 50;

  it("a gesture that starts on the board pans it over a scrollable tile; the tile does not scroll", async () => {
    const sc = await mount();
    const empty = host.querySelector<HTMLElement>("[data-board-viewport], [tabindex]") ?? host.firstElementChild!;
    wheel(empty, 40, SETTLE);
    const y1 = store.getCamera().y;
    expect(y1).toBe(-40);
    const ev = wheel(host.querySelector("#inner")!, 40);
    expect(store.getCamera().y).toBe(y1 - 40);
    expect(sc.scrollTop).toBe(0);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("a gesture that starts in the tile scrolls it; at its end the board does not move", async () => {
    const sc = await mount();
    const inner = host.querySelector("#inner")!;
    const ev = wheel(inner, 40, SETTLE);
    expect(ev.defaultPrevented).toBe(false); // native scroll owns it
    sc.scrollTop = 700; // the element is now at its end
    const end = wheel(inner, 40);
    expect(end.defaultPrevented).toBe(true);
    expect(store.getCamera().y).toBe(0);
  });

  it("a new gesture over a tile with nothing to scroll pans the board", async () => {
    const sc = await mount();
    const inner = host.querySelector("#inner")!;
    wheel(inner, 40, SETTLE);
    sc.scrollTop = 700;
    wheel(inner, 40); // latched, blocked
    expect(store.getCamera().y).toBe(0);
    wheel(inner, 40, SETTLE); // new gesture, element at its end: nothing to scroll that way
    expect(store.getCamera().y).toBe(-40);
    wheel(host.querySelector("#flat-text")!, 40, SETTLE);
    expect(store.getCamera().y).toBe(-80);
  });

  it("momentum keeps the owner after the element reaches its end", async () => {
    const sc = await mount();
    const inner = host.querySelector("#inner")!;
    wheel(inner, 40, SETTLE);
    sc.scrollTop = 700;
    for (let i = 0; i < 20; i++) wheel(inner, 5); // 320 ms of tail, still one gesture
    expect(store.getCamera().y).toBe(0);
  });
});
