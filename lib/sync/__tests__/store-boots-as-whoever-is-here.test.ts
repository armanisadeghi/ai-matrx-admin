/**
 * THE ENGINE BOOTS AS WHOEVER IS HERE (2026-10-14). The identity watch used to attach in boot's
 * `.then()`, so a sign-out or sign-in that landed before or during boot fired to nobody: the tab
 * booted as the server-seeded person after the browser had signed them out (their cached state
 * in a signed-out tab), or stayed guest all session. SUT: the real makeStore wiring and the real
 * identity reactor. Doubles: bootSync / resyncForIdentity (record what they were asked to load).
 */
import { jest } from "@jest/globals";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

type Ident = { key: string };
const bootCalls: Ident[] = [];
const resyncCalls: { from: string; to: string }[] = [];
let releaseBoot: () => void = () => {};

jest.mock("@/lib/sync/engine/boot", () => ({
  bootSync: (opts: { identity: Ident }) => {
    bootCalls.push(opts.identity);
    return new Promise((resolve) => {
      releaseBoot = () => resolve({ idbHydration: Promise.resolve() });
    });
  },
  resyncForIdentity: async (opts: { identity: Ident; previousIdentity: Ident }) => {
    resyncCalls.push({ from: opts.previousIdentity.key, to: opts.identity.key });
  },
}));

import { makeStore } from "@/lib/redux/store";
import { attachStore, __resetIdentityForTesting } from "@/lib/sync/identity";
import { clearUserAuth, setUserAuth } from "@/lib/redux/slices/userAuthSlice";

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  __resetIdentityForTesting();
  bootCalls.length = 0;
  resyncCalls.length = 0;
});

describe("the sync engine boots as whoever is here", () => {
  it("a sign-out before boot: boots signed out, never as the seeded person", async () => {
    const store = makeStore({ user: { id: A } } as never);
    expect(store._sync.getIdentity().key).toBe(`auth:${A}`);
    attachStore(store as never);
    store.dispatch(clearUserAuth());
    void store._sync.boot();
    expect(bootCalls[0].key.startsWith("auth:")).toBe(false);
    releaseBoot();
    await flush();
    expect(resyncCalls).toEqual([]);
  });

  it("a sign-in during boot: moves from what boot loaded to the person now here", async () => {
    const store = makeStore({} as never);
    attachStore(store as never);
    void store._sync.boot();
    const booted = bootCalls[0].key;
    expect(booted.startsWith("auth:")).toBe(false);
    store.dispatch(setUserAuth({ id: B }));
    releaseBoot();
    await flush();
    expect(resyncCalls).toEqual([{ from: booted, to: `auth:${B}` }]);
    expect(store._sync.getIdentity().key).toBe(`auth:${B}`);
  });

  it("a switch after boot leaves the old person for the new one", async () => {
    const store = makeStore({ user: { id: A } } as never);
    attachStore(store as never);
    void store._sync.boot();
    releaseBoot();
    await flush();
    store.dispatch(setUserAuth({ id: B }));
    await flush();
    expect(resyncCalls).toEqual([{ from: `auth:${A}`, to: `auth:${B}` }]);
  });
});
