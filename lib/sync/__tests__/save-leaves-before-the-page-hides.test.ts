/**
 * GUARD — the server save leaves the page as early as it can.
 *
 *  1. The server leg starts BEFORE the device (IndexedDB) leg resolves. Until
 *     2026-10-14 the flush awaited the IndexedDB write (up to 1s) first, so on
 *     pagehide the server request started after an `await` during unload and
 *     was usually never sent.
 *  2. A page turning HIDDEN flushes (and records the unsaved marker) the same
 *     as pagehide: tab closes on mobile, and usually on desktop, fire hidden
 *     first and may never fire pagehide.
 *
 * The real scheduler; only `writeSlice` is wrapped so a test can hold the
 * device write open.
 */
import "fake-indexeddb/auto";

let holdDeviceWrite: Promise<void> | null = null;
jest.mock("../persistence/idb", () => {
  const actual = jest.requireActual("../persistence/idb") as typeof import("../persistence/idb");
  return {
    ...actual,
    writeSlice: async (...args: Parameters<typeof actual.writeSlice>) => {
      if (holdDeviceWrite) await holdDeviceWrite;
      return actual.writeSlice(...args);
    },
  };
});

import { configureStore } from "@reduxjs/toolkit";
import { createRemoteWriteScheduler } from "../engine/remoteWrite";
import { definePolicy } from "../policies/define";
import type { IdentityKey } from "../types";

const identity: IdentityKey = { type: "auth", userId: "u1", key: "auth:u1" };
const store = configureStore({ reducer: () => ({}) });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`not met within ${timeoutMs}ms`);
    await wait(5);
  }
}

function policyWith(write: (ctx: { body: unknown }) => Promise<void>, sliceName = "prefs") {
  return definePolicy<{ theme: string }>({
    sliceName,
    preset: "warm-cache",
    version: 1,
    broadcast: { actions: [`${sliceName}/setTheme`] },
    remote: { write, debounceMs: 60_000 },
  });
}

afterEach(() => {
  holdDeviceWrite = null;
  window.localStorage.clear();
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
});

describe("the server leg never waits on the device leg", () => {
  it("starts the server write while the IndexedDB write is still open", async () => {
    let releaseDevice: () => void = () => {};
    holdDeviceWrite = new Promise<void>((resolve) => {
      releaseDevice = resolve;
    });
    const sent: unknown[] = [];
    const scheduler = createRemoteWriteScheduler({
      policies: [policyWith(async (ctx) => void sent.push(ctx.body))],
      store,
      getIdentity: () => identity,
      attachPageHide: () => () => {},
    });
    try {
      scheduler.schedule("prefs", { theme: "dark" });
      const flushed = scheduler.flushSlice("prefs");
      // Synchronously, before any await: the request is already out.
      expect(sent).toEqual([{ theme: "dark" }]);
      releaseDevice();
      await flushed;
      expect(scheduler.hasPending("prefs")).toBe(false);
    } finally {
      releaseDevice();
      scheduler.dispose();
    }
  });
});

describe("a page turning hidden flushes", () => {
  function setVisibility(state: "hidden" | "visible") {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("visibilitychange → hidden sends the pending write now and records the marker; visible does not", async () => {
    const sent: unknown[] = [];
    let releaseWrite: () => void = () => {};
    const scheduler = createRemoteWriteScheduler({
      policies: [
        policyWith(async (ctx) => {
          sent.push(ctx.body);
          await new Promise<void>((resolve) => {
            releaseWrite = resolve;
          });
        }, "prefsHidden"),
      ],
      store,
      getIdentity: () => identity,
      // no attachPageHide: the production listeners
    });
    try {
      scheduler.schedule("prefsHidden", { theme: "dark" });
      setVisibility("visible");
      await wait(30);
      expect(sent).toEqual([]); // the 60s debounce still holds it

      setVisibility("hidden");
      await waitUntil(() => sent.length === 1);
      expect(sent).toEqual([{ theme: "dark" }]);
      const marker = JSON.parse(window.localStorage.getItem("matrx:unsaved:prefsHidden") ?? "null") as {
        identityKey: string;
        body: { body: unknown };
      } | null;
      expect(marker?.identityKey).toBe(identity.key);
      expect(marker?.body.body).toEqual({ theme: "dark" });

      // The save lands: the marker goes with it.
      releaseWrite();
      await waitUntil(() => window.localStorage.getItem("matrx:unsaved:prefsHidden") === null);
    } finally {
      releaseWrite();
      scheduler.dispose();
    }
  });
});
