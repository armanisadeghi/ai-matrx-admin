/**
 * THE IDENTITY RESET IS NEVER SAVED. Clearing the leaving person's slices to defaults must not
 * be written — stamped with the incoming identity — over the incoming person's own record.
 * SUT: the real sync middleware, the real reset wrapper, the real localStorage adapter.
 */
import { combineReducers, configureStore, createSlice } from "@reduxjs/toolkit";
import { definePolicy } from "../policies/define";
import { createSyncMiddleware } from "../engine/middleware";
import { applyIdentityReset, buildIdentityResetAction } from "../engine/identityReset";
import type { SyncChannel } from "../channel";
import type { IdentityKey } from "../types";

const A: IdentityKey = { type: "auth", userId: "a", key: "auth:a" };
const B: IdentityKey = { type: "auth", userId: "b", key: "auth:b" };

const channel = {
  available: false,
  post: () => {},
  subscribe: () => () => {},
  setIdentity: () => {},
  close: () => {},
} as SyncChannel;

it("the reset to defaults never overwrites the incoming person's record", () => {
  const policy = definePolicy({ sliceName: "prefs", preset: "boot-critical", version: 1, broadcast: { actions: ["prefs/set"] } });
  const slice = createSlice({
    name: "prefs",
    initialState: { v: 0 },
    reducers: { set: (s, a: { payload: number }) => void (s.v = a.payload) },
  });
  let who = A;
  const inner = combineReducers({ prefs: slice.reducer });
  const store = configureStore({
    reducer: (state: ReturnType<typeof inner> | undefined, action) => inner(applyIdentityReset(state, action), action),
    middleware: (gDM) => gDM().concat(createSyncMiddleware({ policies: [policy], channel, getIdentity: () => who })),
  });

  store.dispatch(slice.actions.set(1)); // A's own edit, saved as A
  // B's record is already on the device (B signed in here before).
  window.localStorage.setItem(policy.storageKey, JSON.stringify({ version: 1, identityKey: B.key, body: { v: 5 } }));

  who = B; // the swap happened; the reset follows
  store.dispatch(buildIdentityResetAction(["prefs"], A, B));
  expect(store.getState().prefs.v).toBe(0);
  const saved = JSON.parse(window.localStorage.getItem(policy.storageKey) ?? "null");
  expect(saved).toMatchObject({ identityKey: B.key, body: { v: 5 } });
});
