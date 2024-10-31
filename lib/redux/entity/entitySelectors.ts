// lib/redux/tables/selectors.ts

import {RootState} from "@/lib/redux/store";
import {createSelector} from "@reduxjs/toolkit";
import {EntityKeys} from "@/types/entityTypes";
import {EntitySliceState} from "@/lib/redux/entity/entitySliceCreator";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {

    const getEntityState = (state: RootState): EntitySliceState<TEntity> => {
        return state.entities[entityKey] as EntitySliceState<TEntity>;
    };

    const getData = createSelector([getEntityState], (state) => {
        return state?.data;
    });

    const getLoading = createSelector([getEntityState], (state) => {
        return state?.loading;
    });

    const getError = createSelector([getEntityState], (state) => {
        return state?.error;
    });

    const getInitialized = createSelector([getEntityState], (state) => {
        return state.initialized;
    });

    const getTotalCount = createSelector([getEntityState], (state) => {
        return state.totalCount;
    });

    const getAllPkAndDisplayFields = createSelector([getEntityState], (state) => {
        return state.allPkAndDisplayFields;
    });

    const getLastFetched = createSelector([getEntityState], (state) => {
        return state.lastFetched;
    });

    const getStaleTime = createSelector([getEntityState], (state) => {
        return state.staleTime;
    });

    const getBackups = createSelector([getEntityState], (state) => {
        return state.backups;
    });

    const getSelectedItem = createSelector([getEntityState], (state) => {
        return state.selectedItem;
    });

    const getPage = createSelector([getEntityState], (state) => {
        return state.page;
    });

    const getPageSize = createSelector([getEntityState], (state) => {
        return state.pageSize;
    });

    const getMaxCount = createSelector([getEntityState], (state) => {
        return state.maxCount;
    });

    const getSchema = createSelector([getEntityState], (state) => {
        return state.entitySchema;
    });

    const getOneDataItem = (index: number) =>
        createSelector([getData], (data) => {
            return data[index];
        });

    const getOneBackup = (backupKey: string) =>
        createSelector([getBackups], (backups) => {
            return backups[backupKey];
        });

    const getOnePkAndDisplayField = (index: number) =>
        createSelector([getAllPkAndDisplayFields], (fields) => {
            return fields[index];
        });

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
