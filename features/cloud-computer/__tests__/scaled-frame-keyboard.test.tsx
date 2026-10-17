/**
 * Typing into the machine must reach the machine (owner test, 2026-10-17:
 * Take control, type — nothing happened; the chat composer kept the keyboard).
 * Control on = the stream frame holds keyboard focus, in the SAME frame that
 * was showing the picture, and a field that grabs focus by itself gives it back.
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ScaledFrame } from "../ScaledFrame";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class NoopResizeObserver {
  observe() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = NoopResizeObserver;

let container: HTMLDivElement;
let root: Root;

function frameUi(interactive: boolean) {
  return (
    <ScaledFrame
      src="https://stream.aimatrx.com/cb-abc/"
      width={1280}
      height={720}
      title="Agent's screen"
      interactive={interactive}
    />
  );
}

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(frameUi(false));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

const iframe = () => container.querySelector("iframe") as HTMLIFrameElement;

it("watching: no input and no keyboard", () => {
  expect(iframe().style.pointerEvents).toBe("none");
  expect(document.activeElement).not.toBe(iframe());
  expect(iframe().getAttribute("allow")).toContain("keyboard-map");
});

it("control on: the same frame (no remount) takes input and the keyboard", async () => {
  const watching = iframe();
  await act(async () => root.render(frameUi(true)));
  expect(iframe()).toBe(watching);
  expect(iframe().style.pointerEvents).toBe("auto");
  expect(document.activeElement).toBe(iframe());
});

it("a field that focuses itself while in control hands the keyboard back", async () => {
  const composer = document.createElement("textarea");
  document.body.appendChild(composer);
  await act(async () => root.render(frameUi(true)));
  act(() => composer.focus());
  expect(document.activeElement).toBe(iframe());
});

it("a field the person presses on keeps the keyboard", async () => {
  const composer = document.createElement("textarea");
  document.body.appendChild(composer);
  await act(async () => root.render(frameUi(true)));
  act(() => {
    composer.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    composer.focus();
  });
  expect(document.activeElement).toBe(composer);
});

it("control off: nothing pulls focus back", async () => {
  const composer = document.createElement("textarea");
  document.body.appendChild(composer);
  await act(async () => root.render(frameUi(true)));
  await act(async () => root.render(frameUi(false)));
  act(() => composer.focus());
  expect(document.activeElement).toBe(composer);
});
