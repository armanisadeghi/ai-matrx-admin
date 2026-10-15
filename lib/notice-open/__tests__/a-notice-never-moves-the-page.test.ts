/**
 * @jest-environment jsdom
 *
 * A NOTIFICATION NEVER MOVES THE PAGE (Arman, 2026-10-14: an Assist's link opened
 * in the tab he was working in). Every link clicked inside a notification surface
 * — an assist, the attention dock, the bell, a toast — opens a NEW TAB, whatever
 * rendered it; links elsewhere on the page are untouched.
 */
import { interceptNoticeLinkClick } from "../NoticeSurfaceGuard";
import { openFromNotice, reserveNoticeTab } from "../openFromNotice";

const opened: Array<[string | undefined, string | undefined]> = [];
beforeEach(() => {
  opened.length = 0;
  window.open = ((url?: string | URL, target?: string) => {
    opened.push([url?.toString(), target]);
    return null;
  }) as typeof window.open;
  document.body.innerHTML = "";
});

function click(anchor: HTMLElement, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  Object.defineProperty(event, "target", { value: anchor });
  interceptNoticeLinkClick(event);
  return event;
}

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector("[data-go]") as HTMLElement;
}

it("a same-tab link inside an assist opens a new tab instead", () => {
  const a = mount(`<div data-matrx-notice-surface><a data-go href="/marketing/x/seo/findings?f=1">Open</a></div>`);
  const event = click(a);
  expect(event.defaultPrevented).toBe(true);
  expect(opened).toEqual([[`${window.location.origin}/marketing/x/seo/findings?f=1`, "_blank"]]);
});

it("a click on an icon inside the link is caught too", () => {
  const icon = mount(`<div data-matrx-notice-surface><a href="/x"><svg data-go></svg></a></div>`);
  expect(click(icon).defaultPrevented).toBe(true);
  expect(opened).toHaveLength(1);
});

it("a link inside a toast opens a new tab", () => {
  const a = mount(`<section data-sonner-toaster><a data-go href="/board/1">Open</a></section>`);
  expect(click(a).defaultPrevented).toBe(true);
  expect(opened).toHaveLength(1);
});

it("a link already opening a new tab is left to the browser", () => {
  const a = mount(`<div data-matrx-notice-surface><a data-go target="_blank" href="/x">Open</a></div>`);
  expect(click(a).defaultPrevented).toBe(false);
  expect(opened).toHaveLength(0);
});

it("links on the page itself are untouched", () => {
  const a = mount(`<main><a data-go href="/x">Open</a></main>`);
  expect(click(a).defaultPrevented).toBe(false);
  expect(opened).toHaveLength(0);
});

it("a modified click stays the browser's own gesture", () => {
  const a = mount(`<div data-matrx-notice-surface><a data-go href="/x">Open</a></div>`);
  expect(click(a, { metaKey: true }).defaultPrevented).toBe(false);
});

it("the door never opens a script link", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  openFromNotice("javascript:alert(1)");
  expect(opened).toHaveLength(0);
  warn.mockRestore();
});

it("the door opens a route in a new tab", () => {
  openFromNotice("/approvals?item=a-1");
  expect(opened).toEqual([[`${window.location.origin}/approvals?item=a-1`, "_blank"]]);
});

it("a tab reserved in the press is sent to the saved record later, cut loose from this page", () => {
  const tab = { opener: window as unknown, closed: false, location: { href: "about:blank" }, close: jest.fn() };
  window.open = ((url?: string | URL, target?: string) => {
    opened.push([url?.toString(), target]);
    return tab as unknown as Window;
  }) as typeof window.open;
  const reserved = reserveNoticeTab();
  expect(opened).toEqual([["about:blank", "_blank"]]);
  reserved.go("/agents/a-1/build");
  expect(tab.location.href).toBe(`${window.location.origin}/agents/a-1/build`);
  expect(tab.opener).toBeNull();
  reserved.cancel();
  expect(tab.close).not.toHaveBeenCalled();
});

it("a reserved tab with nothing to open closes", () => {
  const tab = { opener: null, closed: false, location: { href: "about:blank" }, close: jest.fn() };
  window.open = (() => tab as unknown as Window) as typeof window.open;
  reserveNoticeTab().cancel();
  expect(tab.close).toHaveBeenCalledTimes(1);
});
