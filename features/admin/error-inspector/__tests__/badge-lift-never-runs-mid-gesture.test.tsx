/**
 * The error badge's lift pass hit-tests the page (`elementsFromPoint`, hundreds of calls on a heavy page,
 * 100–500 ms each pass). The Board scale bench (2026-10-21) found ~2 s of these passes inside a 2 s tile
 * drag: the 1 s backstop and every scroll fired it mid-gesture. Rule: no pass while a pointer is held or a
 * wheel/scroll is under way; one pass once the page rests.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import { useFloatingLift } from "../useFloatingLift";
import { resetPageMotionForTests } from "@/lib/layout/page-motion";

function Badge() {
  const [ref] = useFloatingLift<HTMLDivElement>();
  return <div ref={ref} style={{ position: "fixed", bottom: 16, left: 16, width: 80, height: 24 }} />;
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(node);
  });
}

let hits = 0;
beforeEach(() => {
  jest.useFakeTimers();
  resetPageMotionForTests();
  hits = 0;
  document.elementsFromPoint = () => {
    hits += 1;
    return [];
  };
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { top: 860, bottom: 884, left: 16, right: 96, width: 80, height: 24, x: 16, y: 860, toJSON() {} } as DOMRect;
  };
});
afterEach(() => {
  jest.useRealTimers();
});

it("runs no pass while a pointer is held, whatever scrolls and however long, and one after release", () => {
  render(<Badge />);
  act(() => {
    jest.advanceTimersByTime(50);
  });
  expect(hits).toBeGreaterThan(0); // the first placement ran
  hits = 0;

  act(() => {
    window.dispatchEvent(new Event("pointerdown"));
  });
  for (let i = 0; i < 300; i++) {
    act(() => {
      document.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(16);
    });
  }
  expect(hits).toBe(0); // ~5 s of drag: the backstop and the scrolls asked, nothing hit-tested

  act(() => {
    window.dispatchEvent(new Event("pointerup"));
    jest.advanceTimersByTime(1000);
  });
  expect(hits).toBeGreaterThan(0); // at rest the badge is placed again
});

it("a stream of scroll events asks for one pass once quiet, never one per scroll frame", () => {
  render(<Badge />);
  act(() => {
    jest.advanceTimersByTime(50);
  });
  hits = 0;
  let passesDuringScroll = 0;
  for (let i = 0; i < 60; i++) {
    act(() => {
      document.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(16);
    });
    if (hits > 0) passesDuringScroll += 1;
    hits = 0;
  }
  expect(passesDuringScroll).toBe(0);
  act(() => {
    jest.advanceTimersByTime(400);
  });
  expect(hits).toBeGreaterThan(0);
});
