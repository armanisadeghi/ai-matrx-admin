// File: lib/redux/store.ts
"use client";

import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { createRootSaga } from "@/lib/redux/sagas/rootSaga";
import { createRootReducer } from "@/lib/redux/rootReducer";
import { loggerMiddleware } from "@/utils/logger";
import { storageMiddleware } from "./storage/storageMiddleware";
import { enableMapSet } from "immer";
import { entitySagaMiddleware } from "./entity/entitySagaMiddleware";
import { socketMiddleware } from "./socket-io/connection/socketMiddleware";
import { notesRealtimeMiddleware } from "@/features/notes/redux/realtimeMiddleware";
import { mapUserData } from "@/utils/userDataMapper";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import {
  initializeUserPreferencesState,
  UserPreferences,
  UserPreferencesState,
} from "@/lib/redux/slices/userPreferencesSlice";
import { TestDirectory } from "@/utils/directoryStructure";

const sagaMiddleware = createSagaMiddleware();

// Store reference for utility access
let storeInstance: AppStore | null = null;

function resolveUserPreferencesForBootstrap(
  input: Partial<InitialReduxState> & LiteInitialReduxState,
  base: InitialReduxState,
): UserPreferencesState {
  if (input.userPreferences === undefined) {
    return base.userPreferences as UserPreferencesState;
  }
  const raw = input.userPreferences as Record<string, unknown>;
  if (raw && typeof raw === "object" && "_meta" in raw) {
    return input.userPreferences as UserPreferencesState;
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
    testRoutes: [] as TestDirectory[],
    userPreferences: initializeUserPreferencesState(
      defaultUserPreferences,
      true,
    ),
    globalCache: getEmptyGlobalCache(),
  };

  if (!input) {
    return base;
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

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: resolved as InitialReduxState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
        actionCreatorCheck: false,
      }).concat(
        sagaMiddleware,
        loggerMiddleware,
        socketMiddleware,
        storageMiddleware,
        entitySagaMiddleware,
        notesRealtimeMiddleware,
      ),
    devTools: process.env.NODE_ENV !== "production",
  });

  const rootSagaInstance = createRootSaga(
    resolved.globalCache.entityNames ?? [],
  );
  sagaMiddleware.run(rootSagaInstance);

  // Keep reference for utility access
  storeInstance = store;

  return store;
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
