// lib/redux/tables/selectors.ts

import { RootState } from "@/lib/redux/store";
import { createSelector } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntitySliceState } from "@/lib/redux/entity/entitySliceCreator";
import { useAppSelector } from "@/lib/redux/hooks";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const getEntityState = (state: RootState): EntitySliceState<TEntity> =>
        state[entityKey] as EntitySliceState<TEntity>;

    // Base selectors
    const getData = createSelector([getEntityState], (state) => state?.data);
    const getBackups = createSelector([getEntityState], (state) => state.backups);
    const getAllPkAndDisplayFields = createSelector([getEntityState], (state) => state.allPkAndDisplayFields);

    // Remaining selectors (non-dynamic)
    const getLoading = createSelector([getEntityState], (state) => state?.loading);
    const getError = createSelector([getEntityState], (state) => state?.error);
    const getInitialized = createSelector([getEntityState], (state) => state.initialized);
    const getTotalCount = createSelector([getEntityState], (state) => state.totalCount);
    const getLastFetched = createSelector([getEntityState], (state) => state.lastFetched);
    const getStaleTime = createSelector([getEntityState], (state) => state.staleTime);
    const getSelectedItem = createSelector([getEntityState], (state) => state.selectedItem);
    const getPage = createSelector([getEntityState], (state) => state.page);
    const getPageSize = createSelector([getEntityState], (state) => state.pageSize);
    const getMaxCount = createSelector([getEntityState], (state) => state.maxCount);
    const getSchema = createSelector([getEntityState], (state) => state.entitySchema);

    // Factory functions for parameterized selectors
    const createGetOneDataItem = (index: number) =>
        createSelector([getData], (data) => data[index]);

    const createGetOneBackup = (backupKey: string) =>
        createSelector([getBackups], (backups) => backups[backupKey]);

    const createGetOnePkAndDisplayField = (index: number) =>
        createSelector([getAllPkAndDisplayFields], (fields) => fields[index]);

    return {
        getEntityState,
        getData,
        getLoading,
        getError,
        getInitialized,
        getTotalCount,
        getAllPkAndDisplayFields,
        getLastFetched,
        getStaleTime,
        getBackups,
        getSelectedItem,
        getPage,
        getPageSize,
        getMaxCount,
        getSchema,
        // Expose parameterized selector factories
        createGetOneDataItem,
        createGetOneBackup,
        createGetOnePkAndDisplayField,
    };
};

// Custom hooks for parameterized selectors using `useAppSelector`
export const useGetOneDataItem = (entityKey: EntityKeys, index: number) => {
    const selectors = createEntitySelectors(entityKey);
    return useAppSelector(selectors.createGetOneDataItem(index));
};

export const useGetOneBackup = (entityKey: EntityKeys, backupKey: string) => {
    const selectors = createEntitySelectors(entityKey);
    return useAppSelector(selectors.createGetOneBackup(backupKey));
};

export const useGetOnePkAndDisplayField = (entityKey: EntityKeys, index: number) => {
    const selectors = createEntitySelectors(entityKey);
    return useAppSelector(selectors.createGetOnePkAndDisplayField(index));
};

export type EntitySelectors<TEntity extends EntityKeys> = ReturnType<typeof createEntitySelectors<TEntity>>;
