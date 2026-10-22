/**
 * A FOOTER BUTTON THAT DOES NOTHING IS BANNED (adversarial review, 2026-10-22): History and Help
 * were drawn on every page while the live host passed no handler, so a press did nothing. The
 * footer draws each only when its host gives it somewhere to go.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SheetFooter } from "../SheetFooter";
import type { SheetFooterProps } from "../SheetFooter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(props: SheetFooterProps) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<SheetFooter {...props} />));
  return { el, unmount: () => act(() => root.unmount()) };
}

describe("SheetFooter", () => {
  it("draws no History or Help when the host gives them nothing to open", () => {
    const { el, unmount } = mount({});
    expect(el.querySelector('[aria-label="History"]')).toBeNull();
    expect(el.querySelector('[aria-label="Help"]')).toBeNull();
    unmount();
  });

  it("draws each one that has a handler, and a press runs it", () => {
    const onHistory = jest.fn();
    const onHelp = jest.fn();
    const { el, unmount } = mount({ onHistory, onHelp });
    act(() => (el.querySelector('[aria-label="History"]') as HTMLButtonElement).click());
    act(() => (el.querySelector('[aria-label="Help"]') as HTMLButtonElement).click());
    expect(onHistory).toHaveBeenCalledTimes(1);
    expect(onHelp).toHaveBeenCalledTimes(1);
    unmount();
  });
});
