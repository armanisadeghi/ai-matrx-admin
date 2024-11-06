/*
// lib/redux/entity/selectors.ts
import { RootState } from "@/lib/redux/store";
import { createSelector } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntitySliceState } from "@/lib/redux/entity/entitySliceCreator";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
  // Create the base selector for the specific entity
  const selectEntity = (state: RootState): EntitySliceState<TEntity> => {
    // Access the entity state through the 'applets' namespace
    return state.entities[entityKey] as EntitySliceState<TEntity>;
  };

  // Create memoized selectors for each piece of state
  return {
    selectData: createSelector(
      [selectEntity],
      (entity) => entity.data
    ),

    selectLoading: createSelector(
      [selectEntity],
      (entity) => entity.loading
    ),

    selectError: createSelector(
      [selectEntity],
      (entity) => entity.error
    ),

    selectInitialized: createSelector(
      [selectEntity],
      (entity) => entity.initialized
    ),

    selectTotalCount: createSelector(
      [selectEntity],
      (entity) => entity.totalCount
    ),

    selectAllPkAndDisplayFields: createSelector(
      [selectEntity],
      (entity) => entity.allPkAndDisplayFields
    ),

    selectLastFetched: createSelector(
      [selectEntity],
      (entity) => entity.lastFetched
    ),

    selectStaleTime: createSelector(
      [selectEntity],
      (entity) => entity.staleTime
    ),

    selectStale: createSelector(
      [selectEntity],
      (entity) => entity.stale
    ),

    selectBackups: createSelector(
      [selectEntity],
      (entity) => entity.backups
    ),

    selectSelectedItem: createSelector(
      [selectEntity],
      (entity) => entity.selectedItem
    ),

    selectPage: createSelector(
      [selectEntity],
      (entity) => entity.page
    ),

    selectPageSize: createSelector(
      [selectEntity],
      (entity) => entity.pageSize
    ),

    selectMaxCount: createSelector(
      [selectEntity],
      (entity) => entity.maxCount
    ),

    selectSchema: createSelector(
      [selectEntity],
      (entity) => entity.entitySchema
    ),

    // Parameterized selectors
    selectDataItem: (index: number) =>
      createSelector(
        [selectEntity],
        (entity) => entity.data[index]
      ),

    selectBackup: (backupKey: string) =>
      createSelector(
        [selectEntity],
        (entity) => entity.backups[backupKey]
      ),

    selectPkAndDisplayField: (index: number) =>
      createSelector(
        [selectEntity],
        (entity) => entity.allPkAndDisplayFields[index]
      )
  };
};

export type EntitySelectors<TEntity extends EntityKeys> = ReturnType<typeof createEntitySelectors<TEntity>>;
*/
