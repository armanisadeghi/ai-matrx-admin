/**
 * @jest-environment jsdom
 *
 * A waiting state is a claim that something is coming (Arman, 2026-10-14: a homepage box shimmered for 14 minutes
 * over a picture nobody was taking). It is true only while the job is in flight and never past its limit; the
 * clock restarts when the job starts again. Proven failing: return `active` alone and the expiry case goes red.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useBoundedWait } from "../useBoundedWait";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let seen: boolean[] = [];
function Probe({ active }: { active: boolean }) {
  seen.push(useBoundedWait(active, 1000));
  return null;
}

describe("useBoundedWait", () => {
  let root: Root;
  beforeEach(() => {
    jest.useFakeTimers();
    seen = [];
    root = createRoot(document.createElement("div"));
  });
  afterEach(() => {
    act(() => root.unmount());
    jest.useRealTimers();
  });
  const last = () => seen[seen.length - 1];

  it("is false when nothing is in flight", () => {
    act(() => root.render(<Probe active={false} />));
    expect(last()).toBe(false);
  });

  it("waits while in flight, then ends at the limit even if the job never says done", () => {
    act(() => root.render(<Probe active />));
    expect(last()).toBe(true);
    act(() => jest.advanceTimersByTime(999));
    expect(last()).toBe(true);
    act(() => jest.advanceTimersByTime(2));
    expect(last()).toBe(false);
  });

  it("restarts the clock when the job starts again", () => {
    act(() => root.render(<Probe active />));
    act(() => jest.advanceTimersByTime(1500));
    expect(last()).toBe(false);
    act(() => root.render(<Probe active={false} />));
    act(() => root.render(<Probe active />));
    expect(last()).toBe(true);
  });
});
