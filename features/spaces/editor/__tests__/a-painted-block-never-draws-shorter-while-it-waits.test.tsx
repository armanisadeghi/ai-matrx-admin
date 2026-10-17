/**
 * @jest-environment jsdom
 */
// A PAINTED DATABASE BLOCK NEVER DRAWS SHORTER WHILE IT WAITS (lane SPACES-CLS, 2026-10-17).
//
// Hydration of a streamed page drew each database block again from its loading box (the rows the server
// painted were replaced by a 120px box, then by nothing, then by the rows) — the page under them fell
// and rose again, CLS 0.15 at 1600 and up to 1.19 at 375 on a fresh install. The host now holds the
// height its real content last painted as a minimum while it shows only the loading box, and drops it
// the frame the content is back. Fails on the old host (no minimum); passes on this one.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { DatabaseHost } from "../database-host";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let mount: HTMLDivElement | null = null;
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeAll(() => {
  // jsdom has no layout: a host is as tall as the content it holds says it is.
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const h = Number(this.querySelector<HTMLElement>("[data-h]")?.dataset.h ?? 0);
    return { x: 0, y: 0, top: 0, left: 0, right: 100, bottom: h, width: 100, height: h, toJSON: () => ({}) } as DOMRect;
  };
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});
afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect;
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  mount?.remove();
  mount = null;
});

const render = (child: React.ReactNode) => {
  if (!mount) {
    mount = document.createElement("div");
    document.body.appendChild(mount);
    root = createRoot(mount);
  }
  act(() => root!.render(<DatabaseHost blockId="b1">{child}</DatabaseHost>));
  return mount.querySelector<HTMLElement>(".spaces-db-host")!;
};

describe("a painted database block", () => {
  it("holds its painted height while it shows only the loading box, and lets go when the rows are back", async () => {
    let host = render(<div key="f1" className="spaces-db-frame" data-h="326" />);
    await act(async () => {});
    expect(host.style.minHeight).toBe("");
    host = render(<div key="l" className="spaces-db-loading" data-h="120" />);
    await act(async () => {});
    expect(host.style.minHeight).toBe("326px");
    host = render(<div key="f2" className="spaces-db-frame" data-h="297" />);
    await act(async () => {});
    expect(host.style.minHeight).toBe("");
  });

  it("holds the height of the copy already in the document when the block is drawn again from loading", async () => {
    const old = document.createElement("div");
    old.className = "spaces-db-host";
    old.dataset.blockId = "b1";
    old.innerHTML = '<div class="spaces-db-frame" data-h="472"></div>';
    document.body.appendChild(old);
    const host = render(<div className="spaces-db-loading" data-h="120" />);
    old.remove();
    await act(async () => {});
    expect(host.style.minHeight).toBe("472px");
  });
});
