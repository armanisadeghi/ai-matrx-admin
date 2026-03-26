'use client';

// injectEntityReducers — Dynamically adds entity slices and globalCache to the
// running store via replaceReducer(). Called once by useEntitySystem() when
// a route needs entity data. Subsequent calls are no-ops.
//
// Works with BOTH the main store (authenticated routes) and the lite store
// (public routes). Tries main store first, falls back to lite store.

import { combineReducers, Reducer } from '@reduxjs/toolkit';
import { initializeEntitySlices, entitySliceRegistry } from './entitySlice';
import { createGlobalCacheSlice } from '@/lib/redux/schema/globalCacheSlice';
import { fieldReducer } from '@/lib/redux/concepts/fields/fieldSlice';
import { createLiteRootReducer } from '@/lib/redux/liteRootReducer';
import { getLiteStore } from '@/lib/redux/liteStore';
import { getStore } from '@/lib/redux/store';
import { createRootReducer } from '@/lib/redux/rootReducer';
import type { InitialReduxState } from '@/types/reduxTypes';
import type { UnifiedSchemaCache, AutomationEntities } from '@/types/entityTypes';

const LOUD_STYLE = 'color: red; font-size: 14px; font-weight: bold; background: #fff3f3; padding: 2px 6px; border: 2px solid red;';

let injected = false;

/**
 * Injects entity reducers into the running store (main or lite).
 *
 * Main store: Rebuilds the full root reducer with real entity data via createRootReducer.
 * Lite store: Extends the lite reducer with entity slices via combineReducers.
 *
 * Safe to call multiple times — only injects once.
 */
export function injectEntityReducers(schema: UnifiedSchemaCache): boolean {
    if (injected) return false;

    const mainStore = getStore();
    const liteStore = getLiteStore();
    const store = mainStore ?? liteStore;
    const storeType = mainStore ? 'MainStore' : 'LiteStore';

    if (!store) {
        console.error('[injectEntityReducers] No store initialized (neither main nor lite)');
        return false;
    }

    try {
        if (mainStore) {
            // Main store path: rebuild the full root reducer with real schema
            const fakeInitialState = {
                globalCache: schema,
            } as InitialReduxState;

            const newRootReducer = createRootReducer(fakeInitialState);
            mainStore.replaceReducer(newRootReducer as never);
        } else {
            // Lite store path: extend lite reducer with entity slices
            initializeEntitySlices(schema.schema as AutomationEntities);

            const entityReducers: Record<string, Reducer> = {};
            for (const [key, slice] of entitySliceRegistry.entries()) {
                entityReducers[key] = slice.reducer;
            }

            const globalCacheSlice = createGlobalCacheSlice(schema);
            const liteReducer = createLiteRootReducer();
            const currentState = liteStore!.getState();
            const liteKeys = Object.keys(currentState) as (keyof typeof currentState)[];

            const newRootReducer = combineReducers({
                ...Object.fromEntries(
                    liteKeys.map((key) => [
                        key,
                        (state: unknown, action: unknown) => {
                            const fullState = { [key]: state } as Record<string, unknown>;
                            const result = liteReducer(fullState as never, action as never);
                            return (result as Record<string, unknown>)[key];
                        },
                    ])
                ),
                entities: combineReducers(entityReducers),
                globalCache: globalCacheSlice.reducer,
                entityFields: fieldReducer,
            });

            liteStore!.replaceReducer(newRootReducer as never);
        }

        injected = true;
        const entityCount = entitySliceRegistry.size;
        console.log(
            '\n\n%c ================================================ ',
            LOUD_STYLE
        );
        console.log(
            `%c  [injectEntityReducers] ENTITY SYSTEM INJECTED  `,
            LOUD_STYLE
        );
        console.log(
            `%c  Store: ${storeType} | ${entityCount} entity slices`,
            LOUD_STYLE
        );
        console.log(
            `%c  + globalCache + entityFields via replaceReducer()`,
            LOUD_STYLE
        );
        console.log(
            '%c ================================================ \n\n',
            LOUD_STYLE
        );
        return true;
    } catch (err) {
        console.error('[injectEntityReducers] Failed:', err);
        return false;
    }
}

export function isEntitySystemInjected(): boolean {
    return injected;
}
