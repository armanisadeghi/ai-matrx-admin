/**
 * MKT-104: a window the system opens by itself (debug's Workflow run + Watch AI) opens only when a
 * gutter beside the page's working column can hold it. With no gutter it is NOT opened: a parked tray
 * tile sat over the page's own bottom-right controls ("Create brand") at 1024 wide.
 */

import { autoOpenHasRoom } from "../utils/autoOpenPlacement";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
}

function pageWithColumn(left: number, right: number) {
  document.body.innerHTML = `<main><button id="b">Go</button></main>`;
  const rect = (l: number, r: number) =>
    ({ left: l, right: r, top: 100, bottom: 130, width: r - l, height: 30, x: l, y: 100 }) as DOMRect;
  const main = document.querySelector("main") as HTMLElement;
  main.getBoundingClientRect = () => rect(0, window.innerWidth);
  (document.getElementById("b") as HTMLElement).getBoundingClientRect = () => rect(left, right);
}

describe("autoOpenHasRoom", () => {
  it("is false at 1024 when the page's column leaves no usable gutter", () => {
    setViewport(1024);
    pageWithColumn(150, 918);
    expect(autoOpenHasRoom()).toBe(false);
  });

  it("is true at 1440 when the column leaves a wide gutter", () => {
    setViewport(1440);
    pageWithColumn(400, 1000);
    expect(autoOpenHasRoom()).toBe(true);
  });

  it("is false on a narrow viewport", () => {
    setViewport(600);
    pageWithColumn(20, 500);
    expect(autoOpenHasRoom()).toBe(false);
  });
});
