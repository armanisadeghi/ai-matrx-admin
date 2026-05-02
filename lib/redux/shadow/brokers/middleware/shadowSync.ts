// middleware/shadowSync.ts

import type { AppDispatch } from "@/lib/redux/store";
import { EntityKeys } from "@/types/entityTypes";
import { Action, MiddlewareAPI } from "@reduxjs/toolkit";

/**
 * Placeholder registry for shadow slices — not yet implemented.
 * Will be replaced by a proper registry pattern when shadow slices land.
 */
declare const shadowSlices: Record<
  EntityKeys,
  { actions: { syncWithEntity: (state: unknown) => Action } }
>;

export const createShadowSyncMiddleware = (entityKey: EntityKeys) => {
  return (store: MiddlewareAPI) => (next: AppDispatch) => (action: Action) => {
    const result = next(action);

    // If the entity state changed, sync the shadow
    if (action.type.startsWith(`ENTITIES/${entityKey.toUpperCase()}`)) {
      const entityState = store.getState().entities[entityKey];
      store.dispatch(
        shadowSlices[entityKey].actions.syncWithEntity(entityState),
      );
    }

    return result;
  };
};
