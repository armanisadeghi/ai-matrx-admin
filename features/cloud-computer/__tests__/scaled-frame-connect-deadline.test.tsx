/**
 * A STREAM THAT NEVER CONNECTS NEVER SITS ON "Connecting…" FOR EVER (2026-10-17).
 *
 * Reopening the Computer more than two minutes after closing it left the
 * machine with expired relay credentials, and the screen waited on
 * "Connecting…" with no end and no way out. The frame now has a deadline (the
 * `cloud_computer.connect_retry_seconds` knob, passed in by ComputerView): when
 * the picture has not arrived in time it calls back once per wait, and
 * ComputerView opens a fresh stream, then says it did not connect.
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ScaledFrame } from "../ScaledFrame";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
};

const SRC = "https://stream.aimatrx.com/cb-abc/";
const ORIGIN = "https://stream.aimatrx.com";
const DEADLINE = 20_000;

let container: HTMLDivElement;
let root: Root;
let timeouts = 0;
let connects = 0;

function ui(connectWithinMs?: number) {
  return (
    <ScaledFrame
      src={SRC}
      width={1280}
      height={720}
      title="Agent's screen"
      interactive={false}
      connectWithinMs={connectWithinMs}
      onConnectTimeout={() => (timeouts += 1)}
      onConnected={() => (connects += 1)}
    />
  );
}

async function mount(connectWithinMs?: number) {
  await act(async () => {
    root = createRoot(container);
    root.render(ui(connectWithinMs));
  });
}

function streamSays(state: string) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ORIGIN,
        source: (container.querySelector("iframe") as HTMLIFrameElement).contentWindow,
        data: { type: "matrx-stream", state },
      }),
    );
  });
}

const wait = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  timeouts = 0;
  connects = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  jest.useRealTimers();
  container.remove();
});

it("calls back once when the picture never arrives within the deadline", async () => {
  await mount(DEADLINE);
  wait(DEADLINE - 1);
  expect(timeouts).toBe(0);
  wait(1);
  expect(timeouts).toBe(1);
  wait(DEADLINE * 3);
  expect(timeouts).toBe(1);
});

it("a picture in time cancels the deadline and is reported", async () => {
  await mount(DEADLINE);
  wait(DEADLINE / 2);
  streamSays("connected");
  wait(DEADLINE * 2);
  expect(timeouts).toBe(0);
  expect(connects).toBe(1);
});

it("a lost picture gets a new deadline", async () => {
  await mount(DEADLINE);
  streamSays("connected");
  streamSays("reconnecting");
  wait(DEADLINE);
  expect(timeouts).toBe(1);
});

it("no deadline until the knob has answered", async () => {
  await mount(undefined);
  wait(DEADLINE * 10);
  expect(timeouts).toBe(0);
});
