/**
 * userProfileSlice.test.ts — Phase 4 PR 4.B
 *
 * Covers the profile half of the post-split userSlice plus the
 * `userProfilePolicy` boot-critical persistence contract.
 *
 * Critical invariants:
 *   - `partialize: ["userMetadata"]` — fingerprintId and shellDataLoaded
 *     MUST NOT appear in serialized output (identity-domain + transient).
 *   - REHYDRATE merges userMetadata only; fingerprintId / shellDataLoaded
 *     never restored from persisted state.
 *   - `deserialize` accepts a malformed body and returns safe defaults
 *     instead of throwing (graceful-degradation invariant).
 */

import { configureStore } from "@reduxjs/toolkit";
import userProfileReducer, {
  setUserMetadata,
  setUserProfile,
  setFingerprintId,
  setShellDataLoaded,
  clearUserProfile,
  userProfilePolicy,
  type UserProfileState,
} from "../userProfileSlice";
import {
  REHYDRATE_ACTION_TYPE,
  type RehydrateAction,
} from "@/lib/sync/engine/rehydrate";

function makeStore(preload?: UserProfileState) {
  return configureStore({
    reducer: { userProfile: userProfileReducer },
    preloadedState: preload ? { userProfile: preload } : undefined,
  });
}

const sampleMetadata = {
  avatarUrl: "https://example.com/a.png",
  fullName: "Alice Anderson",
  name: "Alice",
  preferredUsername: "alice",
  picture: "https://example.com/p.png",
};

describe("userProfileSlice", () => {
  it("starts with the documented initial state", () => {
    const s = makeStore().getState().userProfile;
    expect(s.userMetadata).toEqual({
      avatarUrl: null,
      fullName: null,
      name: null,
      preferredUsername: null,
      picture: null,
    });
    expect(s.fingerprintId).toBeNull();
    expect(s.shellDataLoaded).toBe(false);
  });

  it("setUserMetadata merges fields", () => {
    const store = makeStore();
    store.dispatch(setUserMetadata({ name: "Alice", picture: "p.png" }));
    const s = store.getState().userProfile.userMetadata;
    expect(s.name).toBe("Alice");
    expect(s.picture).toBe("p.png");
    expect(s.avatarUrl).toBeNull(); // untouched
  });

  it("setUserProfile fans out across all profile fields", () => {
    const store = makeStore();
    store.dispatch(
      setUserProfile({
        userMetadata: { name: "Alice" },
        fingerprintId: "fp-123",
        shellDataLoaded: true,
      }),
    );
    const s = store.getState().userProfile;
    expect(s.userMetadata.name).toBe("Alice");
    expect(s.fingerprintId).toBe("fp-123");
    expect(s.shellDataLoaded).toBe(true);
  });

  it("setFingerprintId / setShellDataLoaded are independent", () => {
    const store = makeStore();
    store.dispatch(setFingerprintId("fp-1"));
    expect(store.getState().userProfile.fingerprintId).toBe("fp-1");
    store.dispatch(setShellDataLoaded(true));
    expect(store.getState().userProfile.shellDataLoaded).toBe(true);
  });

  it("clearUserProfile resets to initial", () => {
    const store = makeStore();
    store.dispatch(setUserMetadata({ name: "Alice" }));
    store.dispatch(setFingerprintId("fp-1"));
    store.dispatch(setShellDataLoaded(true));

    store.dispatch(clearUserProfile());
    const s = store.getState().userProfile;
    expect(s.userMetadata.name).toBeNull();
    expect(s.fingerprintId).toBeNull();
    expect(s.shellDataLoaded).toBe(false);
  });
});

