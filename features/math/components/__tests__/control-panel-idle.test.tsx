/**
 * @jest-environment jsdom
 *
 * Review 4 F18: before the walk starts only "Start Interactive" shows; Reset and Back come once it has.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ControlPanel from "../ControlPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const noop = () => {};

function draw(started: boolean): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<ControlPanel onReset={noop} onBack={noop} onNext={noop} started={started} embedded />));
  const text = host.textContent ?? "";
  act(() => root.unmount());
  host.remove();
  return text;
}

it("shows only Start Interactive before starting", () => {
  const text = draw(false);
  expect(text).toContain("Start Interactive");
  expect(text).not.toContain("Reset");
  expect(text).not.toContain("Back");
});

it("shows Reset, Back and Next once started", () => {
  const text = draw(true);
  for (const label of ["Reset", "Back", "Next"]) expect(text).toContain(label);
});
