
// middleware/shadowSync.ts

import { AppDispatch } from "@/lib/redux";
import { EntityKeys } from "@/types";
import { Action, MiddlewareAPI } from "@reduxjs/toolkit";


export const createShadowSyncMiddleware = (entityKey: EntityKeys) => {
    return (store: MiddlewareAPI) => (next: AppDispatch) => (action: Action) => {
      const result = next(action);
      
      // If the entity state changed, sync the shadow
      if (action.type.startsWith(`ENTITIES/${entityKey.toUpperCase()}`)) {
        const entityState = store.getState().entities[entityKey];
        store.dispatch(shadowSlices[entityKey].actions.syncWithEntity(entityState));
      }
      
      return result;
    };
  };