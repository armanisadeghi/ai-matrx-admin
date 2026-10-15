/**
 * GUARD — an edit is never lost because the tab closed before its save landed.
 *
 * Until 2026-10-14 a `remote.write` edit (userPreferences) made inside the
 * 250ms debounce, during an offline retry, or during the flush itself was
 * silently reverted when the tab closed: nothing durable said it was unsaved,
 * so the next page's boot fetch painted the server's OLDER record over the
 * cache (`isRemoteWritePending` is false in a fresh tab) and the edit was gone.
 *
 * Now the page records `matrx:unsaved:<slice>` when it turns hidden/closes,
 * and the next page booting as the same person shows the edit, re-sends it on
 * its old base, and lets no load land over it until it is saved.
 *
 * Real engine end to end — the real userPreferences policy, middleware,
 * scheduler and boot, each "page" a fresh module graph (its own scheduler
 * registry and shared-read cache, exactly like a new tab). Only the Supabase
 * client is an in-memory row with the `version` compare-and-swap; IndexedDB
 * (fake-indexeddb) and localStorage are the shared device.
 */
import "fake-indexeddb/auto";
import { configureStore } from "@reduxjs/toolkit";
import type { SyncChannel } from "../channel";
import type { IdentityKey } from "../types";
import { clearAll, writeSlice } from "../persistence/idb";

type Row = { user_id: string; version: number; preferences: Record<string, unknown> };
const USER = "u-unsaved";
let row: Row;
/** open = writes land; hang = the request never answers (the tab died); gate = held until released. */
let writeMode: "open" | "hang" | "gate" = "open";
let releaseGate: () => void = () => {};
let gate: Promise<void> = Promise.resolve();
let updateAttempts = 0;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function mockTable() {
  const filters: Record<string, unknown> = {};
  let patch: Partial<Row> | null = null;
  const run = () => {
    const matches =
      filters.user_id === row.user_id &&
      (filters.version === undefined || filters.version === row.version);
    if (patch) {
      if (!matches) return { data: null, error: null };
      row = { ...row, ...clone(patch), version: row.version + 1 } as Row;
    }
    return { data: matches ? clone(row) : null, error: null };
  };
  const q = {
    select: () => q,
    update: (values: Partial<Row>) => {
      patch = values;
      return q;
    },
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return q;
    },
    abortSignal: () => q,
    maybeSingle: async () => {
      if (patch) {
        updateAttempts += 1;
        if (writeMode === "hang") return new Promise<never>(() => {});
        if (writeMode === "gate") await gate;
      }
      return run();
    },
  };
  return q;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ from: () => mockTable() }) },
}));

type SliceModule = typeof import("@/lib/redux/preferences/userPreferencesSlice");
type MiddlewareModule = typeof import("../engine/middleware");
type BootModule = typeof import("../engine/boot");
type FetchModule = typeof import("../engine/remoteFetch");

interface Page {
  slice: SliceModule;
  boot: BootModule;
  fetch: FetchModule;
  store: ReturnType<typeof makeStore>;
}

const person: IdentityKey = { type: "auth", userId: USER, key: `auth:${USER}` };
const someoneElse: IdentityKey = { type: "auth", userId: "u-other", key: "auth:u-other" };
const MARKER = "matrx:unsaved:userPreferences";
const RECORD = { display: { darkMode: false, theme: "default" } };

const channel: SyncChannel = {
  available: true,
  post: () => {},
  subscribe: () => () => {},
  setIdentity: () => {},
  close: () => {},
};

function makeStore(slice: SliceModule, middleware: MiddlewareModule, who: IdentityKey) {
  return configureStore({
    reducer: { userPreferences: slice.default },
    middleware: (gDM) =>
      gDM({ serializableCheck: false, immutableCheck: false }).concat(
        middleware.createSyncMiddleware({
          policies: [slice.userPreferencesPolicy],
          channel,
          getIdentity: () => who,
        }),
      ),
  });
}

/** A new tab: a fresh module graph over the same device storage. */
function openPage(who: IdentityKey): Page {
  let page!: Page;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const slice = require("@/lib/redux/preferences/userPreferencesSlice") as SliceModule;
    const middleware = require("../engine/middleware") as MiddlewareModule;
    const boot = require("../engine/boot") as BootModule;
    const fetch = require("../engine/remoteFetch") as FetchModule;
    /* eslint-enable @typescript-eslint/no-require-imports */
    page = { slice, boot, fetch, store: makeStore(slice, middleware, who) };
  });
  return page;
}

async function bootPage(page: Page, who: IdentityKey) {
  const result = await page.boot.bootSync({
    store: page.store,
    identity: who,
    policies: [page.slice.userPreferencesPolicy],
    openChannel: () => channel,
    getIdentity: () => who,
  });
  await result.idbHydration;
  return result;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`not met within ${timeoutMs}ms`);
    await wait(10);
  }
}
const darkMode = (page: Page) => page.store.getState().userPreferences.display.darkMode;
const serverPrefs = () => row.preferences as { display: { darkMode: boolean; theme: string } };

