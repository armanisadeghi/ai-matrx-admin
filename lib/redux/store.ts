// File: lib/redux/store.ts
"use client";

import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
// Phase 1 of entity-isolation migration: store.ts uses the entity-aware
// saga for back-compat. Phase 4 flips this to `createSlimRootSaga` from
// `./sagas/rootSaga`.
import { createRootSaga } from "@/lib/redux/sagas/entity-rootSaga";
// Phase 1 of entity-isolation migration: store.ts still uses the entity-aware
// reducer for back-compat. Phase 4 flips this to `createSlimRootReducer` from
// `./rootReducer` so the slim chunk no longer pulls in `lib/redux/entity/**`
// or `utils/schema/initial*Schemas`. See plan in
// `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.
import { createRootReducer } from "@/lib/redux/entity-rootReducer";
import { loggerMiddleware } from "@/utils/logger";
// Phase 11: legacy `storageMiddleware` removed. Cloud-files state is
// driven by `cloudFilesRealtimeMiddleware` (imported below).
import { enableMapSet } from "immer";
import { entitySagaMiddleware } from "./entity/entitySagaMiddleware";
import { socketMiddleware } from "./socket-io/connection/socketMiddleware";
import { autoSaveMiddleware } from "@/features/notes/redux/autoSaveMiddleware";
import { codeFilesAutoSaveMiddleware } from "@/features/code-files/redux/autoSaveMiddleware";
import { cloudFilesRealtimeMiddleware } from "@/features/files/redux/realtime-middleware";
import { createSyncMiddleware } from "@/lib/sync/engine/middleware";
import { openSyncChannel, type SyncChannel } from "@/lib/sync/channel";
import { deriveIdentity } from "@/lib/sync/identity";
import { syncPolicies } from "@/lib/sync/registry";
import type { IdentityKey } from "@/lib/sync/types";
import { mapUserData, type UserData } from "@/utils/userDataMapper";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import {
  initializeUserPreferencesState,
  UserPreferences,
  UserPreferencesState,
} from "@/lib/redux/slices/userPreferencesSlice";
import type { UserAuthState } from "@/lib/redux/slices/userAuthSlice";
import type { UserProfileState } from "@/lib/redux/slices/userProfileSlice";
import { setStoreSingleton } from "./store-singleton";

/**
 * Phase 4: split a flat `UserData` (the wire shape from `mapUserData` and
 * SSR layouts) into the two new slices' preloaded states. Keeps server
 * layouts oblivious to the slice split — they keep passing
 * `initialReduxState.user = mapUserData(...)` and the store does the
 * domain partitioning here.
 */
function splitUserData(user: UserData): {
  userAuth: UserAuthState;
  userProfile: UserProfileState;
} {
  return {
    userAuth: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailConfirmedAt: user.emailConfirmedAt,
      lastSignInAt: user.lastSignInAt,
      appMetadata: user.appMetadata,
      identities: user.identities,
      isAdmin: user.isAdmin,
      accessToken: user.accessToken,
      tokenExpiresAt: null, // not on UserData wire shape
      // Mark authReady=true if we have an id OR if this is an explicit guest
      // seed (server layout always populates this — UserData is never partial).
      // Guests get authReady=true from `usePublicAuthSync` after fingerprint.
      authReady: user.id !== null,
    },
    userProfile: {
      userMetadata: user.userMetadata,
      fingerprintId: null, // not on UserData wire shape; populated by usePublicAuthSync
      shellDataLoaded: false,
    },
  };
}
const sagaMiddleware = createSagaMiddleware();

/**
 * Starts an additional saga on the running store's saga middleware.
 * Used by injectEntityReducers to start entity sagas after on-demand injection.
 */
export function runSaga<T>(saga: () => Generator): void {
  sagaMiddleware.run(saga as () => any);
}

/**
 * Sync engine context attached to the store as `_sync`. Consumed by
 * `StoreProvider` to drive `bootSync` without double-opening the channel.
 *
 * `identity` stays live (updated on every swap) so passive readers — like
 * the demo panel — get the current value. `getIdentity()` is the same read
 * wrapped as a function, required by the middleware/scheduler internals
 * that hold a stable reference across renders.
 */
export interface StoreSyncContext {
  channel: SyncChannel;
  identity: IdentityKey;
  /** Live identity getter. Use this over `identity` when holding a reference across swaps. */
  getIdentity: () => IdentityKey;
  /** Runtime identity swap (auth flip). Phase 4 wires a reactive listener. */
  setIdentity: (next: IdentityKey) => void;
}

function resolveUserPreferencesForBootstrap(
  input: Partial<InitialReduxState> & LiteInitialReduxState,
  base: InitialReduxState,
): UserPreferencesState {
  if (input.userPreferences === undefined) {
    return base.userPreferences as UserPreferencesState;
  }
  const raw = input.userPreferences as Record<string, unknown>;
  if (raw && typeof raw === "object" && "_meta" in raw) {
    return input.userPreferences as unknown as UserPreferencesState;
  }
  return initializeUserPreferencesState(
    input.userPreferences as Partial<UserPreferences>,
    true,
  );
}

/**
 * Builds a complete InitialReduxState for store creation from optional / partial
 * bootstrap data (public routes, tests). Server layouts should pass full state.
 *
 * Phase 4: returns a state shape with `userAuth` + `userProfile` keys instead
 * of the legacy `user` key — split happens here so server layouts can keep
 * passing the flat `UserData` wire shape via `initialReduxState.user`.
 */
