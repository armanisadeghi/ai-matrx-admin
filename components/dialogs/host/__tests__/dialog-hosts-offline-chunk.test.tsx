/**
 * @jest-environment jsdom
 */
// AT-FIX-I: a capture page that loses its signal must survive the dialog hosts' chunk failing to load.
// Offline, the first keypress opens the latch, `next/dynamic` throws a ChunkLoadError during render, and
// without a tolerant boundary that error reached the `(link)` error page and the answer was never queued.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DialogHosts } from "../DialogHosts";
import * as latch from "../dialogHostsLatch";

jest.mock("next/dynamic", () => () => {
  return function DialogHostsBodyThatCannotArrive(): never {
    const error = new Error("Failed to load chunk /_next/static/chunks/features_dialogs.js");
    error.name = "ChunkLoadError";
    throw error;
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class PageBoundary extends React.Component<{ children: React.ReactNode }, { hit: boolean }> {
  state = { hit: false };
  static getDerivedStateFromError() {
    return { hit: true };
  }
  render() {
    return this.state.hit ? <h1 data-testid="page-error">This is taking longer than it should</h1> : this.props.children;
  }
}

let root: Root;
let container: HTMLDivElement;

describe("DialogHosts when its chunk cannot load", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    latch._resetDialogHostsLatchForTests();
    jest.restoreAllMocks();
  });

  it("keeps the page and says so in the console instead of reaching the page error boundary", () => {
    act(() =>
      root.render(
        <PageBoundary>
          <p data-testid="sheet">the capture sheet</p>
          <DialogHosts />
        </PageBoundary>,
      ),
    );
    act(() => {
      window.dispatchEvent(new Event("keydown"));
    });
    expect(container.querySelector('[data-testid="page-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="sheet"]')).not.toBeNull();
    expect((console.warn as jest.Mock).mock.calls.some((c) => String(c[0]).includes("[chunk-tolerant]"))).toBe(true);
  });
});
