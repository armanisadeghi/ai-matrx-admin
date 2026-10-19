/**
 * M-6 (final review 2026-10-18): grow-to-fit measured EVERY element of the card (querySelectorAll("*")
 * per scroller — O(n²) per input) and set overflowY = hidden on any child component's scrollers. It now
 * measures only the scroller the body registered (`data-board-scroll-root`); others are never touched.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardTile } from "../components/BoardTile";
import { BoardCameraStoreContext } from "../engine/react";
import { BoardCameraStore } from "../engine/camera-store";

describe("grow to fit", () => {
  let host: HTMLDivElement;
  let root: Root;
  const restore: (() => void)[] = [];
  const stub = (proto: object, key: string, get: () => unknown) => {
    const was = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(proto, key, { configurable: true, get });
    restore.push(() => (was ? Object.defineProperty(proto, key, was) : delete (proto as Record<string, unknown>)[key]));
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    stub(HTMLElement.prototype, "offsetHeight", () => 300);
    stub(HTMLElement.prototype, "clientHeight", () => 240);
    stub(HTMLElement.prototype, "scrollHeight", () => 600);
    const rects = HTMLElement.prototype.getClientRects;
    HTMLElement.prototype.getClientRects = function () {
      return [{}] as unknown as DOMRectList;
    };
    restore.push(() => (HTMLElement.prototype.getClientRects = rects));
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    for (const r of restore.splice(0)) r();
    jest.useRealTimers();
  });

  it("measures only the registered scroll root and leaves other scrollers alone", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    const onAutoHeight = jest.fn();
    act(() =>
      root.render(
        <BoardCameraStoreContext.Provider value={store}>
          <BoardTile
            id="t"
            rect={{ x: 0, y: 0, w: 600, h: 300 }}
            title="Editor"
            onResize={null}
            chrome={{ headerless: false, bare: false, autoHeight: false, growToFit: true }}
            onAutoHeight={onAutoHeight}
          >
            {() => (
              <div>
                <div id="other" style={{ overflowY: "auto", maxHeight: "none" }}>
                  <p>a list with its own scroll</p>
                </div>
                <div id="root" data-board-scroll-root="" style={{ overflowY: "auto", maxHeight: "none" }}>
                  <p>the editor's words</p>
                </div>
              </div>
            )}
          </BoardTile>
        </BoardCameraStoreContext.Provider>,
      ),
    );
    act(() => jest.advanceTimersByTime(500));
    expect((host.querySelector("#other") as HTMLElement).style.overflowY).toBe("auto");
    expect((host.querySelector("#root") as HTMLElement).style.overflowY).toBe("hidden");
  });
});
