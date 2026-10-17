/**
 * THE STREAM PAGE CONTRACT (2026-10-17).
 * C — our own status over the frame: the page is told where to post
 *     (`?parent=`), only its own origin is believed, the cover stays until
 *     `connected`, and a silent page is revealed 8 s after load.
 * B — keys stopped while the mouse kept working: the Keyboard control and
 *     coming back to the page focus the frame and tell the stream page.
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ScaledFrame, SILENT_STREAM_REVEAL_MS, type ScaledFrameHandle } from "../ScaledFrame";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
};

const SRC = "https://stream.aimatrx.com/cb-abc/";
const ORIGIN = "https://stream.aimatrx.com";

let container: HTMLDivElement;
let root: Root;
const handle = React.createRef<ScaledFrameHandle>();

function ui(interactive: boolean) {
  return (
    <ScaledFrame
      src={SRC}
      width={1280}
      height={720}
      title="Agent's screen"
      interactive={interactive}
      controlRef={handle}
    />
  );
}

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(ui(false));
  });
});

afterEach(async () => {
  jest.useRealTimers();
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

const iframe = () => container.querySelector("iframe") as HTMLIFrameElement;
const cover = () => container.querySelector("[role='status']");

function streamSays(state: string, origin = ORIGIN) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin,
        source: iframe().contentWindow,
        data: { type: "matrx-stream", state },
      }),
    );
  });
}

describe("C: our own loading and status", () => {
  it("tells the stream page where to post", () => {
    const url = new URL(iframe().src);
    expect(url.searchParams.get("parent")).toBe(window.location.origin);
    expect(`${url.origin}${url.pathname}`).toBe(SRC);
  });

  it("covers the frame with our words until the stream says connected", () => {
    expect(cover()?.textContent).toBe("Connecting…");
    streamSays("reconnecting");
    expect(cover()?.textContent).toBe("Reconnecting…");
    streamSays("connected");
    expect(cover()).toBeNull();
    streamSays("disconnected");
    expect(cover()?.textContent).toBe("Disconnected");
  });

  it("ignores any other origin", () => {
    streamSays("connected", "https://evil.example");
    expect(cover()?.textContent).toBe("Connecting…");
  });

  it("a silent stream page is revealed 8 s after load", () => {
    jest.useFakeTimers();
    act(() => {
      iframe().dispatchEvent(new Event("load"));
    });
    act(() => jest.advanceTimersByTime(SILENT_STREAM_REVEAL_MS - 100));
    expect(cover()).not.toBeNull();
    act(() => jest.advanceTimersByTime(200));
    expect(cover()).toBeNull();
  });
});

describe("B: the keyboard comes back", () => {
  it("the Keyboard control focuses the frame and resets its keyboard", async () => {
    await act(async () => root.render(ui(true)));
    const posted = jest.spyOn(iframe().contentWindow as Window, "postMessage");
    (document.body as HTMLElement).focus();
    act(() => handle.current?.reconnectKeyboard());
    expect(document.activeElement).toBe(iframe());
    expect(posted).toHaveBeenCalledWith({ type: "matrx-stream-cmd", cmd: "keyboard-reset" }, ORIGIN);
  });

  it("coming back to the page hands the keyboard to the machine", async () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    await act(async () => root.render(ui(true)));
    const posted = jest.spyOn(iframe().contentWindow as Window, "postMessage");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(document.activeElement).toBe(iframe());
    expect(posted).toHaveBeenCalledWith({ type: "matrx-stream-cmd", cmd: "focus" }, ORIGIN);
  });

  it("a button that takes focus by itself while in control gives it back", async () => {
    const toast = document.createElement("button");
    document.body.appendChild(toast);
    await act(async () => root.render(ui(true)));
    act(() => toast.focus());
    expect(document.activeElement).toBe(iframe());
  });

  it("a dialog's own focus is left alone", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const ok = document.createElement("button");
    dialog.appendChild(ok);
    document.body.appendChild(dialog);
    await act(async () => root.render(ui(true)));
    act(() => ok.focus());
    expect(document.activeElement).toBe(ok);
  });
});
