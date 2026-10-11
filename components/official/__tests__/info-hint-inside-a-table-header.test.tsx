import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { InfoHint } from "../InfoHint";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// 2026-10-11: an InfoHint inside a MatrxDataTable header never opened on a desktop. The
// header is itself a tooltip trigger ("Drag to reorder") and a drag handle, so hovering the
// icon opened the header's tooltip, which closed the hint's; a click opened nothing. The hint
// keeps the pointer and focus to itself and opens on click as well as hover.
describe("InfoHint inside a parent with its own tooltip or drag handle", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("the parent never sees the hint's pointer or focus, and a click opens the hint", () => {
    const parentMove = jest.fn();
    const parentDown = jest.fn();
    const parentFocus = jest.fn();
    act(() =>
      root.render(
        <div onPointerMove={parentMove} onPointerDown={parentDown} onFocus={parentFocus}>
          Column
          <InfoHint text="What this column means." label="About Column" />
        </div>,
      ),
    );
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="About Column"]');
    expect(trigger).not.toBeNull();

    act(() => {
      trigger!.dispatchEvent(new Event("pointermove", { bubbles: true }));
      trigger!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      trigger!.focus();
    });
    expect(parentMove).not.toHaveBeenCalled();
    expect(parentDown).not.toHaveBeenCalled();
    expect(parentFocus).not.toHaveBeenCalled();

    act(() => trigger!.click());
    expect(document.body.textContent).toContain("What this column means.");
  });
});