describe("userProfileSlice REHYDRATE handler", () => {
  it("merges userMetadata from a persisted body", () => {
    const store = makeStore();
    const action: RehydrateAction = {
      type: REHYDRATE_ACTION_TYPE,
      payload: {
        sliceName: "userProfile",
        state: { userMetadata: sampleMetadata },
        source: "localStorage",
      },
    };
    store.dispatch(action);
    expect(store.getState().userProfile.userMetadata).toEqual(sampleMetadata);
  });

  it("ignores REHYDRATE actions for other slices", () => {
    const store = makeStore();
    const action: RehydrateAction = {
      type: REHYDRATE_ACTION_TYPE,
      payload: {
        sliceName: "theme",
        state: { mode: "dark" },
        source: "localStorage",
      },
    };
    store.dispatch(action);
    expect(store.getState().userProfile.userMetadata.name).toBeNull();
  });

  it("does NOT restore fingerprintId from REHYDRATE (identity-domain)", () => {
    const store = makeStore();
    // Even if a malicious or stale body included fingerprintId, it is not
    // restored — the policy partialize excludes it.
    const action: RehydrateAction = {
      type: REHYDRATE_ACTION_TYPE,
      payload: {
        sliceName: "userProfile",
        state: {
          userMetadata: sampleMetadata,
          fingerprintId: "stale-fp",
        } as Partial<UserProfileState>,
        source: "localStorage",
      },
    };
    store.dispatch(action);
    expect(store.getState().userProfile.fingerprintId).toBeNull();
  });

  it("does NOT restore shellDataLoaded from REHYDRATE (transient)", () => {
    const store = makeStore();
    const action: RehydrateAction = {
      type: REHYDRATE_ACTION_TYPE,
      payload: {
        sliceName: "userProfile",
        state: {
          userMetadata: sampleMetadata,
          shellDataLoaded: true,
        } as Partial<UserProfileState>,
        source: "localStorage",
      },
    };
    store.dispatch(action);
    expect(store.getState().userProfile.shellDataLoaded).toBe(false);
  });
});

describe("userProfilePolicy", () => {
  // The frozen policy stores user-supplied config under .config; runtime
  // helpers (storageKey, broadcastActions Set) are flattened to top-level.
  // See lib/sync/policies/define.ts for the shape.
  const cfg = userProfilePolicy.config;

  it("partialize includes only userMetadata", () => {
    expect(cfg.partialize).toEqual(["userMetadata"]);
    expect(cfg.partialize).not.toContain("fingerprintId");
    expect(cfg.partialize).not.toContain("shellDataLoaded");
  });

  it("storageKey is the documented matrx:userProfile", () => {
    expect(userProfilePolicy.storageKey).toBe("matrx:userProfile");
  });

  it("uses the boot-critical preset", () => {
    expect(cfg.preset).toBe("boot-critical");
  });

  it("broadcasts the slice's actions across tabs", () => {
    expect(userProfilePolicy.broadcastActions.has("userProfile/setUserMetadata")).toBe(
      true,
    );
    expect(userProfilePolicy.broadcastActions.has("userProfile/setUserProfile")).toBe(
      true,
    );
    expect(userProfilePolicy.broadcastActions.has("userProfile/clearUserProfile")).toBe(
      true,
    );
  });

  it("serialize returns ONLY userMetadata (not fingerprintId/shellDataLoaded)", () => {
    const fullState: UserProfileState = {
      userMetadata: sampleMetadata,
      fingerprintId: "fp-must-not-leak",
      shellDataLoaded: true,
    };
    const out = cfg.serialize?.(fullState);
    expect(out).toEqual({ userMetadata: sampleMetadata });
    expect(out).not.toHaveProperty("fingerprintId");
    expect(out).not.toHaveProperty("shellDataLoaded");
  });

  it("deserialize returns a valid shape from well-formed input", () => {
    const out = cfg.deserialize?.({
      userMetadata: sampleMetadata,
    });
    expect(out).toEqual({ userMetadata: sampleMetadata });
  });

  it("deserialize falls back to defaults for malformed input (no throw)", () => {
    const out1 = cfg.deserialize?.(null);
    const out2 = cfg.deserialize?.("garbage");
    const out3 = cfg.deserialize?.({ userMetadata: null });
    const expected = {
      userMetadata: {
        avatarUrl: null,
        fullName: null,
        name: null,
        preferredUsername: null,
        picture: null,
      },
    };
    expect(out1).toEqual(expected);
    expect(out2).toEqual(expected);
    expect(out3).toEqual(expected);
  });

  it("deserialize coerces non-string fields to null (graceful degradation)", () => {
    const out = cfg.deserialize?.({
      userMetadata: {
        avatarUrl: 123, // wrong type
        fullName: null,
        name: "Alice",
        preferredUsername: undefined,
        picture: { not: "a string" },
      },
    });
    expect(out).toEqual({
      userMetadata: {
        avatarUrl: null,
        fullName: null,
        name: "Alice",
        preferredUsername: null,
        picture: null,
      },
    });
  });
});
