/**
 * A sign-out or account switch leaves nothing of the leaving person on the device, and the
 * reset that clears their slices is never saved over the incoming person's record.
 * SUT: the real resyncForIdentity, the real localStorage adapter. Double: the IndexedDB purge.
 */
import { jest } from "@jest/globals";

const cleared: string[] = [];
jest.mock("@/lib/sync/persistence/idb", () => ({
  clearIdentity: async (key: string) => {
    cleared.push(key);
    return 1;
  },
  readSlices: async () => new Map(),
}));

import { configureStore } from "@reduxjs/toolkit";
import { resyncForIdentity } from "@/lib/sync/engine/boot";
import type { IdentityKey } from "@/lib/sync/types";

const A: IdentityKey = { type: "auth", userId: "a", key: "auth:a" } as IdentityKey;
const B: IdentityKey = { type: "auth", userId: "b", key: "auth:b" } as IdentityKey;

function policy(sliceName: string, identityScoped?: boolean) {
  return {
    storageKey: `matrx:${sliceName}`,
    config: { sliceName, preset: "boot-critical", version: 1, ...(identityScoped === false ? { identityScoped } : {}) },
  } as never;
}

it("removes A's records and mirrors, keeps device-wide ones and B's", async () => {
  const rec = (identityKey: string) => JSON.stringify({ version: 1, identityKey, body: {} });
  localStorage.setItem("matrx:prefs", rec(A.key));
  localStorage.setItem("matrx:idbFallback:prefs", rec(A.key));
  localStorage.setItem("matrx:other", rec(B.key));
  localStorage.setItem("matrx:theme", rec(A.key));
  const store = configureStore({ reducer: (s: Record<string, unknown> = {}) => s });

  await resyncForIdentity({
    store,
    identity: B,
    previousIdentity: A,
    policies: [policy("prefs"), policy("other"), policy("theme", false)],
    getIdentity: () => B,
  });

  expect(localStorage.getItem("matrx:prefs")).toBeNull();
  expect(localStorage.getItem("matrx:idbFallback:prefs")).toBeNull();
  expect(localStorage.getItem("matrx:other")).not.toBeNull();
  expect(localStorage.getItem("matrx:theme")).not.toBeNull();
  expect(cleared).toEqual([A.key]);
});
