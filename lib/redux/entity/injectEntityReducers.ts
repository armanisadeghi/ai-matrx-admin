'use client';

// injectEntityReducers — Dynamically adds entity slices and globalCache to the
// running LiteStore via replaceReducer(). Called once by useEntitySystem() when
// a route needs entity data. Subsequent calls are no-ops.

import { combineReducers, Reducer } from '@reduxjs/toolkit';
import { initializeEntitySlices, entitySliceRegistry } from './entitySlice';
import { createGlobalCacheSlice } from '@/lib/redux/schema/globalCacheSlice';
import { fieldReducer } from '@/lib/redux/concepts/fields/fieldSlice';
import { createLiteRootReducer } from '@/lib/redux/liteRootReducer';
import { getLiteStore } from '@/lib/redux/liteStore';
import type { UnifiedSchemaCache, AutomationEntities } from '@/types/entityTypes';

let injected = false;

/**
 * Injects entity reducers into the running LiteStore.
 * Uses store.replaceReducer() to add:
 * - entities: ~134 dynamic entity slices
 * - globalCache: Schema lookup tables
 * - entityFields: Field metadata
 *
 * Safe to call multiple times — only injects once.
 */
export function injectEntityReducers(schema: UnifiedSchemaCache): boolean {
    if (injected) return false;

    const store = getLiteStore();
    if (!store) {
        console.error('[injectEntityReducers] LiteStore not initialized');
        return false;
    }

    try {
        // 1. Initialize all entity slices from the schema
        initializeEntitySlices(schema.schema as AutomationEntities);

        // 2. Build entity reducers from the registry
        const entityReducers: Record<string, Reducer> = {};
        for (const [key, slice] of entitySliceRegistry.entries()) {
            entityReducers[key] = slice.reducer;
        }

        // 3. Create the globalCache slice with schema data
        const globalCacheSlice = createGlobalCacheSlice(schema);

        // 4. Get the current lite root reducer and merge
        const liteReducer = createLiteRootReducer();

        // Extract individual reducers from the lite combined reducer
        // We need to rebuild with entity additions
        const currentState = store.getState();
        const liteKeys = Object.keys(currentState) as (keyof typeof currentState)[];

        // Build the new reducer by combining lite + entity reducers
        // We use the lite reducer for all existing keys, then add entity-specific ones
        const newRootReducer = combineReducers({
            // Spread a proxy that delegates to the lite reducer for each key
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
            // Entity system additions
            entities: combineReducers(entityReducers),
            globalCache: globalCacheSlice.reducer,
            entityFields: fieldReducer,
        });

        // 5. Replace the store's reducer
        store.replaceReducer(newRootReducer as never);

        injected = true;
        console.debug('[injectEntityReducers] Entity system injected successfully');
        return true;
    } catch (err) {
        console.error('[injectEntityReducers] Failed:', err);
        return false;
    }
}

export function isEntitySystemInjected(): boolean {
    return injected;
}
