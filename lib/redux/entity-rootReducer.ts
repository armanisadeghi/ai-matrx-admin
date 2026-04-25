// lib/redux/entity-rootReducer.ts
"use client";

// Entity-aware root reducer — used by `makeEntityStore()` for routes under
// `app/(legacy)/legacy/*` that depend on the deprecated entity system.
//
// Composes `slimReducerMap` (from ./rootReducer.ts) with the entity-only
// keys: `entities`, `entityFields`, `globalCache`, `entitySystem`. The slim
// store does NOT use this file — by design, entity imports are quarantined
// here so webpack/Turbopack can keep them out of the slim chunk graph.
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

import { combineReducers, Reducer } from "@reduxjs/toolkit";
import { slimReducerMap } from "./rootReducer";
import { createGlobalCacheSlice } from "@/lib/redux/schema/globalCacheSlice";
import {
  entitySliceRegistry,
  initializeEntitySlices,
} from "./entity/entitySlice";
import { fieldReducer } from "@/lib/redux/concepts/fields/fieldSlice";
import entitySystemReducer from "./slices/entitySystemSlice";
import type { EntityReduxState } from "@/types/reduxTypes";
import type { UnifiedSchemaCache } from "@/types/entityTypes";

export const createEntityRootReducer = (initialState: EntityReduxState) => {
  const entityNames = initialState.globalCache?.entityNames ?? [];
  const hasEntities = entityNames.length > 0;

  if (hasEntities) {
    console.warn(
      "[WARNING REDUX STARTED WITH LARGE INITIAL STATE] --- WARNING... ENTITIES MUST BE LAZY LOADED",
    );
  }

  initializeEntitySlices(initialState.globalCache.schema);
  const entityReducers = Object.fromEntries(
    Array.from(entitySliceRegistry.entries()).map(([key, slice]) => [
      key,
      slice.reducer,
    ]),
  );

  const globalCacheSlice = createGlobalCacheSlice(
    initialState.globalCache as UnifiedSchemaCache,
  );

  const entitiesReducer =
    Object.keys(entityReducers).length > 0
      ? combineReducers(entityReducers)
      : (((state: Record<string, unknown> = {}) => state) as Reducer);

  return combineReducers({
    ...slimReducerMap,
    entities: entitiesReducer,
    entityFields: fieldReducer,
    globalCache: globalCacheSlice.reducer,
    entitySystem: entitySystemReducer,
  });
};

/**
 * @deprecated Migration alias. Use `createEntityRootReducer` directly. The
 * old name `createRootReducer` is preserved during the entity-isolation
 * migration so that the slim `lib/redux/store.ts` can be flipped to
 * `createSlimRootReducer` in Phase 4 without an intermediate rename pass.
 * Removed in Phase 5.
 */
export const createRootReducer = createEntityRootReducer;
