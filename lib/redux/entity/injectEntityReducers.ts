"use client";

// injectEntityReducers — Dynamically adds entity slices and globalCache to the
// running store via replaceReducer(). Called once by useEntitySystem() when
// a route needs entity data. Subsequent calls are no-ops.

import { getStore } from "@/lib/redux/store";
import { createRootReducer } from "@/lib/redux/rootReducer";
import { entitySliceRegistry } from "./entitySlice";
import type { InitialReduxState } from "@/types/reduxTypes";
import type { UnifiedSchemaCache } from "@/types/entityTypes";

const LOUD_STYLE =
  "color: red; font-size: 14px; font-weight: bold; background: #fff3f3; padding: 2px 6px; border: 2px solid red;";

let injected = false;

/**
 * Rebuilds the root reducer with real entity schema via createRootReducer.
 * Safe to call multiple times — only injects once.
 */
export function injectEntityReducers(schema: UnifiedSchemaCache): boolean {
  if (injected) return false;

  const store = getStore();

  if (!store) {
    console.error("[injectEntityReducers] No Redux store initialized");
    return false;
  }

  try {
    const fakeInitialState = {
      globalCache: schema,
    } as unknown as InitialReduxState;

    const newRootReducer = createRootReducer(fakeInitialState);
    store.replaceReducer(newRootReducer as never);

    injected = true;
    const entityCount = entitySliceRegistry.size;
    console.log(
      "\n\n%c ================================================ ",
      LOUD_STYLE,
    );
    console.log(
      `%c  [injectEntityReducers] ENTITY SYSTEM INJECTED  `,
      LOUD_STYLE,
    );
    console.log(
      `%c  Store: main | ${entityCount} entity slices`,
      LOUD_STYLE,
    );
    console.log(
      `%c  + globalCache + entityFields via replaceReducer()`,
      LOUD_STYLE,
    );
    console.log(
      "%c ================================================ \n\n",
      LOUD_STYLE,
    );
    return true;
  } catch (err) {
    console.error("[injectEntityReducers] Failed:", err);
    return false;
  }
}

export function isEntitySystemInjected(): boolean {
  return injected;
}