export function resolveStoreBootstrapState(
  input?: Partial<InitialReduxState> & LiteInitialReduxState,
): InitialReduxState & Record<string, unknown> {
  const baseUser = mapUserData(null, undefined, false);
  const baseSplit = splitUserData(baseUser);
  const base: InitialReduxState = {
    user: baseUser,
    testRoutes: [] as string[],
    userPreferences: initializeUserPreferencesState(
      defaultUserPreferences,
      true,
    ),
    globalCache: getEmptyGlobalCache(),
  };

  if (!input) {
    const out = {
      ...base,
      userAuth: baseSplit.userAuth,
      userProfile: baseSplit.userProfile,
    } as InitialReduxState & Record<string, unknown>;
    return out;
  }

  const mergedUser =
    input.user !== undefined
      ? ({ ...baseUser, ...input.user } as UserData)
      : baseUser;
  const split = splitUserData(mergedUser);

  const merged: InitialReduxState = {
    user: mergedUser,
    testRoutes: input.testRoutes ?? base.testRoutes,
    userPreferences: resolveUserPreferencesForBootstrap(input, base),
    globalCache:
      input.globalCache !== undefined
        ? (input.globalCache as InitialReduxState["globalCache"])
        : base.globalCache,
  };

  const out = {
    ...merged,
    userAuth: split.userAuth,
    userProfile: split.userProfile,
  } as InitialReduxState & Record<string, unknown>;

  if (input.contextMenuCache !== undefined) {
    out.contextMenuCache = input.contextMenuCache;
  }
  if (input.agentContextMenuCache !== undefined) {
    out.agentContextMenuCache = input.agentContextMenuCache;
  }
  if (input.modelRegistry !== undefined) {
    out.modelRegistry = input.modelRegistry;
  }
  if (input.sms !== undefined) {
    out.sms = input.sms;
  }

  return out;
}

export const makeStore = (
  initialState?: Partial<InitialReduxState> & LiteInitialReduxState,
) => {
  const resolved = resolveStoreBootstrapState(initialState);

  if (!resolved.globalCache?.schema) {
    throw new Error("Schema must be provided to create store");
  }

  const rootReducer = createRootReducer(resolved as InitialReduxState);

  // --- Sync engine wiring (PR 1.B) -----------------------------------------
  // Identity + channel are created here so the middleware closure owns them.
  // StoreProvider calls `bootSync` post-construction, passing the same channel
  // back via `openChannel` override so nothing is double-opened.
  // `_sync` is attached to the returned store and consumed by StoreProvider.
  // Phase 4: read user id from the post-split `userAuth` slice instead of the
  // legacy `user` slot. The legacy field is preserved on the bootstrap state
  // for back-compat with non-redux readers but is no longer authoritative.
  const initialBootUserId =
    (resolved.userAuth as { id?: string | null } | undefined)?.id ?? null;
  const initialIdentity: IdentityKey = deriveIdentity({
    userId: initialBootUserId,
  });
  let currentIdentity: IdentityKey = initialIdentity;
  const syncChannel: SyncChannel = openSyncChannel(initialIdentity);
  const syncMiddleware = createSyncMiddleware({
    policies: syncPolicies,
    channel: syncChannel,
    getIdentity: () => currentIdentity,
  });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: resolved as unknown as Parameters<
      typeof configureStore
    >[0]["preloadedState"],
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
        actionCreatorCheck: false,
      }).concat(
        sagaMiddleware,
        loggerMiddleware,
        socketMiddleware,
        syncMiddleware,
        entitySagaMiddleware,
        autoSaveMiddleware,
        codeFilesAutoSaveMiddleware,
        // notesRealtimeMiddleware — re-enable when workspace converges to Redux
        cloudFilesRealtimeMiddleware,
      ),
    devTools: process.env.NODE_ENV !== "production",
  });

  const syncContext: StoreSyncContext = {
    channel: syncChannel,
    identity: initialIdentity,
    getIdentity: () => currentIdentity,
    setIdentity: (next: IdentityKey) => {
      currentIdentity = next;
      syncChannel.setIdentity(next);
      // Keep the public `.identity` snapshot in lockstep with the closure so
      // passive readers (demo UI, dev console) don't observe a stale key.
      syncContext.identity = next;
    },
  };
  // Attach sync context so StoreProvider can call bootSync with the same
  // channel + identity getter/setter that the middleware closed over.
  const storeWithSync = Object.assign(store, { _sync: syncContext });

  const rootSagaInstance = createRootSaga(
    resolved.globalCache.entityNames ?? [],
  );
  sagaMiddleware.run(rootSagaInstance);

  // Keep reference for utility access via the leaf-module singleton.
  setStoreSingleton(storeWithSync);

  return storeWithSync;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action
>;

// Re-export `getStore` from the leaf singleton module so existing callers
// (`features/**/*`, `utils/auth/getUserId`, `lib/redux/entity/injectEntityReducers`)
// don't break during the entity-isolation migration. New code should import
// from `./store-singleton` directly to avoid pulling in this file's
// reducer/middleware graph.
export { getStoreSingleton as getStore } from "./store-singleton";

enableMapSet();
