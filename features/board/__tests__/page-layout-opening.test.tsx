/**
 * The first view of a page-layout board (final review 2026-10-18):
 *  - M-3: on a phone the page was laid at the full 1100 column and shown zoomed out (z≈0.3) until the
 *    board's changes quieted (~10 s): the narrow column waited on the debounced re-flow. Measuring the
 *    view now re-flows to the phone's column AT ONCE.
 *  - M-4: a first open landed mid-Overview: every later camera move (the view measured, a fit) kept the
 *    view's CENTER. The page now holds its top until the person moves it.
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ from: () => ({}) }) } }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardStore } from "../board/board-store";
import { BoardCameraStore, PAGE_VIEW_MARGIN } from "../engine/camera-store";
import { PAGE_COLUMN_W } from "../engine/page-layout";
import { usePageLayout, PAGE_LABEL_ROOM } from "../home/usePageLayout";
import type { Rect } from "../engine/camera";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Tile = { id: string; rect: Rect };
const r = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

function mount(store: BoardCameraStore, board: BoardStore<Tile>): Root {
  function Probe() {
    usePageLayout({ board, store, layout: "page", snapshot: null, chapterOrder: null, restoredView: false });
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  return root;
}

const seed = () =>
  new BoardStore<Tile>({
    tiles: [
      { id: "cover", rect: r(0, 0, 1000, 700) },
      { id: "colors", rect: r(0, 900, 1000, 1200) },
    ],
    frames: [
      { id: "overview", title: "Overview", rect: r(-50, -50, 1100, 800) },
      { id: "colors-f", title: "Colors", rect: r(-50, 850, 1100, 1300) },
    ],
  });

describe("a page-layout board's first view", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("narrows to a phone's column the moment the view is measured, never after the board quiets", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    const board = seed();
    const root = mount(store, board);
    expect(store.getPageLock()?.column.w).toBe(PAGE_COLUMN_W);
    // Tiles keep loading (each change re-arms the debounced re-flow) while the view is measured.
    act(() => {
      store.setSize({ w: 375, h: 812 });
    });
    expect(store.getPageLock()!.column.w).toBeLessThan(PAGE_COLUMN_W);
    expect(store.getCamera().z).toBeGreaterThan(0.8);
    act(() => root.unmount());
  });

  it("opens at the first chapter's top and holds it until the person moves the page", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    const board = seed();
    const root = mount(store, board);
    act(() => {
      store.setSize({ w: 1400, h: 900 });
      jest.advanceTimersByTime(50);
    });
    const topY = () => {
      const first = Math.min(...board.read().frames.map((f) => f.rect.y - PAGE_LABEL_ROOM), ...board.read().tiles.map((t) => t.rect.y));
      return store.getInsets().top + PAGE_VIEW_MARGIN - first * store.getCamera().z;
    };
    // Something moves the camera that is not the person (the viewport's opening fit, a tile growing).
    act(() => {
      store.setCamera({ ...store.getCamera(), y: store.getCamera().y - 475 });
      jest.advanceTimersByTime(50);
    });
    expect(store.getCamera().y).toBeCloseTo(topY(), 0);
    // The person scrolls: the page is theirs from here.
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 200 }));
      store.setCamera({ ...store.getCamera(), y: store.getCamera().y - 200 });
      jest.advanceTimersByTime(50);
    });
    expect(store.getCamera().y).toBeCloseTo(topY() - 200, 0);
    act(() => root.unmount());
  });
});
