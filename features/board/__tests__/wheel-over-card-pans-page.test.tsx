/**
 * V-1 (final review 2026-10-18): the mouse wheel over a card did nothing in page layout. The tile card
 * carried `data-board-chrome="bare|headerless|full"` (its chrome STYLE), and the viewport reads
 * `[data-board-chrome]` as "UI chrome, not canvas" — so every wheel over a card was ignored. The card's
 * style now lives on `data-board-tile-chrome`; only real chrome (toolbars, menus) is `data-board-chrome`.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardViewport } from "../components/BoardViewport";
import { BoardTile } from "../components/BoardTile";
import type { BoardCameraStore } from "../engine/camera-store";

describe("the wheel over a card in page layout", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  async function mount(): Promise<BoardCameraStore> {
    let store: BoardCameraStore | null = null;
    await act(async () =>
      root.render(
        <BoardViewport initialCamera={{ x: 0, y: 0, z: 1 }} fitOnMount={false} onStore={(s) => {
            store = s;
          }}>
          <BoardTile id="cover" rect={{ x: 0, y: 0, w: 1000, h: 600 }} title="Overview" onMove={null} onResize={null}>
            {() => <p id="prose">Prose</p>}
          </BoardTile>
          <div data-board-chrome id="toolbar">
            toolbar
          </div>
        </BoardViewport>,
      ),
    );
    act(() => store!.setPageLock({ column: { x: 0, w: 1000 } }));
    return store!;
  }

  const wheel = (el: Element) =>
    act(() => {
      el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 }));
    });

  it("pans the page down", async () => {
    const store = await mount();
    const card = host.querySelector("[data-board-card]")!;
    expect(card).not.toBeNull();
    const before = store.getCamera().y;
    wheel(host.querySelector("#prose")!);
    expect(store.getCamera().y).toBe(before - 120);
  });

  it("keeps its chrome style off the UI-chrome marker, and real chrome still owns its wheel", async () => {
    const store = await mount();
    const card = host.querySelector("[data-board-card]")!;
    expect(card.hasAttribute("data-board-chrome")).toBe(false);
    expect(card.getAttribute("data-board-tile-chrome")).toMatch(/^(bare|headerless|full)$/);
    const before = store.getCamera().y;
    wheel(host.querySelector("#toolbar")!);
    expect(store.getCamera().y).toBe(before);
  });
});
