/**
 * THE WHOLE OVERFLOW ROW IS THE TAP TARGET (2026-10-10): on a phone, tapping
 * the printed name of "New table" did nothing; only the small icon opened it.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { OverflowMenuItem } from "./route-header-layout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("a tap on the row's label presses the control once; a tap on the control is not doubled", () => {
  const onPress = jest.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <OverflowMenuItem
        action={{ key: "k", node: <button aria-label="New table" onClick={onPress} /> } as never}
      />,
    );
  });
  const label = host.querySelector("span") as HTMLElement;
  expect(label.textContent).toBe("New table");
  act(() => label.click());
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => (host.querySelector("button") as HTMLElement).click());
  expect(onPress).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});
