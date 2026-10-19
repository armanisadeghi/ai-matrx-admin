/**
 * @jest-environment jsdom
 */
// A PAGE OPENS AT ITS TOP, NOT AT A DATABASE BLOCK'S VIEW TAB (ADVERSARIAL-3 D4, 2026-10-19).
//
// THE USE CASE. A plumber installs Plumbing Company HQ; the page should open on its title and the morning callout.
// It opened at the Invoices block at the bottom: every database block's open view tab called scrollIntoView on
// mount, which scrolls EVERY scrollable ancestor — the page scroller (.spaces-scroll) included — so the last block
// to mount dragged the page down to itself (measured live: scrollTop 238–3032 on arrival, 11 of 11 pages).
// SUT: the real ViewTab, mounted active inside a page scroller and a horizontally scrolling tab strip.
// Replaced: only the browser's layout (jsdom has none): element boxes and a scrollIntoView that does what the
// browser does (moves the page scroller), so the old call shows up as a moved page.
// BREAKS THIS CATCHES: any mount-time scrollIntoView / page scroll from the tab (RED on the pre-fix ViewTab).

import { act } from "react";
import { createRoot } from "react-dom/client";

import { ViewTab } from "../menu-parts";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(el: React.ReactElement, into: HTMLElement) {
  const host = document.createElement("div");
  into.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(el));
  return { host, unmount: () => act(async () => root.unmount()) };
}

describe("a database block's open view tab never scrolls the page", () => {
  const original = Element.prototype.scrollIntoView;
  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  it("mounting the open tab leaves the page at its top and scrolls only the strip", async () => {
    const page = document.createElement("div");
    page.className = "spaces-scroll";
    const strip = document.createElement("div");
    strip.style.overflowX = "auto";
    page.appendChild(strip);
    document.body.appendChild(page);
    // The browser's scrollIntoView moves the page scroller to the element (here: 1600px down).
    Element.prototype.scrollIntoView = function () {
      page.scrollTop = 1600;
    };
    Object.defineProperty(strip, "scrollWidth", { value: 900 });
    Object.defineProperty(strip, "clientWidth", { value: 300 });
    strip.getBoundingClientRect = () => ({ left: 0, right: 300, top: 1600, bottom: 1632, width: 300, height: 32, x: 0, y: 1600, toJSON: () => ({}) });

    const view = { id: "v1", name: "Overdue invoices", layout: "table" } as unknown as Parameters<typeof ViewTab>[0]["view"];
    const m = await mount(<ViewTab view={view} icon={null} active editable={false} onSelect={() => {}} onRename={() => {}} onDuplicate={() => {}} />, strip);
    expect(m.host.querySelector('[role="tab"]')).toBeTruthy();
    expect(page.scrollTop).toBe(0);
    await m.unmount();
    page.remove();
  });

  it("an open tab past the strip's right edge is revealed by moving the strip only", async () => {
    const page = document.createElement("div");
    const strip = document.createElement("div");
    strip.style.overflowX = "auto";
    page.appendChild(strip);
    document.body.appendChild(page);
    Object.defineProperty(strip, "scrollWidth", { value: 900 });
    Object.defineProperty(strip, "clientWidth", { value: 300 });
    strip.getBoundingClientRect = () => ({ left: 0, right: 300, top: 0, bottom: 32, width: 300, height: 32, x: 0, y: 0, toJSON: () => ({}) });
    const tabBox = { left: 500, right: 620, top: 0, bottom: 32, width: 120, height: 32, x: 500, y: 0, toJSON: () => ({}) };
    const proto = HTMLButtonElement.prototype.getBoundingClientRect;
    HTMLButtonElement.prototype.getBoundingClientRect = () => tabBox;
    try {
      const view = { id: "v2", name: "All jobs", layout: "table" } as unknown as Parameters<typeof ViewTab>[0]["view"];
      const m = await mount(<ViewTab view={view} icon={null} active editable={false} onSelect={() => {}} onRename={() => {}} onDuplicate={() => {}} />, strip);
      expect(strip.scrollLeft).toBe(320);
      expect(page.scrollTop).toBe(0);
      await m.unmount();
    } finally {
      HTMLButtonElement.prototype.getBoundingClientRect = proto;
      page.remove();
    }
  });
});
