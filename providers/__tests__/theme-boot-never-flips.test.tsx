/**
 * THE THEME BOOT CONTRACT (owner report: light -> dark -> light on load, and
 * two POST /api/set-theme per load on /chat/new).
 *
 * Before the sync boot restores the saved choice, the store holds the slice's
 * initial "system". StoreProvider used to repaint from the device color at
 * store creation and post that color, then the boot restored the saved
 * explicit mode and it repainted + posted again.
 *
 * The server cookie / SyncBootScript paint is the only paint until the
 * person's choice is known: for every device x saved-choice pair the class
 * never flips and no set-theme call is made (the cookie already matches).
 * A real device color change while the page is open still updates live.
 *
 * Mutation: restore the unconditional `applySystemTheme()` call at store
 * creation in providers/StoreProvider.tsx -> the (device != saved) cases go RED.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore, type Middleware } from "@reduxjs/toolkit";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/providers/AdminLaneSync", () => ({ AdminLaneSync: () => null }));
jest.mock("@/providers/AdminOrganizationSeat", () => ({ AdminOrganizationSeat: () => null }));
jest.mock("@/lib/sync/components/SyncBootstrap", () => ({ SyncBootstrap: () => null }));
jest.mock("@/lib/sync/identity", () => ({ attachStore: () => {} }));
jest.mock("@/lib/redux/store", () => ({ makeStore: () => null }));

import StoreProvider from "@/providers/StoreProvider";
import themeReducer, {
  markThemeChoiceKnown,
  resetThemeChoiceKnownForTests,
  themePolicy,
  type ThemeMode,
} from "@/styles/themes/themeSlice";
import { applyPrePaintDescriptors } from "@/lib/sync/engine/applyPrePaint";
import { REHYDRATE_ACTION_TYPE } from "@/lib/sync/engine/rehydrate";

const originalMatchMedia = window.matchMedia;
let listeners: Array<() => void> = [];
let deviceDark = false;

function installDevice(dark: boolean) {
  deviceDark = dark;
  listeners = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return query.includes("dark") ? deviceDark : false;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: () => {},
    }),
  });
}

// Mirrors the sync middleware: repaint the DOM after every theme action.
const prePaintAfterAction: Middleware = (api) => (next) => (action) => {
  const result = next(action);
  applyPrePaintDescriptors(themePolicy.prePaintDescriptors, api.getState().theme);
  return result;
};

function makeTestStore() {
  const store = configureStore({
    reducer: { theme: themeReducer },
    middleware: (gdm) => gdm().concat(prePaintAfterAction),
  });
  return Object.assign(store, { _sync: { boot: () => Promise.resolve() } });
}

const resolve = (mode: ThemeMode, dark: boolean) => (mode === "system" ? (dark ? "dark" : "light") : mode);

describe("theme boot never flips and never double-posts", () => {
  let root: Root | null = null;
  let container: HTMLDivElement;
  let posts: string[];
  let flips: number;
  let observer: MutationObserver;

  beforeEach(() => {
    posts = [];
    flips = 0;
    (globalThis as { fetch: unknown }).fetch = jest.fn(async (url: string, init: { body: string }) => {
      if (url === "/api/set-theme") posts.push(JSON.parse(init.body).theme);
      return { ok: true };
    });
  });

  afterEach(async () => {
    observer?.disconnect();
    await act(async () => root?.unmount());
    root = null;
    container?.remove();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: originalMatchMedia });
  });

  async function boot(device: "light" | "dark", saved: ThemeMode, opts: { cookie?: boolean } = {}) {
    resetThemeChoiceKnownForTests();
    installDevice(device === "dark");
    // What the server cookie + SyncBootScript already painted for this person.
    const painted = resolve(saved, deviceDark);
    if (opts.cookie !== false) document.cookie = `theme=${painted}`;
    document.documentElement.classList.toggle("dark", painted === "dark");
    document.documentElement.setAttribute("data-theme", saved === "system" ? painted : saved);
    let last = document.documentElement.classList.contains("dark");
    observer = new MutationObserver(() => {
      const now = document.documentElement.classList.contains("dark");
      if (now !== last) flips++;
      last = now;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const factory = jest.fn(makeTestStore);
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(
        <StoreProvider makeStore={factory as never}>
          <span />
        </StoreProvider>,
      );
    });
    // The sync boot restores the saved choice after load + idle.
    const store = factory.mock.results[0].value as ReturnType<typeof makeTestStore>;
    await act(async () => {
      store.dispatch({
        type: REHYDRATE_ACTION_TYPE,
        payload: { sliceName: "theme", state: { mode: saved } },
      } as never);
    });
    await act(async () => markThemeChoiceKnown());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    return painted;
  }

  const devices = ["light", "dark"] as const;
  const saveds: ThemeMode[] = ["light", "dark", "system"];
  it.each(devices.flatMap((d) => saveds.map((s) => [d, s] as const)))(
    "device %s, saved %s: no class flip, no set-theme call",
    async (device, saved) => {
      const painted = await boot(device, saved);
      expect(flips).toBe(0);
      expect(posts).toEqual([]);
      expect(document.documentElement.classList.contains("dark")).toBe(painted === "dark");
    },
  );

  // First visit: no cookie yet, SyncBootScript painted the device color, nobody changed anything.
  it.each(devices)("device %s, first visit (no cookie), system: no set-theme call", async (device) => {
    await boot(device, "system", { cookie: false });
    expect(flips).toBe(0);
    expect(posts).toEqual([]);
  });

  it("a real device color change while on the page (system) updates live, one post", async () => {
    await boot("light", "system");
    deviceDark = true;
    await act(async () => {
      listeners.forEach((cb) => cb());
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(posts).toEqual(["dark"]);
  });
});
