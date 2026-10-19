/**
 * Arman, 2026-10-19: a tile grows to its content up to ONE ceiling (`AUTO_HEIGHT_CEILING_PX`); content past
 * it used to be CLIPPED. At the ceiling the tile's body is its own scroller: the rest scrolls inside, a
 * gesture that starts inside scrolls the tile and never chains to the board (`innermostScroller`, the
 * wheel latch's pick), and the tile gives the scroller back (grows/shrinks again) when the content fits.
 *
 * Fails when: a tile at the ceiling has no scroller around its body, a tile below it has one, or the
 * content height at the ceiling is read from the fixed card (so it could never shrink again).
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardTile } from "../components/BoardTile";
import { BoardCameraStoreContext } from "../engine/react";
import { BoardCameraStore } from "../engine/camera-store";
import { AUTO_HEIGHT_CEILING_PX, atAutoHeightCeiling, autoContentHeight } from "../engine/tile-chrome";
import { innermostScroller } from "../engine/wheel-input";

describe("content past the ceiling scrolls inside the tile", () => {
  it("knows the ceiling and the content height behind a fixed card", () => {
    expect(atAutoHeightCeiling(AUTO_HEIGHT_CEILING_PX)).toBe(true);
    expect(atAutoHeightCeiling(AUTO_HEIGHT_CEILING_PX - 600)).toBe(false);
    // Below the ceiling the card is its content.
    expect(autoContentHeight(900, null)).toBe(900);
    // At it, 2000 card = 40 header + 1960 visible body; the body holds 5000.
    expect(autoContentHeight(2000, { clientHeight: 1960, scrollHeight: 5000 })).toBe(5040);
    // A body that fits is not shorter than what it shows.
    expect(autoContentHeight(2000, { clientHeight: 1960, scrollHeight: 100 })).toBe(2000);
  });

  describe("the tile", () => {
    let host: HTMLDivElement;
    let root: Root;
    let style: HTMLStyleElement;

    beforeEach(() => {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
        observe() {}
        disconnect() {}
      };
      // The utility class the tile asks for (Tailwind is not loaded in jsdom).
      style = document.createElement("style");
      style.textContent = ".overflow-y-auto{overflow-y:auto}";
      document.head.appendChild(style);
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
    });
    afterEach(() => {
      act(() => root.unmount());
      host.remove();
      style.remove();
    });

    const show = (h: number) =>
      act(() =>
        root.render(
          <BoardCameraStoreContext.Provider value={new BoardCameraStore({ x: 0, y: 0, z: 1 })}>
            <BoardTile
              id="t"
              rect={{ x: 0, y: 0, w: 600, h }}
              title="A long page"
              onResize={null}
              chrome={{ headerless: false, bare: false, autoHeight: true, growToFit: false }}
              onAutoHeight={jest.fn()}
            >
              {() => <p id="line">the page</p>}
            </BoardTile>
          </BoardCameraStoreContext.Provider>,
        ),
      );

    it("at the ceiling the body is the tile's scroller, and a gesture inside it is the tile's", () => {
      show(AUTO_HEIGHT_CEILING_PX);
      const scroller = host.querySelector<HTMLElement>("[data-board-ceiling-scroll]");
      expect(scroller).not.toBeNull();
      expect(getComputedStyle(scroller!).overflowY).toBe("auto");
      expect(scroller!.contains(host.querySelector("#line"))).toBe(true);
      // Content taller than the tile: the wheel latch picks THIS element, not the board.
      Object.defineProperty(scroller!, "clientHeight", { configurable: true, value: 1960 });
      Object.defineProperty(scroller!, "scrollHeight", { configurable: true, value: 5000 });
      const tile = host.querySelector<HTMLElement>("[data-board-tile]")!;
      expect(innermostScroller(host.querySelector<HTMLElement>("#line"), tile, true, 1)).toBe(scroller);
      // The card is fixed to the tile (it no longer grows past it).
      expect(host.querySelector("[data-board-card]")!.className).toContain("h-full");
    });

    it("below the ceiling nothing scrolls: the tile lays out at its content", () => {
      show(AUTO_HEIGHT_CEILING_PX - 600);
      expect(host.querySelector("[data-board-ceiling-scroll]")).toBeNull();
      expect(host.querySelector("[data-board-card]")!.className).toContain("h-auto");
    });
  });
});
