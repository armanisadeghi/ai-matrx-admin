/**
 * @jest-environment jsdom
 *
 * AT-SHARE: the fallback header is CSS-hidden while the page's own header is mounted, but it used to keep
 * mounting every control, so each sat in the DOM twice and read its data twice. `useYieldedFallback` is the
 * signal a fallback header uses to hold nothing once the page header has taken over.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { useYieldedFallback } from "../useYieldedFallback";

function Probe({ fallback }: { fallback: boolean }) {
  const yielded = useYieldedFallback(fallback);
  return <div id="probe">{yielded ? "yielded" : "draws"}</div>;
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLElement;
const text = () => document.getElementById("probe")!.textContent;
const mount = async (fallback: boolean) => {
  await act(async () => {
    root.render(<Probe fallback={fallback} />);
  });
};

describe("a fallback header yields to the page header", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="shell-header-center"></div><div id="host"></div>';
    host = document.getElementById("host")!;
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("draws while no page header is mounted, holds nothing once one is, and draws again when it leaves", async () => {
    await mount(true);
    expect(text()).toBe("draws");
    const center = document.getElementById("shell-header-center")!;
    const page = document.createElement("div");
    page.setAttribute("data-page-header-portal", "page");
    await act(async () => {
      center.appendChild(page);
      await Promise.resolve();
    });
    expect(text()).toBe("yielded");
    await act(async () => {
      center.removeChild(page);
      await Promise.resolve();
    });
    expect(text()).toBe("draws");
  });

  it("a page header (not a fallback) never yields", async () => {
    await mount(false);
    const center = document.getElementById("shell-header-center")!;
    const page = document.createElement("div");
    page.setAttribute("data-page-header-portal", "page");
    await act(async () => {
      center.appendChild(page);
      await Promise.resolve();
    });
    expect(text()).toBe("draws");
  });
});
