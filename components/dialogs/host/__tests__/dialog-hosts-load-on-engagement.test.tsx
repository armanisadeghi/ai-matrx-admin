/**
 * @jest-environment jsdom
 */
// THE SHELL SHIPS NOTHING UNTIL ENGAGED: <DialogHosts /> renders no host body at first paint,
// opens on the first pointer/key engagement (or an opener's ensureDialogHosts()), and an
// awaiting opener resolves only once the body has mounted.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DialogHosts } from "../DialogHosts";
import * as latch from "../dialogHostsLatch";

jest.mock("next/dynamic", () => () => {
  // Stand-in for the one lazy body: mounts and marks the hosts registered, like DialogHostsImpl.
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  const { markDialogHostsMounted } = jest.requireActual<typeof import("../dialogHostsLatch")>("../dialogHostsLatch");
  return function DialogHostsBody() {
    useEffect(() => {
      markDialogHostsMounted(true);
      return () => markDialogHostsMounted(false);
    }, []);
    return <div data-testid="dialog-hosts-body" />;
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
function render(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
}
const body = () => container.querySelector('[data-testid="dialog-hosts-body"]');

describe("DialogHosts", () => {
  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    latch._resetDialogHostsLatchForTests();
  });

  it("renders nothing until the first engagement, then mounts the body once", async () => {
    render(<DialogHosts />);
    expect(body()).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    expect(body()).not.toBeNull();
  });

  it("an opener's ensureDialogHosts() opens the latch and resolves after the body mounts", async () => {
    render(<DialogHosts />);
    expect(latch.isDialogHostsRequested()).toBe(false);

    let resolved = false;
    await act(async () => {
      const wait = latch.ensureDialogHosts(5_000).then(() => {
        resolved = true;
      });
      await wait;
    });
    expect(resolved).toBe(true);
    expect(body()).not.toBeNull();
  });
});
