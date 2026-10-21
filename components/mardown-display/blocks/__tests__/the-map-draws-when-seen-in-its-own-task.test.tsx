/**
 * THE MAP DRAWS WHEN IT CAN BE SEEN, IN A TASK OF ITS OWN (review 6, 2026-10-21). Live, the phone notes
 * page spent one 805–830 ms task on a map block's first draw: Leaflet's set-up, a tile grid at zoom 4
 * that the immediate refit threw away, then the real grid, all inside the task that drew the block.
 * Forcing functions:
 *   1. the map waits until its box is near the screen, then for an idle task (not the same task);
 *   2. the first view is already fitted to the places, so no throw-away tile grid is built.
 * Break it names: render <MapCanvas> unconditionally in MapBlock (1 red), or open every map at
 * zoom 4 again (2 red).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@ai-matrx/canvas/react", () => ({ useCanvasPresentation: () => null }));
jest.mock("next/dynamic", () => () => () => <div data-probe="leaflet-map" />);
jest.mock("@ai-matrx/rich-content/code-block/CodeBlock", () => ({ __esModule: true, default: () => <pre /> }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("leaflet/dist/leaflet.css", () => ({}), { virtual: true });

import { MapBlock } from "../map/MapBlock";
import { initialMapView } from "../map/parseMap";

/** An observer the test drives: nothing is on screen until `reveal()`. */
const observed = new Set<IntersectionObserverCallback>();
class DrivenObserver {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  private targets: Element[] = [];
  observe(target: Element) {
    this.targets.push(target);
    observed.add(this.fire);
  }
  unobserve() {}
  disconnect() {
    observed.delete(this.fire);
  }
  takeRecords() {
    return [];
  }
  private fire: IntersectionObserverCallback = () =>
    this.cb(this.targets.map((target) => ({ isIntersecting: true, intersectionRatio: 1, target }) as IntersectionObserverEntry), this as unknown as IntersectionObserver);
}
const reveal = () => [...observed].forEach((fire) => fire([], {} as IntersectionObserver));

const MAP = JSON.stringify({ markers: [{ lat: 48.85, lng: 2.35, label: "Paris" }, { lat: 51.5, lng: -0.12, label: "London" }] });

let root: Root | null = null;
let host: HTMLDivElement | null = null;
beforeEach(() => {
  jest.useFakeTimers();
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = DrivenObserver;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  observed.clear();
  delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  jest.useRealTimers();
});

const drawn = () => host!.querySelector("[data-probe='leaflet-map']");

it("draws the map only once it is near the screen, and then in a later idle task", () => {
  act(() => root!.render(<MapBlock content={MAP} />));
  // The block's own frame is there; the map is not.
  expect(host!.querySelector("[data-matrx-print-picture]")).not.toBeNull();
  expect(drawn()).toBeNull();
  act(() => void jest.advanceTimersByTime(5_000));
  expect(drawn()).toBeNull();

  // Seen: still not in the same task.
  act(() => reveal());
  expect(drawn()).toBeNull();
  // The next idle task draws it.
  act(() => void jest.advanceTimersByTime(700));
  expect(drawn()).not.toBeNull();
});

it("opens already fitted to its places: no first view to throw away", () => {
  expect(initialMapView([{ lat: 48.85, lng: 2.35 }, { lat: 51.5, lng: -0.12 }])).toEqual({ bounds: [[48.85, 2.35], [51.5, -0.12]] });
  expect(initialMapView([{ lat: 48.85, lng: 2.35 }])).toEqual({ center: [48.85, 2.35], zoom: 13 });
  expect(initialMapView([{ lat: 1, lng: 2 }], [10, 20], 8)).toEqual({ center: [10, 20], zoom: 8 });
});
