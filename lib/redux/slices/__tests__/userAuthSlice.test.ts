/**
 * userAuthSlice.test.ts — Phase 4 PR 4.B
 *
 * Covers the auth half of the post-split userSlice. Volatile preset
 * (no persistence policy) — just reducer correctness and security
 * invariants (clearUserAuth must null the access token).
 */

import { configureStore } from "@reduxjs/toolkit";
import userAuthReducer, {
  setUserAuth,
  setAccessToken,
  setTokenExpiry,
  setAuthReady,
  clearUserAuth,
  type UserAuthState,
} from "../userAuthSlice";

function makeStore(preload?: UserAuthState) {
  return configureStore({
    reducer: { userAuth: userAuthReducer },
    preloadedState: preload ? { userAuth: preload } : undefined,
  });
}

describe("userAuthSlice", () => {
  it("starts with the documented initial state", () => {
    const store = makeStore();
    const s = store.getState().userAuth;
    expect(s.id).toBeNull();
    expect(s.email).toBeNull();
    expect(s.accessToken).toBeNull();
    expect(s.tokenExpiresAt).toBeNull();
    expect(s.isAdmin).toBe(false);
    expect(s.authReady).toBe(false);
    expect(s.appMetadata).toEqual({ provider: null, providers: [] });
    expect(s.identities).toEqual([]);
  });

  it("setUserAuth merges fields and marks authReady=true", () => {
    const store = makeStore();
    store.dispatch(
      setUserAuth({ id: "u1", email: "a@b.com", isAdmin: true }),
    );
    const s = store.getState().userAuth;
    expect(s.id).toBe("u1");
    expect(s.email).toBe("a@b.com");
    expect(s.isAdmin).toBe(true);
    expect(s.authReady).toBe(true);
  });

  it("setUserAuth preserves untouched fields", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1", email: "a@b.com" }));
    store.dispatch(setUserAuth({ phone: "+15555555555" }));
    const s = store.getState().userAuth;
    expect(s.id).toBe("u1");
    expect(s.email).toBe("a@b.com");
    expect(s.phone).toBe("+15555555555");
  });

  it("setAccessToken updates only the token", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1" }));
    store.dispatch(setAccessToken("token-abc"));
    const s = store.getState().userAuth;
    expect(s.accessToken).toBe("token-abc");
    expect(s.id).toBe("u1");
  });

  it("setTokenExpiry stores a unix timestamp", () => {
    const store = makeStore();
    store.dispatch(setTokenExpiry(1_700_000_000));
    expect(store.getState().userAuth.tokenExpiresAt).toBe(1_700_000_000);
    store.dispatch(setTokenExpiry(null));
    expect(store.getState().userAuth.tokenExpiresAt).toBeNull();
  });

  it("setAuthReady toggles the flag without touching other fields", () => {
    const store = makeStore();
    store.dispatch(setUserAuth({ id: "u1" })); // sets authReady=true
    store.dispatch(setAuthReady(false));
    const s = store.getState().userAuth;
    expect(s.authReady).toBe(false);
    expect(s.id).toBe("u1");
  });

  it("clearUserAuth resets ALL fields including accessToken (security invariant)", () => {
    const store = makeStore();
    store.dispatch(
      setUserAuth({
        id: "u1",
        email: "a@b.com",
        isAdmin: true,
        accessToken: "secret-token",
      }),
    );
    store.dispatch(setTokenExpiry(1_700_000_000));
    expect(store.getState().userAuth.accessToken).toBe("secret-token");

    store.dispatch(clearUserAuth());
    const s = store.getState().userAuth;
    expect(s.accessToken).toBeNull();
    expect(s.tokenExpiresAt).toBeNull();
    expect(s.id).toBeNull();
    expect(s.email).toBeNull();
    expect(s.isAdmin).toBe(false);
    expect(s.authReady).toBe(false);
  });
});
