/**
 * @jest-environment jsdom
 */
// A LIST DRAWN IN THE BROWSER CREATES NO SCRIPT (lane SPACES-REDRAW, 2026-10-17).
//
// The list shell's pre-paint scripts (a toolbar slot's remembered size, the table's no-room columns) only
// work in the server's HTML, where the browser runs them before React hydrates. The data home draws its
// list in the browser, and every visit logged React's "Encountered a script tag while rendering React
// component". The scripts are now drawn on the server and while hydrating only (components/ssr/PrepaintScript).

import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { ReservedSlot } from "../ReservedSlot";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slot = <ReservedSlot slotRef={() => undefined} style={undefined} surfaceKey="data-home" name="views" reserve className="slot" />;

function collectErrors() {
  const errors: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(" ")));
  return { errors, done: () => spy.mockRestore() };
}

it("a client-only render draws the slot and no script, with no React warning", async () => {
  const host = document.createElement("div");
  const log = collectErrors();
  const root = createRoot(host);
  await act(async () => root.render(slot));
  expect(host.querySelector(".slot")).not.toBeNull();
  expect(host.querySelector("script")).toBeNull();
  await act(async () => root.unmount());
  log.done();
  expect(log.errors.filter((e) => /script tag/i.test(e))).toEqual([]);
});

it("the server's HTML carries the script and hydrating it raises nothing", async () => {
  const html = renderToString(slot);
  expect(html).toContain("<script");
  const host = document.createElement("div");
  host.innerHTML = html;
  const log = collectErrors();
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(host, slot, { onRecoverableError: (e) => log.errors.push(`recoverable: ${String(e)}`) });
  });
  expect(host.querySelector(".slot")).not.toBeNull();
  await act(async () => root.unmount());
  log.done();
  expect(log.errors).toEqual([]);
});
