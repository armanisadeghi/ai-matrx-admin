// lib/redux/tables/selectors.ts

import { RootState } from "@/lib/redux/store";
import {createSelector} from "@reduxjs/toolkit";
import {EntityKeys} from "@/types/entityTypes";
import {EntitySliceState} from "@/lib/redux/entity/entitySliceCreator";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const getEntityState = (state: RootState): EntitySliceState<TEntity> => state[entityKey] as EntitySliceState<TEntity>;

    const getInitialized = createSelector([getEntityState], (state) => state.initialized);
    const getData = createSelector([getEntityState], (state) => state.data);
    const getTotalCount = createSelector([getEntityState], (state) => state.totalCount);
    const getAllPkAndDisplayFields = createSelector([getEntityState], (state) => state.allPkAndDisplayFields);
    const getLoading = createSelector([getEntityState], (state) => state.loading);
    const getError = createSelector([getEntityState], (state) => state.error);
    const getLastFetched = createSelector([getEntityState], (state) => state.lastFetched);
    const getStaleTime = createSelector([getEntityState], (state) => state.staleTime);
    const getBackups = createSelector([getEntityState], (state) => state.backups);
    const getSelectedItem = createSelector([getEntityState], (state) => state.selectedItem);

    // Pagination-related selectors
    const getPage = createSelector([getEntityState], (state) => state.page);
    const getPageSize = createSelector([getEntityState], (state) => state.pageSize);
    const getMaxCount = createSelector([getEntityState], (state) => state.maxCount);

    // Selector to get the schema
    const getSchema = createSelector([getEntityState], (state) => state.entitySchema);

    // Helper selectors to access specific parts of the data, backups, or pk/display fields
    const getOneDataItem = (index: number) =>
        createSelector([getData], (data) => data[index]);

    const getOneBackup = (backupKey: string) =>
        createSelector([getBackups], (backups) => backups[backupKey]);

    const getOnePkAndDisplayField = (index: number) =>
        createSelector([getAllPkAndDisplayFields], (fields) => fields[index]);

    return {
        getEntityState,
        getInitialized,
        getData,
        getTotalCount,
        getAllPkAndDisplayFields,
        getLoading,
        getError,
        getLastFetched,
        getStaleTime,
        getBackups,
        getSelectedItem,
        getPage,
        getPageSize,
        getMaxCount,
        getSchema,
        getOneDataItem,
        getOneBackup,
        getOnePkAndDisplayField,
    };
};

export type EntitySelectors<TEntity extends EntityKeys> = ReturnType<typeof createEntitySelectors<TEntity>>;
