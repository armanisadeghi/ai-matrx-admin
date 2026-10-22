/**
 * THE RESIZE HANDLE NEVER STICKS (owner, 2026-10-22: "my cursor got stuck … it won't let me get
 * out of the mode"). Every way a drag can end other than a clean pointerup must clear the
 * drag: the cursor hold on <html>, the frame's dragging state, and the listeners.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PanelResizeHandle } from "../FrameModules";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;
const calls: string[] = [];
const widths: number[] = [];

function Harness({ mounted = true }: { mounted?: boolean }) {
  return mounted ? (
    <PanelResizeHandle
      label="Resize sidebar"
      edge="right"
      width={244}
      min={200}
      max={400}
      snapBelow={120}
      onResize={(w) => widths.push(w)}
      onDragChange={(d) => calls.push(d ? "drag:on" : "drag:off")}
      onCommit={(w) => calls.push(`commit:${w}`)}
      onSnapClose={() => calls.push("snap")}
    />
  ) : null;
}

beforeAll(() => {
  // jsdom has no pointer capture or PointerEvent.
  Element.prototype.setPointerCapture ??= function () {};
  Element.prototype.releasePointerCapture ??= function () {};
  Element.prototype.hasPointerCapture ??= function () {
    return true;
  };
});

beforeEach(() => {
  calls.length = 0;
  widths.length = 0;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  delete document.documentElement.dataset.dragging;
});

function fire(target: EventTarget, type: string, init: Record<string, unknown> = {}) {
  const Ctor = type === "keydown" ? KeyboardEvent : MouseEvent;
  const e = new Ctor(type, { bubbles: true, cancelable: true, button: 0, clientX: 0, ...init });
  Object.defineProperty(e, "pointerId", { value: 1 });
  act(() => {
    target.dispatchEvent(e);
  });
}
const handle = () => host.querySelector<HTMLElement>('[role="separator"]')!;
const start = () => fire(handle(), "pointerdown", { clientX: 100 });

describe("a drag ends on every exit, not only pointerup", () => {
  it("baseline: pointerdown holds the cursor, pointerup releases it", () => {
    start();
    expect(document.documentElement.dataset.dragging).toBe("col-resize");
    fire(handle(), "pointermove", { clientX: 140 });
    expect(widths.at(-1)).toBe(284);
    fire(handle(), "pointerup", { clientX: 140 });
    expect(document.documentElement.dataset.dragging).toBeUndefined();
    expect(calls).toEqual(["drag:on", "drag:off", "commit:284"]);
  });

  it.each(["pointercancel", "lostpointercapture"])("%s clears the drag", (type) => {
    start();
    fire(handle(), type);
    expect(document.documentElement.dataset.dragging).toBeUndefined();
    expect(calls.at(-1)).toMatch(/^commit|drag:off/);
    // And a later move no longer resizes.
    const n = widths.length;
    fire(handle(), "pointermove", { clientX: 300 });
    expect(widths.length).toBe(n);
  });

  it("a window blur clears the drag", () => {
    start();
    fire(window, "blur");
    expect(document.documentElement.dataset.dragging).toBeUndefined();
    expect(calls).toContain("drag:off");
  });

  it("Escape cancels the drag and puts the width back", () => {
    start();
    fire(handle(), "pointermove", { clientX: 160 });
    fire(window, "keydown", { key: "Escape" });
    expect(document.documentElement.dataset.dragging).toBeUndefined();
    expect(widths.at(-1)).toBe(244);
    expect(calls.some((c) => c.startsWith("commit"))).toBe(false);
  });

  it("the handle leaving the page mid-drag clears the drag", () => {
    start();
    act(() => root.render(<Harness mounted={false} />));
    expect(document.documentElement.dataset.dragging).toBeUndefined();
    expect(calls).toContain("drag:off");
  });

  it("a second pointerdown with no pointerup in between never leaks the first hold", () => {
    start();
    start();
    fire(handle(), "pointerup");
    expect(document.documentElement.dataset.dragging).toBeUndefined();
  });
});
