/**
 * identity.test.ts — Phase 4 PR 4.C
 *
 * Covers the reactive identity source that replaces `lib/globalState.ts`
 * (deleted) and `app/Providers.tsx::setGlobalUserId` (deleted).
 *
 * Critical invariants:
 *   - `attachStore` subscribes to the store; identity changes propagate
 *     to `onIdentityChange` listeners.
 *   - `getIdentityContext()` always returns the current state, no stale
 *     mutable cache.
 *   - Pre-attach calls return safe sentinels (no crash).
 *   - `clearUserAuth` clears accessToken — `getIdentityContext()` reflects.
 */

import { configureStore } from "@reduxjs/toolkit";
import {
  attachStore,
  getIdentity,
  getIdentityContext,
  onIdentityChange,
  __resetIdentityForTesting,
} from "../identity";
import userAuthReducer, {
  setUserAuth,
  setAccessToken,
  clearUserAuth,
} from "@/lib/redux/slices/userAuthSlice";
import userProfileReducer, {
  setFingerprintId,
} from "@/lib/redux/slices/userProfileSlice";

function makeStore() {
  return configureStore({
    reducer: {
      userAuth: userAuthReducer,
      userProfile: userProfileReducer,
    },
  });
}

describe("identity reactor", () => {
  beforeEach(() => {
    __resetIdentityForTesting();
  });

  afterEach(() => {
    __resetIdentityForTesting();
  });

  it("getIdentity returns a guest sentinel before attachStore", () => {
    const id = getIdentity();
    expect(id.type).toBe("guest");
  });

  it("getIdentityContext returns nulls before attachStore", () => {
    const ctx = getIdentityContext();
    expect(ctx).toEqual({
      userId: null,
      accessToken: null,
      isAdmin: false,
    });
  });

  it("getIdentityContext reads from the store after attachStore", () => {
    const store = makeStore();
    store.dispatch(
      setUserAuth({ id: "u1", isAdmin: true, accessToken: "tok" }),
    );
    attachStore(store);
    expect(getIdentityContext()).toEqual({
      userId: "u1",
      accessToken: "tok",
      isAdmin: true,
    });
  });

  it("getIdentity reflects auth user post-attach", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1" }));
    attachStore(store);
    const id = getIdentity();
    expect(id.type).toBe("auth");
    if (id.type === "auth") expect(id.userId).toBe("u1");
  });

  it("getIdentity falls back to guest with fingerprint when no user id", () => {
    const store = makeStore();
    store.dispatch(setFingerprintId("fp-abc"));
    attachStore(store);
    const id = getIdentity();
    expect(id.type).toBe("guest");
    if (id.type === "guest") expect(id.fingerprintId).toBe("fp-abc");
  });

  it("onIdentityChange fires when userId flips guest → auth", () => {
    const store = makeStore();
    store.dispatch(setFingerprintId("fp-1"));
    attachStore(store);

    const calls: string[] = [];
    onIdentityChange((next) => calls.push(next.key));

    store.dispatch(setUserAuth({ id: "u1" }));
    expect(calls).toEqual(["auth:u1"]);
  });

  it("onIdentityChange does NOT fire on no-op state changes", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1" }));
    attachStore(store);

    const calls: string[] = [];
    onIdentityChange((next) => calls.push(next.key));

    // Same identity → no fire
    store.dispatch(setAccessToken("new-token"));
    expect(calls).toEqual([]);

    // Different field but same identity (isAdmin toggle) → no fire
    store.dispatch(setUserAuth({ isAdmin: true }));
    expect(calls).toEqual([]);
  });

  it("onIdentityChange fires on sign-out (auth → guest)", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1" }));
    store.dispatch(setFingerprintId("fp-after-signout"));
    attachStore(store);

    const calls: string[] = [];
    onIdentityChange((next) => calls.push(next.key));

    store.dispatch(clearUserAuth());
    expect(calls).toEqual(["guest:fp-after-signout"]);
  });

  it("onIdentityChange unsubscribe stops further notifications", () => {
    const store = makeStore();
    attachStore(store);

    const calls: string[] = [];
    const unsubscribe = onIdentityChange((next) => calls.push(next.key));

    store.dispatch(setUserAuth({ id: "u1" }));
    expect(calls).toHaveLength(1);

    unsubscribe();
    store.dispatch(clearUserAuth());
    expect(calls).toHaveLength(1); // unchanged
  });

  it("clearUserAuth nulls the accessToken in getIdentityContext (security invariant)", () => {
    const store = makeStore();
    store.dispatch(
      setUserAuth({ id: "u1", isAdmin: true, accessToken: "secret" }),
    );
    attachStore(store);
    expect(getIdentityContext().accessToken).toBe("secret");

    store.dispatch(clearUserAuth());
    expect(getIdentityContext().accessToken).toBeNull();
    expect(getIdentityContext().userId).toBeNull();
    expect(getIdentityContext().isAdmin).toBe(false);
  });
});
