/**
 * @jest-environment jsdom
 *
 * 2026-10-18 adversarial review: reopening a long Studio session landed at the FIRST message. A reopened
 * transcript is held at its bottom while its history renders, and the person's own scroll ends that at once.
 */
import { pinToLatest } from "../pin-to-latest";

function frame(height: number) {
  const root = document.createElement("div");
  const scroller = document.createElement("div");
  scroller.className = "absolute inset-0 overflow-y-auto";
  scroller.appendChild(document.createElement("div"));
  root.appendChild(scroller);
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, get: () => height });
  return { root, scroller };
}

it("puts a reopened transcript at its latest turn", () => {
  const { root, scroller } = frame(4200);
  const stop = pinToLatest(root);
  expect(scroller.scrollTop).toBe(4200);
  stop();
});

it("does nothing without a transcript", () => {
  expect(() => pinToLatest(null)()).not.toThrow();
});
