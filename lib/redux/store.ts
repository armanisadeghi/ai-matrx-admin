// File: lib/redux/store.ts
"use client";

import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { createRootSaga } from "@/lib/redux/sagas/rootSaga";
import { createRootReducer } from "@/lib/redux/rootReducer";
import { loggerMiddleware } from "@/utils/logger";
// Phase 11: legacy `storageMiddleware` removed. Cloud-files state is
// driven by `cloudFilesRealtimeMiddleware` (imported below).
import { enableMapSet } from "immer";
import { entitySagaMiddleware } from "./entity/entitySagaMiddleware";
import { socketMiddleware } from "./socket-io/connection/socketMiddleware";
import { autoSaveMiddleware } from "@/features/notes/redux/autoSaveMiddleware";
import { codeFilesAutoSaveMiddleware } from "@/features/code-files/redux/autoSaveMiddleware";
import { cloudFilesRealtimeMiddleware } from "@/features/files/redux/realtime-middleware";
import {
  createSyncMiddleware,
  openSyncChannel,
  deriveIdentity,
  syncPolicies,
  type SyncChannel,
} from "@/lib/sync";
import type { IdentityKey } from "@/lib/sync";
import { mapUserData } from "@/utils/userDataMapper";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import {
  initializeUserPreferencesState,
  UserPreferences,
  UserPreferencesState,
} from "@/lib/redux/slices/userPreferencesSlice";
const sagaMiddleware = createSagaMiddleware();

// Store reference for utility access
let storeInstance: AppStore | null = null;

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
 */
export function resolveStoreBootstrapState(
  input?: Partial<InitialReduxState> & LiteInitialReduxState,
): InitialReduxState & Record<string, unknown> {
  const base: InitialReduxState = {
    user: mapUserData(null, undefined, false),
    testRoutes: [] as string[],
    userPreferences: initializeUserPreferencesState(
      defaultUserPreferences,
      true,
    ),
    globalCache: getEmptyGlobalCache(),
  };

  if (!input) {
    return base as InitialReduxState & Record<string, unknown>;
  }

  const merged: InitialReduxState = {
    user:
      input.user !== undefined ? { ...base.user, ...input.user } : base.user,
    testRoutes: input.testRoutes ?? base.testRoutes,
    userPreferences: resolveUserPreferencesForBootstrap(input, base),
    globalCache:
      input.globalCache !== undefined
        ? (input.globalCache as InitialReduxState["globalCache"])
        : base.globalCache,
  };

  const out = merged as InitialReduxState & Record<string, unknown>;

  if (input.contextMenuCache !== undefined) {
    merged.contextMenuCache = input.contextMenuCache;
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
  const initialBootUserId =
    (resolved.user as { id?: string | null } | undefined)?.id ?? null;
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

  // Keep reference for utility access
  storeInstance = storeWithSync;

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

// Getter for utilities to access store
export const getStore = (): AppStore | null => storeInstance;

enableMapSet();