beforeEach(async () => {
  window.localStorage.clear();
  await clearAll();
  writeMode = "open";
  updateAttempts = 0;
  row = { user_id: USER, version: 1, preferences: clone(RECORD) };
  gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
});

describe("an edit made just before the tab closes is never lost", () => {
  it("pagehide inside the debounce → marker; the next page shows it, re-sends it on its base, and no load reverts it", async () => {
    // --- Page A: loads, the person flips dark mode, the tab closes at once ---
    const a = openPage(person);
    await a.fetch.invokeRemoteFetch({
      policy: a.slice.userPreferencesPolicy,
      store: a.store,
      getIdentity: () => person,
      reason: "cold-boot",
    });
    expect(darkMode(a)).toBe(false);

    writeMode = "hang"; // the tab dies: whatever request it starts never lands
    a.store.dispatch(a.slice.setPreference({ module: "display", preference: "darkMode", value: true }));
    window.dispatchEvent(new Event("pagehide")); // inside the 250ms debounce

    const marker = JSON.parse(window.localStorage.getItem(MARKER) ?? "null") as {
      version: number;
      identityKey: string;
      body: { body: { display: { darkMode: boolean } }; base: { display: { darkMode: boolean } } };
    } | null;
    expect(marker).not.toBeNull();
    expect(marker?.identityKey).toBe(person.key);
    expect(marker?.version).toBe(a.slice.userPreferencesPolicy.config.version);
    expect(marker?.body.body.display.darkMode).toBe(true);
    expect(marker?.body.base.display.darkMode).toBe(false);

    // The device copy never got the edit either (the close beat the IndexedDB
    // write): the cache holds the older record, as the server does.
    await wait(50);
    await writeSlice(person.key, "userPreferences", 1, clone(RECORD));
    window.localStorage.setItem(
      "matrx:idbFallback:userPreferences",
      JSON.stringify({ version: 1, identityKey: person.key, body: clone(RECORD) }),
    );
    // Meanwhile another device changed a DIFFERENT preference.
    row = { ...row, version: row.version + 1, preferences: { display: { darkMode: false, theme: "ocean" } } };
    expect(serverPrefs().display.darkMode).toBe(false);

    // --- Page B: the person opens the app again ---
    writeMode = "gate";
    const b = openPage(person);
    const booted = await bootPage(b, person);
    try {
      // (a) the slice shows the unsaved edit
      expect(darkMode(b)).toBe(true);

      // (c) neither the boot revalidate nor a cold-boot load lands the older record over it
      await wait(50);
      expect(darkMode(b)).toBe(true);
      await b.fetch.invokeRemoteFetch({
        policy: b.slice.userPreferencesPolicy,
        store: b.store,
        getIdentity: () => person,
        reason: "cold-boot",
      });
      expect(darkMode(b)).toBe(true);

      // (b) the write is queued again and sent
      await waitUntil(() => updateAttempts > 1);
      expect(window.localStorage.getItem(MARKER)).not.toBeNull(); // not saved yet
      releaseGate();
      await waitUntil(() => serverPrefs().display.darkMode === true);
      // Sent on the marker's base: only what changed went out, so the other
      // device's change is still there.
      expect(serverPrefs().display.theme).toBe("ocean");

      // (d) saved → the marker is gone, and a normal refresh agrees
      await waitUntil(() => window.localStorage.getItem(MARKER) === null);
      await b.fetch.invokeRemoteFetch({
        policy: b.slice.userPreferencesPolicy,
        store: b.store,
        getIdentity: () => person,
        reason: "stale-refresh",
      });
      expect(darkMode(b)).toBe(true);
      expect(b.store.getState().userPreferences.display.theme).toBe("ocean");
    } finally {
      booted.stale.cancelAll();
    }
  }, 20_000);
});

describe("an unsaved marker belongs to one person", () => {
  function seedMarkerFor(who: IdentityKey) {
    window.localStorage.setItem(
      MARKER,
      JSON.stringify({
        version: 1,
        identityKey: who.key,
        body: { body: { display: { darkMode: true, theme: "default" } }, base: clone(RECORD) },
      }),
    );
  }

  it("another person's marker is removed, never applied or sent", async () => {
    seedMarkerFor(someoneElse);
    await writeSlice(person.key, "userPreferences", 1, clone(RECORD));

    const page = openPage(person);
    const booted = await bootPage(page, person);
    try {
      expect(window.localStorage.getItem(MARKER)).toBeNull();
      expect(darkMode(page)).toBe(false);
      await wait(400); // past the debounce: nothing was queued
      expect(updateAttempts).toBe(0);
      expect(serverPrefs().display.darkMode).toBe(false);
    } finally {
      booted.stale.cancelAll();
    }
  }, 10_000);

  it("a guest first render leaves the signed-in person's marker for their own boot", async () => {
    seedMarkerFor(person);
    const guest: IdentityKey = { type: "guest", fingerprintId: "g-1", key: "guest:g-1" };
    const page = openPage(guest);
    const booted = await bootPage(page, guest);
    try {
      expect(window.localStorage.getItem(MARKER)).not.toBeNull();
      expect(darkMode(page)).toBe(false);
    } finally {
      booted.stale.cancelAll();
    }
  }, 10_000);
});
