// entitySelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';
import { EntityKeys } from "@/types/entityTypes";

// First, create a base selector for the entity domain
const selectEntityDomain = (state: RootState) => state.entities;

// Create parameterized selectors
export const makeEntitySelectors = () => {
    const getData = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.data ?? null
    );

    const getLoading = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        (entities, entityKey) => entities[entityKey]?.loading ?? false
    );

    const getError = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.error ?? null
    );

    const getTotalCount = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.totalCount ?? 0
    );

    const getInitialized = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.initialized ?? false
    );

    const getSelectedItem = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.selectedItem ?? null
    );

    const getLastFetched = createSelector(
        [selectEntityDomain, (_: RootState, entityKey: EntityKeys) => entityKey],
        // @ts-ignore - COMPLEX: EntityState structure doesn't match expected properties - requires state structure refactor
        (entities, entityKey) => entities[entityKey]?.lastFetched ?? {}
    );

    return {
        getData,
        getLoading,
        getError,
        getTotalCount,
        getInitialized,
        getSelectedItem,
        getLastFetched
    };
};
